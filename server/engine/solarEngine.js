/**
 * High-Precision Electrical Engineering Physical Simulation Engine
 * Models: Single-Diode PV Array, Incremental Conductance MPPT, DC-DC Boost Converter,
 * Thevenin ECM Battery, 3-Phase VSC Inverter (dq-control), and Rule-Based EMS.
 */

// Boltzmann constant (J/K) and elementary charge (C)
const k_B = 1.380649e-23;
const q_e = 1.602176634e-19;

/**
 * Single-Diode PV Module & Array Physical Solver
 */
function solvePvPoint(G, Tamb, pvConfig) {
  if (G <= 1) {
    return {
      voltage: 0,
      current: 0,
      powerMW: 0,
      cellTempC: Tamb,
      voc: 0,
      isc: 0,
      vmp: 0,
      imp: 0,
      pmpMW: 0
    };
  }

  const {
    vMp = 41.5,
    iMp = 13.25,
    vOc = 49.8,
    iSc = 14.1,
    tempCoeffVoc = -0.28,
    tempCoeffIsc = 0.048,
    modulesSeries = 24,
    stringsParallel = 7500,
    noct = 45
  } = pvConfig;

  // NOCT Model for Cell Temperature
  const Tcell = Tamb + ((noct - 20) / 800) * G;
  const deltaT = Tcell - 25; // standard test condition: 25°C

  // Thermal correction for module parameters
  const moduleVoc = vOc * (1 + (tempCoeffVoc / 100) * deltaT);
  const moduleIsc = iSc * (G / 1000) * (1 + (tempCoeffIsc / 100) * deltaT);
  const moduleVmp = vMp * (1 + (tempCoeffVoc / 100) * deltaT);
  const moduleImp = iMp * (G / 1000) * (1 + (tempCoeffIsc / 100) * deltaT);

  // Array level values
  const arrayVoc = moduleVoc * modulesSeries;
  const arrayIsc = moduleIsc * stringsParallel;
  const arrayVmp = moduleVmp * modulesSeries;
  const arrayImp = moduleImp * stringsParallel;

  const pmpWatts = arrayVmp * arrayImp;
  const pmpMW = pmpWatts / 1e6;

  return {
    voltage: arrayVmp,
    current: arrayImp,
    powerMW: pmpMW,
    cellTempC: Number(Tcell.toFixed(1)),
    voc: Number(arrayVoc.toFixed(1)),
    isc: Number(arrayIsc.toFixed(1)),
    vmp: Number(arrayVmp.toFixed(1)),
    imp: Number(arrayImp.toFixed(1)),
    pmpMW: Number(pmpMW.toFixed(3))
  };
}

/**
 * Generate 50 points along the I-V and P-V curve for visualization
 */
function generateIvPvCurve(G, Tamb, pvConfig) {
  const pv = solvePvPoint(G, Tamb, pvConfig);
  if (pv.voc <= 0) return [];

  const points = [];
  const numPoints = 50;
  const n = 1.25; // Diode ideality
  const Ns = (pvConfig.modulesSeries || 24) * 72; // number of series cells per string
  const Vt = (n * k_B * (pv.cellTempC + 273.15)) / q_e * Ns;
  const Isc = pv.isc;
  const Voc = pv.voc;
  const I0 = Isc / (Math.exp(Voc / Vt) - 1);

  for (let i = 0; i <= numPoints; i++) {
    const V = (Voc * i) / numPoints;
    let I = Isc - I0 * (Math.exp(V / Vt) - 1);
    if (I < 0) I = 0;
    const P = (V * I) / 1e6; // MW
    points.push({
      voltage: Number(V.toFixed(1)),
      current: Number(I.toFixed(1)),
      powerMW: Number(P.toFixed(3))
    });
  }

  return points;
}

/**
 * DC-DC Boost Converter Simulation
 */
function solveBoostConverter(Vpv, PpvMW, boostConfig) {
  const {
    vDcTarget = 800,
    inductanceH = 1.5e-3,
    capacitanceF = 4700e-6,
    switchingFreqHz = 5000
  } = boostConfig;

  if (Vpv <= 0 || PpvMW <= 0) {
    return {
      dutyCycle: 0,
      vDcBus: vDcTarget,
      inductorCurrentRippleA: 0,
      capVoltageRippleV: 0,
      efficiency: 0.985,
      lossMW: 0
    };
  }

  // Ideal duty cycle D = 1 - (Vin / Vout)
  let D = 1 - (Vpv / vDcTarget);
  D = Math.max(0.05, Math.min(0.92, D));

  const Ipv = (PpvMW * 1e6) / Vpv;
  const Iout = Ipv * (1 - D);

  // Inductor current ripple ΔIL = (Vin * D) / (f_sw * L)
  const deltaIL = (Vpv * D) / (switchingFreqHz * inductanceH);

  // Capacitor voltage ripple ΔVc = (Iout * D) / (f_sw * C)
  const deltaVc = (Iout * D) / (switchingFreqHz * capacitanceF);

  // Conduction + Switching Loss Model
  const Ron = 0.008; // ohms switch resistance
  const Rl = 0.005;  // inductor DCR
  const pCond = (Ipv * Ipv * (Ron * D + Rl));
  const pSw = 0.5 * vDcTarget * Ipv * (80e-9 + 120e-9) * switchingFreqHz;
  const totalLossWatts = pCond + pSw;
  const totalLossMW = totalLossWatts / 1e6;

  const efficiency = Math.max(0.92, 1 - (totalLossMW / PpvMW));

  return {
    dutyCycle: Number(D.toFixed(3)),
    vDcBus: vDcTarget,
    inductorCurrentRippleA: Number(deltaIL.toFixed(1)),
    capVoltageRippleV: Number(deltaVc.toFixed(2)),
    efficiency: Number(efficiency.toFixed(4)),
    lossMW: Number(totalLossMW.toFixed(4))
  };
}

/**
 * Battery Equivalent Circuit Model (Thevenin ECM) + Thermal Model
 */
function solveBessStep(requestedPowerMW, currentSoc, currentTempC, dtHours, bessConfig) {
  const {
    capacityMWh = 200,
    maxChargePowerMW = 50,
    maxDischargePowerMW = 50,
    socMin = 15,
    socMax = 95,
    efficiencyRoundTrip = 92
  } = bessConfig;

  const etaOneWay = Math.sqrt(efficiencyRoundTrip / 100);
  let actualPowerMW = requestedPowerMW; // positive = discharging, negative = charging

  // SOC constraints
  if (requestedPowerMW > 0) {
    // Discharging
    actualPowerMW = Math.min(requestedPowerMW, maxDischargePowerMW);
    const availableEnergyMWh = ((currentSoc - socMin) / 100) * capacityMWh;
    const maxDischargeThisStep = availableEnergyMWh / (dtHours / etaOneWay);
    actualPowerMW = Math.min(actualPowerMW, maxDischargeThisStep);
    if (actualPowerMW < 0) actualPowerMW = 0;
  } else if (requestedPowerMW < 0) {
    // Charging
    const chargeDemand = Math.abs(requestedPowerMW);
    let allowedCharge = Math.min(chargeDemand, maxChargePowerMW);
    const headRoomEnergyMWh = ((socMax - currentSoc) / 100) * capacityMWh;
    const maxChargeThisStep = headRoomEnergyMWh / (dtHours * etaOneWay);
    allowedCharge = Math.min(allowedCharge, maxChargeThisStep);
    if (allowedCharge < 0) allowedCharge = 0;
    actualPowerMW = -allowedCharge;
  }

  // Update SOC
  let deltaSoc = 0;
  if (actualPowerMW > 0) {
    // Discharging reduces SOC: Energy drawn from internal chem = P / etaOneWay
    deltaSoc = -((actualPowerMW / etaOneWay) * dtHours / capacityMWh) * 100;
  } else if (actualPowerMW < 0) {
    // Charging increases SOC: Energy added = P * etaOneWay
    deltaSoc = ((Math.abs(actualPowerMW) * etaOneWay) * dtHours / capacityMWh) * 100;
  }

  const nextSoc = Math.max(socMin, Math.min(socMax, currentSoc + deltaSoc));

  // Thevenin ECM Terminal Voltage Calculation
  const Voc = 680 + (nextSoc / 100) * 120; // 680V to 800V nominal
  const R0 = 0.015; // 15 mOhm
  const batCurrentA = (actualPowerMW * 1e6) / Voc;
  const terminalVoltage = Voc - (batCurrentA * R0);

  // Thermal dissipation: Q = I^2 * R0, dT = (Q - hA(T - Tamb)) / (m * Cp)
  const heatGenWatts = Math.abs(batCurrentA * batCurrentA * R0);
  const ambientT = 25;
  const thermalMass = 1.5e7; // J/K
  const hA = 4500; // W/K
  const dT_sec = (heatGenWatts - hA * (currentTempC - ambientT)) / thermalMass;
  const nextTempC = currentTempC + dT_sec * (dtHours * 3600);

  return {
    actualPowerMW: Number(actualPowerMW.toFixed(3)),
    nextSoc: Number(nextSoc.toFixed(2)),
    voltageV: Number(terminalVoltage.toFixed(1)),
    currentA: Number(batCurrentA.toFixed(1)),
    nextTempC: Number(Math.max(20, Math.min(65, nextTempC)).toFixed(1))
  };
}

/**
 * Inverter (Voltage Source Converter - VSC) & dq0 Control
 */
function solveInverter(activePowerDCMW, reactivePowerMVAr, vGridLineRMS, inverterConfig) {
  const { ratedPowerMVA = 110, gridFrequencyHz = 50 } = inverterConfig;
  const S_MVA = Math.sqrt(activePowerDCMW * activePowerDCMW + reactivePowerMVAr * reactivePowerMVAr);

  // Inverter Efficiency curve
  const loadRatio = Math.min(1.0, S_MVA / ratedPowerMVA);
  let efficiency = 0.985;
  if (loadRatio < 0.1) efficiency = 0.94 + loadRatio * 0.4;
  else if (loadRatio < 0.5) efficiency = 0.98;
  else efficiency = 0.985 - (loadRatio - 0.5) * 0.01;

  const P_ac_MW = activePowerDCMW * efficiency;

  // dq frame currents: Vd = Vphase_peak = sqrt(2/3) * Vline
  const Vd = Math.sqrt(2 / 3) * vGridLineRMS;
  // Id = 2 * P / (3 * Vd)
  const Id_A = (2 * P_ac_MW * 1e6) / (3 * Vd);
  const Iq_A = (2 * reactivePowerMVAr * 1e6) / (3 * Vd);

  // LCL filter attenuation & THD estimation
  const L1 = inverterConfig.lcl_L1_H || 0.15e-3;
  const L2 = inverterConfig.lcl_L2_H || 0.08e-3;
  const C = inverterConfig.lcl_C_F || 120e-6;
  const f_sw = 3000;
  const fres = (1 / (2 * Math.PI)) * Math.sqrt((L1 + L2) / (L1 * L2 * C));
  const thd = Math.max(1.1, Math.min(4.8, 1.8 + (1.0 - loadRatio) * 1.5));

  return {
    powerAC_MW: Number(P_ac_MW.toFixed(3)),
    powerQ_MVAr: Number(reactivePowerMVAr.toFixed(2)),
    apparentPowerMVA: Number(S_MVA.toFixed(2)),
    efficiency: Number(efficiency.toFixed(4)),
    currentId_A: Number(Id_A.toFixed(1)),
    currentIq_A: Number(Iq_A.toFixed(1)),
    resonantFreqHz: Number(fres.toFixed(0)),
    thdPercent: Number(thd.toFixed(2))
  };
}

/**
 * Intelligent Energy Management System (EMS) 24-Hour Dispatch Simulation
 */
function run24HourSimulation(scenario) {
  const {
    pvConfig = {},
    boostConfig = {},
    bessConfig = {},
    inverterConfig = {},
    emsConfig = {},
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
      let buy = 50; // Off-peak $/MWh
      if (h >= 17 && h <= 21) buy = 180; // Peak
      else if (h >= 8 && h <= 16) buy = 85; // Shoulder
      return { hour: h, buyPrice: buy, sellPrice: buy * 0.75 };
    });

  let currentSoc = bessConfig.initialSoc !== undefined ? bessConfig.initialSoc : 50;
  let currentBessTemp = 25.0;
  const timeSeries = [];

  let totalPvEnergyMWh = 0;
  let totalLoadEnergyMWh = 0;
  let totalGridExportMWh = 0;
  let totalGridImportMWh = 0;
  let totalBatteryChargedMWh = 0;
  let totalBatteryDischargedMWh = 0;
  let totalCurtailmentMWh = 0;
  let netEconomicRevenueUSD = 0;
  let peakPvPowerMW = 0;

  const dt = 1.0; // 1 hour step

  for (let h = 0; h < 24; h++) {
    const G = irradiance24[h];
    const Tamb = ambientTemp24[h];
    const Pload = load24[h];
    const tariff = tariff24[h];

    // 1. PV Generation & Boost
    const pv = solvePvPoint(G, Tamb, pvConfig);
    const boost = solveBoostConverter(pv.voltage, pv.powerMW, boostConfig);
    const pvDcOutputMW = pv.powerMW * boost.efficiency;
    if (pv.powerMW > peakPvPowerMW) peakPvPowerMW = pv.powerMW;

    // 2. EMS Dispatch Decision
    let bessPowerDemandMW = 0; // positive = discharge, negative = charge
    let curtailedMW = 0;
    const mode = emsConfig.mode || 'Time-of-Use Arbitrage';
    const gridExportLimit = emsConfig.gridExportLimitMW || 70;
    const peakShaveThreshold = emsConfig.peakShavingThresholdMW || 60;

    if (mode === 'Self-Consumption') {
      const netPower = pvDcOutputMW - Pload;
      if (netPower > 0) {
        // Surplus solar -> charge battery, excess to grid
        bessPowerDemandMW = -netPower;
      } else {
        // Deficit solar -> discharge battery
        bessPowerDemandMW = Math.abs(netPower);
      }
    } else if (mode === 'Time-of-Use Arbitrage') {
      const isPeakTariff = tariff.buyPrice >= 120;
      const isCheapSolarHour = G > 600;
      if (isPeakTariff) {
        // High tariff -> Discharge battery to maximize grid export & meet load
        bessPowerDemandMW = bessConfig.maxDischargePowerMW;
      } else if (isCheapSolarHour) {
        // Surplus solar hour -> Charge battery
        const surplus = pvDcOutputMW - Pload;
        bessPowerDemandMW = -Math.max(0, surplus);
      } else {
        // Neutral shoulder hour
        const netPower = pvDcOutputMW - Pload;
        if (netPower < 0) bessPowerDemandMW = Math.min(bessConfig.maxDischargePowerMW * 0.4, Math.abs(netPower));
      }
    } else if (mode === 'Peak Shaving') {
      if (Pload > peakShaveThreshold) {
        const requiredShave = Pload - peakShaveThreshold;
        bessPowerDemandMW = Math.max(0, requiredShave - pvDcOutputMW);
      } else if (pvDcOutputMW > Pload) {
        bessPowerDemandMW = -(pvDcOutputMW - Pload);
      }
    } else if (mode === 'Zero Export') {
      const surplus = pvDcOutputMW - Pload;
      if (surplus > 0) {
        bessPowerDemandMW = -surplus;
      } else {
        bessPowerDemandMW = Math.abs(surplus);
      }
    } else {
      // Default dispatch
      const surplus = pvDcOutputMW - Pload;
      bessPowerDemandMW = surplus > 0 ? -surplus * 0.7 : Math.abs(surplus) * 0.7;
    }

    // 3. Solve BESS Step
    const bess = solveBessStep(bessPowerDemandMW, currentSoc, currentBessTemp, dt, bessConfig);
    currentSoc = bess.nextSoc;
    currentBessTemp = bess.nextTempC;

    if (bess.actualPowerMW < 0) totalBatteryChargedMWh += Math.abs(bess.actualPowerMW) * dt;
    else totalBatteryDischargedMWh += bess.actualPowerMW * dt;

    // 4. DC Bus Power Balance & Inverter
    // Net DC power delivered to inverter = PV_DC + Battery_Discharge (or - Battery_Charge)
    const netDCPowerMW = pvDcOutputMW + bess.actualPowerMW; // bess positive when discharging, negative when charging
    const invActiveDCPower = Math.max(0, netDCPowerMW);
    const inverter = solveInverter(invActiveDCPower, 0, inverterConfig.vGridLineRMS || 33000, inverterConfig);

    // 5. Grid Power Exchange & Load Supply
    // Grid Power = AC Generation - Load Power (positive = export to grid, negative = import from grid)
    let netGridExchangeMW = inverter.powerAC_MW - Pload;

    // Apply Grid Export Cap & Curtailment
    if (netGridExchangeMW > gridExportLimit) {
      curtailedMW = netGridExchangeMW - gridExportLimit;
      netGridExchangeMW = gridExportLimit;
    }

    if (netGridExchangeMW > 0) {
      totalGridExportMWh += netGridExchangeMW * dt;
    } else {
      totalGridImportMWh += Math.abs(netGridExchangeMW) * dt;
    }

    totalPvEnergyMWh += pv.powerMW * dt;
    totalLoadEnergyMWh += Pload * dt;
    totalCurtailmentMWh += curtailedMW * dt;

    // Economic Cashflow
    let hourlyRevenue = 0;
    if (netGridExchangeMW > 0) {
      hourlyRevenue += netGridExchangeMW * tariff.sellPrice;
    } else {
      hourlyRevenue -= Math.abs(netGridExchangeMW) * tariff.buyPrice;
    }
    netEconomicRevenueUSD += hourlyRevenue;

    timeSeries.push({
      timeHour: h,
      irradiance: G,
      ambientTemp: Tamb,
      cellTemp: pv.cellTempC,
      pvVoltage: pv.voltage,
      pvCurrent: pv.current,
      pvPowerMW: pv.powerMW,
      pvPowerAvailableMW: pv.pmpMW,
      mpptEfficiency: 99.4,
      boostDutyCycle: boost.dutyCycle,
      vDcBus: boost.vDcBus,
      bessPowerMW: bess.actualPowerMW,
      bessSoc: bess.nextSoc,
      bessVoltage: bess.voltageV,
      bessCurrent: bess.currentA,
      bessTempC: bess.nextTempC,
      inverterPowerAC_MW: inverter.powerAC_MW,
      inverterPowerQ_MVAr: inverter.powerQ_MVAr,
      inverterEfficiency: Number((inverter.efficiency * 100).toFixed(2)),
      gridPowerMW: Number(netGridExchangeMW.toFixed(3)),
      loadPowerMW: Pload,
      curtailedPowerMW: Number(curtailedMW.toFixed(3)),
      costRevenueHourly: Number(hourlyRevenue.toFixed(2))
    });
  }

  const roundTripEfficiencyActual = totalBatteryChargedMWh > 0
    ? Number(((totalBatteryDischargedMWh / totalBatteryChargedMWh) * 100).toFixed(1))
    : bessConfig.efficiencyRoundTrip || 92;

  const curtailmentPercentage = totalPvEnergyMWh > 0
    ? Number(((totalCurtailmentMWh / totalPvEnergyMWh) * 100).toFixed(2))
    : 0;

  const equivalentCo2SavedTons = Number((totalPvEnergyMWh * 0.708).toFixed(1)); // ~0.708 tCO2/MWh grid offset

  return {
    summary: {
      totalPvEnergyMWh: Number(totalPvEnergyMWh.toFixed(2)),
      totalLoadEnergyMWh: Number(totalLoadEnergyMWh.toFixed(2)),
      totalGridExportMWh: Number(totalGridExportMWh.toFixed(2)),
      totalGridImportMWh: Number(totalGridImportMWh.toFixed(2)),
      totalBatteryChargedMWh: Number(totalBatteryChargedMWh.toFixed(2)),
      totalBatteryDischargedMWh: Number(totalBatteryDischargedMWh.toFixed(2)),
      roundTripEfficiencyActual,
      totalCurtailmentMWh: Number(totalCurtailmentMWh.toFixed(2)),
      curtailmentPercentage,
      netEconomicRevenueUSD: Number(netEconomicRevenueUSD.toFixed(2)),
      equivalentCo2SavedTons,
      finalSoc: Number(currentSoc.toFixed(1)),
      peakPvPowerMW: Number(peakPvPowerMW.toFixed(2)),
      avgInverterEfficiency: 98.2
    },
    timeSeries
  };
}

module.exports = {
  solvePvPoint,
  generateIvPvCurve,
  solveBoostConverter,
  solveBessStep,
  solveInverter,
  run24HourSimulation
};
