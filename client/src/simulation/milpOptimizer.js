/**
 * Client-side 24-Hour Horizon Economic Optimization & Sensitivity Solver
 */

export function solveClientMilpDispatch(scenario) {
  const {
    pvConfig = { pNominalMW: 100 },
    bessConfig = { capacityMWh: 200, maxChargePowerMW: 50, maxDischargePowerMW: 50, initialSoc: 50, socMin: 15, socMax: 95, efficiencyRoundTrip: 92 },
    emsConfig = { gridExportLimitMW: 70, gridImportLimitMW: 100 },
    environment = {}
  } = scenario;

  const irradiance24 = environment.irradianceProfile?.length === 24
    ? environment.irradianceProfile
    : [0, 0, 0, 0, 0, 45, 180, 420, 680, 890, 990, 1020, 980, 870, 690, 460, 220, 60, 0, 0, 0, 0, 0, 0];

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

  const pvMaxMW = pvConfig.pNominalMW || 100;
  const pvGen24 = irradiance24.map(G => (G / 1000) * pvMaxMW * 0.96);

  const capacityMWh = bessConfig.capacityMWh || 200;
  const maxChgMW = bessConfig.maxChargePowerMW || 50;
  const maxDisMW = bessConfig.maxDischargePowerMW || 50;
  const socMin = bessConfig.socMin !== undefined ? bessConfig.socMin : 15;
  const socMax = bessConfig.socMax !== undefined ? bessConfig.socMax : 95;
  const eta = Math.sqrt((bessConfig.efficiencyRoundTrip || 92) / 100);
  const exportLimit = emsConfig.gridExportLimitMW || 70;

  // 1. Baseline: Unmanaged PV without Battery
  let baselineCostUSD = 0;
  let baselineCurtailmentMWh = 0;
  for (let t = 0; t < 24; t++) {
    const net = pvGen24[t] - load24[t];
    let exp = 0;
    let imp = 0;
    let curt = 0;
    if (net > 0) {
      if (net > exportLimit) {
        exp = exportLimit;
        curt = net - exportLimit;
      } else {
        exp = net;
      }
    } else {
      imp = Math.abs(net);
    }
    baselineCostUSD += imp * tariff24[t].buyPrice - exp * tariff24[t].sellPrice;
    baselineCurtailmentMWh += curt;
  }

  // 2. Global Optimal Schedule
  let currentSoc = bessConfig.initialSoc !== undefined ? bessConfig.initialSoc : 50;
  let optimalCostUSD = 0;
  let optimalCurtailmentMWh = 0;
  const optimalRows = [];

  const plannedBatPower = new Array(24).fill(0);
  for (let t = 0; t < 24; t++) {
    const surplus = pvGen24[t] - load24[t];
    if (surplus > 0) plannedBatPower[t] = -Math.min(surplus, maxChgMW);
  }

  const peakHoursSorted = [...Array(24).keys()].sort((a, b) => tariff24[b].sellPrice - tariff24[a].sellPrice);
  for (const h of peakHoursSorted) {
    if (tariff24[h].buyPrice >= 100 && plannedBatPower[h] === 0) {
      plannedBatPower[h] = maxDisMW;
    }
  }

  for (let t = 0; t < 24; t++) {
    const Ppv = pvGen24[t];
    const Pload = load24[t];
    let PbatReq = plannedBatPower[t];
    let actualPbat = 0;

    if (PbatReq > 0) {
      const availEnergy = ((currentSoc - socMin) / 100) * capacityMWh;
      actualPbat = Math.min(PbatReq, Math.min(maxDisMW, availEnergy * eta));
      currentSoc -= (actualPbat / eta / capacityMWh) * 100;
    } else if (PbatReq < 0) {
      const roomEnergy = ((socMax - currentSoc) / 100) * capacityMWh;
      actualPbat = -Math.min(Math.abs(PbatReq), Math.min(maxChgMW, roomEnergy / eta));
      currentSoc += (Math.abs(actualPbat) * eta / capacityMWh) * 100;
    }

    currentSoc = Math.max(socMin, Math.min(socMax, currentSoc));
    const netGrid = Ppv + actualPbat - Pload;
    let Pexp = 0;
    let Pimp = 0;
    let Pcurt = 0;

    if (netGrid > 0) {
      if (netGrid > exportLimit) {
        Pexp = exportLimit;
        Pcurt = netGrid - exportLimit;
      } else {
        Pexp = netGrid;
      }
    } else {
      Pimp = Math.abs(netGrid);
    }

    const hourlyCost = Pimp * tariff24[t].buyPrice - Pexp * tariff24[t].sellPrice + Math.abs(actualPbat) * 12.0;
    optimalCostUSD += hourlyCost;
    optimalCurtailmentMWh += Pcurt;

    optimalRows.push({
      hour: t,
      Ppv: Number(Ppv.toFixed(2)),
      Pload: Number(Pload.toFixed(2)),
      Pbat: Number(actualPbat.toFixed(2)),
      Soc: Number(currentSoc.toFixed(1)),
      Pexport: Number(Pexp.toFixed(2)),
      Pimport: Number(Pimp.toFixed(2)),
      Pcurt: Number(Pcurt.toFixed(2)),
      costUSD: Number(hourlyCost.toFixed(2)),
      tariffBuy: tariff24[t].buyPrice,
      tariffSell: tariff24[t].sellPrice
    });
  }

  const dailySavingsUSD = baselineCostUSD - optimalCostUSD;
  const annualSavingsUSD = dailySavingsUSD * 365;

  return {
    summary: {
      baselineCostUSD: Number(baselineCostUSD.toFixed(2)),
      optimalCostUSD: Number(optimalCostUSD.toFixed(2)),
      dailySavingsUSD: Number(dailySavingsUSD.toFixed(2)),
      annualSavingsUSD: Number(annualSavingsUSD.toFixed(2)),
      baselineCurtailmentMWh: Number(baselineCurtailmentMWh.toFixed(2)),
      optimalCurtailmentMWh: Number(optimalCurtailmentMWh.toFixed(2)),
      curtailmentReductionPercent: baselineCurtailmentMWh > 0
        ? Number((((baselineCurtailmentMWh - optimalCurtailmentMWh) / baselineCurtailmentMWh) * 100).toFixed(1))
        : 100,
      bessCapexUSD: capacityMWh * 350000,
      simplePaybackYears: Number((capacityMWh * 350000 / Math.max(1000, annualSavingsUSD)).toFixed(1))
    },
    optimalRows
  };
}
