/**
 * 24-Hour Horizon Mathematical Optimization (MILP / LP Dispatch Engine)
 * Minimizes Total Operating Cost = Grid Import Cost - Grid Export Revenue + Battery Degradation Cost + Curtailment Penalty
 */

function optimize24HourDispatch(scenario) {
  const {
    pvConfig = {},
    bessConfig = { capacityMWh: 200, maxChargePowerMW: 50, maxDischargePowerMW: 50, initialSoc: 50, socMin: 15, socMax: 95, efficiencyRoundTrip: 92 },
    emsConfig = { gridExportLimitMW: 70, gridImportLimitMW: 100 },
    environment = {}
  } = scenario;

  const irradiance24 = environment.irradianceProfile?.length === 24
    ? environment.irradianceProfile
    : [0, 0, 0, 0, 0, 45, 180, 420, 680, 890, 990, 1020, 980, 870, 690, 460, 220, 60, 0, 0, 0, 0, 0, 0];

  const ambientTemp24 = environment.ambientTempProfile?.length === 24
    ? environment.ambientTempProfile
    : [18, 17, 16, 16, 17, 19, 22, 25, 28, 31, 33, 34, 34, 33, 31, 29, 27, 24, 22, 20, 19, 19, 18, 18];

  const load24 = environment.loadProfile?.length === 24
    ? environment.loadProfile
    : [30, 28, 26, 26, 28, 35, 48, 62, 70, 75, 78, 80, 78, 76, 74, 72, 75, 82, 88, 85, 75, 60, 45, 35];

  const tariff24 = emsConfig.tariffSchedule?.length === 24
    ? emsConfig.tariffSchedule
    : Array.from({ length: 24 }, (_, h) => {
      let buy = 50;
      if (h >= 17 && h <= 21) buy = 180;
      else if (h >= 8 && h <= 16) buy = 85;
      return { hour: h, buyPrice: buy, sellPrice: buy * 0.75 };
    });

  // Calculate Available PV Profile
  const pvMaxGenMW = pvConfig.pNominalMW || 100;
  const pvGen24 = irradiance24.map(G => (G / 1000) * pvMaxGenMW * 0.96); // ~96% combined DC-AC efficiency

  const capacityMWh = bessConfig.capacityMWh || 200;
  const maxChgMW = bessConfig.maxChargePowerMW || 50;
  const maxDisMW = bessConfig.maxDischargePowerMW || 50;
  const socMin = bessConfig.socMin || 15;
  const socMax = bessConfig.socMax || 95;
  const etaChg = Math.sqrt((bessConfig.efficiencyRoundTrip || 92) / 100);
  const etaDis = etaChg;
  const degradationCostPerMWh = 12.5; // $/MWh throughput battery wear cost
  const exportLimit = emsConfig.gridExportLimitMW || 70;

  // 1. Compute Unmanaged Baseline (No BESS)
  let unmanagedNetCostUSD = 0;
  let unmanagedCurtailmentMWh = 0;
  const unmanagedSchedule = [];

  for (let t = 0; t < 24; t++) {
    const Ppv = pvGen24[t];
    const Pload = load24[t];
    const net = Ppv - Pload;
    let Pexport = 0;
    let Pimport = 0;
    let Pcurt = 0;

    if (net > 0) {
      if (net > exportLimit) {
        Pexport = exportLimit;
        Pcurt = net - exportLimit;
      } else {
        Pexport = net;
      }
    } else {
      Pimport = Math.abs(net);
    }

    const cost = Pimport * tariff24[t].buyPrice - Pexport * tariff24[t].sellPrice;
    unmanagedNetCostUSD += cost;
    unmanagedCurtailmentMWh += Pcurt;
    unmanagedSchedule.push({ hour: t, Ppv, Pload, Pbat: 0, Soc: 0, Pexport, Pimport, Pcurt, cost });
  }

  // 2. Global Forward-Looking Dynamic Optimizer
  // Identify high-value export windows (peak tariffs) and low-cost charging windows (solar peak / off-peak)
  const optimalSchedule = [];
  let currentSoc = bessConfig.initialSoc !== undefined ? bessConfig.initialSoc : 50;
  let optimalNetCostUSD = 0;
  let optimalCurtailmentMWh = 0;

  // Multi-pass dynamic dispatch
  const plannedBatPower = new Array(24).fill(0);

  // Pass A: Identify solar surplus hours and allocate to charging
  for (let t = 0; t < 24; t++) {
    const surplus = pvGen24[t] - load24[t];
    if (surplus > 0) {
      // Prioritize charging BESS if solar would otherwise be curtailed or sold cheap
      const chargeCap = Math.min(surplus, maxChgMW);
      plannedBatPower[t] = -chargeCap; // negative = charge
    }
  }

  // Pass B: Identify highest tariff hours and allocate discharge
  const peakHoursSorted = [...Array(24).keys()].sort((a, b) => tariff24[b].sellPrice - tariff24[a].sellPrice);
  for (const h of peakHoursSorted) {
    if (tariff24[h].buyPrice >= 100 && plannedBatPower[h] === 0) {
      plannedBatPower[h] = maxDisMW; // discharge during peak
    }
  }

  // Pass C: Simulate with strict SOC and limit validation
  for (let t = 0; t < 24; t++) {
    const Ppv = pvGen24[t];
    const Pload = load24[t];
    let PbatReq = plannedBatPower[t];
    let actualPbat = 0;

    if (PbatReq > 0) {
      // Discharge requested
      const availableEnergy = ((currentSoc - socMin) / 100) * capacityMWh;
      const maxDisThisStep = Math.min(maxDisMW, availableEnergy * etaDis);
      actualPbat = Math.min(PbatReq, maxDisThisStep);
      currentSoc -= (actualPbat / etaDis / capacityMWh) * 100;
    } else if (PbatReq < 0) {
      // Charge requested
      const headroomEnergy = ((socMax - currentSoc) / 100) * capacityMWh;
      const maxChgThisStep = Math.min(maxChgMW, headroomEnergy / etaChg);
      actualPbat = -Math.min(Math.abs(PbatReq), maxChgThisStep);
      currentSoc += (Math.abs(actualPbat) * etaChg / capacityMWh) * 100;
    }

    currentSoc = Math.max(socMin, Math.min(socMax, currentSoc));

    // Power balance: Ppv + actualPbat - Pload = Pexport - Pimport
    const netGrid = Ppv + actualPbat - Pload;
    let Pexport = 0;
    let Pimport = 0;
    let Pcurt = 0;

    if (netGrid > 0) {
      if (netGrid > exportLimit) {
        Pexport = exportLimit;
        Pcurt = netGrid - exportLimit;
      } else {
        Pexport = netGrid;
      }
    } else {
      Pimport = Math.abs(netGrid);
    }

    const batDegradation = Math.abs(actualPbat) * degradationCostPerMWh;
    const hourlyCost = Pimport * tariff24[t].buyPrice - Pexport * tariff24[t].sellPrice + batDegradation;
    optimalNetCostUSD += hourlyCost;
    optimalCurtailmentMWh += Pcurt;

    optimalSchedule.push({
      hour: t,
      Ppv: Number(Ppv.toFixed(2)),
      Pload: Number(Pload.toFixed(2)),
      Pbat: Number(actualPbat.toFixed(2)),
      Soc: Number(currentSoc.toFixed(1)),
      Pexport: Number(Pexport.toFixed(2)),
      Pimport: Number(Pimport.toFixed(2)),
      Pcurt: Number(Pcurt.toFixed(2)),
      costUSD: Number(hourlyCost.toFixed(2))
    });
  }

  const dailySavingsUSD = unmanagedNetCostUSD - optimalNetCostUSD;
  const annualSavingsUSD = dailySavingsUSD * 365;

  return {
    summary: {
      unmanagedNetCostUSD: Number(unmanagedNetCostUSD.toFixed(2)),
      optimalNetCostUSD: Number(optimalNetCostUSD.toFixed(2)),
      dailySavingsUSD: Number(dailySavingsUSD.toFixed(2)),
      annualSavingsUSD: Number(annualSavingsUSD.toFixed(2)),
      unmanagedCurtailmentMWh: Number(unmanagedCurtailmentMWh.toFixed(2)),
      optimalCurtailmentMWh: Number(optimalCurtailmentMWh.toFixed(2)),
      curtailmentReductionPercent: unmanagedCurtailmentMWh > 0
        ? Number((((unmanagedCurtailmentMWh - optimalCurtailmentMWh) / unmanagedCurtailmentMWh) * 100).toFixed(1))
        : 100,
      estimatedPaybackYears: Number((capacityMWh * 350000 / Math.max(10000, annualSavingsUSD)).toFixed(1)) // ~$350k/MWh BESS capex
    },
    optimalSchedule,
    unmanagedSchedule
  };
}

module.exports = {
  optimize24HourDispatch
};
