/**
 * Battery Energy Storage System (BESS) Physical Model
 * Thevenin Equivalent Circuit Model (ECM), Thermal Dissipation, and Cycle Aging
 */

export class BessSimulator {
  constructor(config = {}) {
    this.capacityMWh = config.capacityMWh || 200;
    this.maxChargePowerMW = config.maxChargePowerMW || 50;
    this.maxDischargePowerMW = config.maxDischargePowerMW || 50;
    this.socMin = config.socMin !== undefined ? config.socMin : 15;
    this.socMax = config.socMax !== undefined ? config.socMax : 95;
    this.efficiencyRoundTrip = config.efficiencyRoundTrip || 92;
    this.cRate = config.cRate || 0.5;
    this.chemistry = config.cellChemistry || 'LFP (Lithium Iron Phosphate)';

    this.soc = config.initialSoc !== undefined ? config.initialSoc : 50;
    this.vRC = 0; // Thevenin transient capacitor voltage
    this.tempC = 25.0; // Battery internal cell temperature
    this.cumulativeThroughputMWh = 0;
  }

  updateConfig(config) {
    if (config.capacityMWh) this.capacityMWh = config.capacityMWh;
    if (config.maxChargePowerMW) this.maxChargePowerMW = config.maxChargePowerMW;
    if (config.maxDischargePowerMW) this.maxDischargePowerMW = config.maxDischargePowerMW;
    if (config.socMin !== undefined) this.socMin = config.socMin;
    if (config.socMax !== undefined) this.socMax = config.socMax;
    if (config.efficiencyRoundTrip) this.efficiencyRoundTrip = config.efficiencyRoundTrip;
    if (config.cellChemistry) this.chemistry = config.cellChemistry;
  }

  reset(initialSoc = 50) {
    this.soc = initialSoc;
    this.vRC = 0;
    this.tempC = 25.0;
    this.cumulativeThroughputMWh = 0;
  }

  /**
   * Non-linear Open Circuit Voltage vs SOC function based on cell chemistry
   */
  getOpenCircuitVoltage(socPercent) {
    const s = Math.max(0, Math.min(100, socPercent)) / 100;
    if (this.chemistry.includes('NMC')) {
      // NMC has steeper OCV curve ~620V to 820V for high-voltage string
      return 620 + 190 * s + 15 * Math.log(Math.max(0.01, s)) - 10 * Math.exp(-25 * s);
    } else {
      // LFP has flat plateau ~720V with steep drop at <10% and steep rise at >90%
      return 690 + 50 * s + 35 * Math.pow(s, 5) - 30 * Math.exp(-30 * s);
    }
  }

  /**
   * Run one time step of the BESS simulation
   * @param {number} requestedPowerMW - Positive = Discharge into DC Bus, Negative = Charge from DC Bus
   * @param {number} dtSeconds - Time step in seconds (e.g. 1s or 3600s)
   * @param {number} vDcBus - Voltage of the DC Link (V)
   */
  step(requestedPowerMW, dtSeconds = 1.0, vDcBus = 800) {
    const dtHours = dtSeconds / 3600;
    const etaOneWay = Math.sqrt(this.efficiencyRoundTrip / 100);
    let actualPowerMW = requestedPowerMW;

    // Check SOC safety bounds
    if (requestedPowerMW > 0) {
      // Discharging
      const maxAllowedPower = Math.min(requestedPowerMW, this.maxDischargePowerMW);
      const availableEnergyMWh = ((this.soc - this.socMin) / 100) * this.capacityMWh;
      const maxDischargeThisStep = availableEnergyMWh / (Math.max(0.0001, dtHours) / etaOneWay);
      actualPowerMW = Math.min(maxAllowedPower, maxDischargeThisStep);
      if (actualPowerMW < 0) actualPowerMW = 0;
    } else if (requestedPowerMW < 0) {
      // Charging
      const chargeDemand = Math.abs(requestedPowerMW);
      const maxAllowedPower = Math.min(chargeDemand, this.maxChargePowerMW);
      const headroomEnergyMWh = ((this.socMax - this.soc) / 100) * this.capacityMWh;
      const maxChargeThisStep = headroomEnergyMWh / (Math.max(0.0001, dtHours) * etaOneWay);
      const allowedCharge = Math.min(maxAllowedPower, maxChargeThisStep);
      actualPowerMW = -Math.max(0, allowedCharge);
    }

    // Update SOC via Coulomb Counting
    let deltaSoc = 0;
    if (actualPowerMW > 0) {
      // Discharging
      deltaSoc = -((actualPowerMW / etaOneWay) * dtHours / this.capacityMWh) * 100;
      this.cumulativeThroughputMWh += actualPowerMW * dtHours;
    } else if (actualPowerMW < 0) {
      // Charging
      deltaSoc = ((Math.abs(actualPowerMW) * etaOneWay) * dtHours / this.capacityMWh) * 100;
      this.cumulativeThroughputMWh += Math.abs(actualPowerMW) * dtHours;
    }

    this.soc = Math.max(this.socMin, Math.min(this.socMax, this.soc + deltaSoc));

    // Thevenin ECM Circuit Parameters
    const Voc = this.getOpenCircuitVoltage(this.soc);
    const R0 = 0.012; // 12 mOhm internal ohmic resistance
    const R1 = 0.018; // 18 mOhm polarization resistance
    const C1 = 2500;  // 2500 F polarization capacitance
    const tauRC = R1 * C1; // 45 seconds time constant

    // Current: I = P / Voc (positive for discharge, negative for charge)
    const batCurrentA = (actualPowerMW * 1e6) / Voc;

    // Transient RC voltage update: dV_RC/dt = -V_RC / (R1*C1) + I / C1
    const dVrc_dt = -this.vRC / tauRC + batCurrentA / C1;
    this.vRC += dVrc_dt * dtSeconds;
    this.vRC = Math.max(-50, Math.min(50, this.vRC)); // clamp

    // Terminal Voltage: V_term = Voc - I*R0 - V_RC
    const terminalVoltage = Voc - (batCurrentA * R0) - this.vRC;

    // Thermal Dissipation: P_heat = I^2 * R0 + I * T * dVoc/dT
    const pHeatWatts = Math.abs(batCurrentA * batCurrentA * (R0 + R1));
    const thermalMass = 1.8e7; // J/K
    const hA_cooling = 4800;   // W/K
    const Tamb = 25.0;
    const dT_dt = (pHeatWatts - hA_cooling * (this.tempC - Tamb)) / thermalMass;
    this.tempC += dT_dt * dtSeconds;
    this.tempC = Math.max(20, Math.min(65, this.tempC));

    // Bidirectional DC-DC Converter Operating Mode
    let converterMode = 'IDLE';
    let converterDutyCycle = 0;
    if (actualPowerMW > 0.05) {
      converterMode = 'BOOST (Discharging to DC Bus)';
      converterDutyCycle = Math.max(0.05, Math.min(0.9, 1 - (terminalVoltage / vDcBus)));
    } else if (actualPowerMW < -0.05) {
      converterMode = 'BUCK (Charging from DC Bus)';
      converterDutyCycle = Math.max(0.05, Math.min(0.9, terminalVoltage / vDcBus));
    }

    return {
      actualPowerMW: Number(actualPowerMW.toFixed(3)),
      soc: Number(this.soc.toFixed(2)),
      terminalVoltageV: Number(terminalVoltage.toFixed(1)),
      openCircuitVoltageV: Number(Voc.toFixed(1)),
      vPolarizationV: Number(this.vRC.toFixed(2)),
      currentA: Number(batCurrentA.toFixed(1)),
      tempC: Number(this.tempC.toFixed(1)),
      converterMode,
      converterDutyCycle: Number(converterDutyCycle.toFixed(3)),
      cRateActual: Number((Math.abs(actualPowerMW) / this.capacityMWh).toFixed(2)),
      cumulativeThroughputMWh: Number(this.cumulativeThroughputMWh.toFixed(2))
    };
  }
}
