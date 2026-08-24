/**
 * 3-Phase Grid-Connected Inverter (VSC) Model
 * dq0 Synchronous Reference Frame Current Control, SRF-PLL, and LCL Harmonic Filter
 */

export class InverterSimulator {
  constructor(config = {}) {
    this.ratedPowerMVA = config.ratedPowerMVA || 110;
    this.vGridLineRMS = config.vGridLineRMS || 33000;
    this.gridFreqHz = config.gridFrequencyHz || 50;
    this.targetPF = config.targetPowerFactor || 1.0;
    this.lcl_L1 = config.lcl_L1_H || 0.15e-3;
    this.lcl_L2 = config.lcl_L2_H || 0.08e-3;
    this.lcl_C = config.lcl_C_F || 120e-6;

    this.pllAngleRad = 0;
    this.pllLocked = true;
    this.actualFreqHz = this.gridFreqHz;
  }

  updateConfig(config) {
    if (config.ratedPowerMVA) this.ratedPowerMVA = config.ratedPowerMVA;
    if (config.vGridLineRMS) this.vGridLineRMS = config.vGridLineRMS;
    if (config.gridFrequencyHz) this.gridFreqHz = config.gridFrequencyHz;
    if (config.targetPowerFactor) this.targetPF = config.targetPowerFactor;
  }

  /**
   * Run one time step of the Inverter control loop
   * @param {number} activePowerDCMW - Input DC power from DC bus (PV + Battery)
   * @param {number} reactiveDemandMVAr - Requested reactive power (positive = capacitive, negative = inductive)
   * @param {number} gridVoltagePu - Grid voltage in per-unit (nominal = 1.0 pu)
   * @param {number} gridFreqHz - Grid frequency (nominal = 50 Hz)
   */
  step(activePowerDCMW, reactiveDemandMVAr = 0, gridVoltagePu = 1.0, gridFreqHz = 50.0) {
    this.actualFreqHz = gridFreqHz;
    this.pllAngleRad = (this.pllAngleRad + 2 * Math.PI * gridFreqHz * 0.02) % (2 * Math.PI);

    const actualVGridLineRMS = this.vGridLineRMS * gridVoltagePu;
    const S_demand = Math.sqrt(activePowerDCMW * activePowerDCMW + reactiveDemandMVAr * reactiveDemandMVAr);

    // Inverter efficiency curve
    const loadFactor = Math.min(1.0, S_demand / this.ratedPowerMVA);
    let efficiency = 0.986;
    if (loadFactor < 0.1) efficiency = 0.93 + loadFactor * 0.5;
    else if (loadFactor < 0.5) efficiency = 0.982;
    else efficiency = 0.986 - (loadFactor - 0.5) * 0.008;

    const P_ac_MW = activePowerDCMW * efficiency;
    const Q_ac_MVAr = reactiveDemandMVAr;
    const S_ac_MVA = Math.sqrt(P_ac_MW * P_ac_MW + Q_ac_MVAr * Q_ac_MVAr);

    // dq frame transformation
    // Vd = sqrt(2/3) * Vline_rms, Vq = 0 (when PLL is locked)
    const Vd = Math.sqrt(2 / 3) * actualVGridLineRMS;
    const Vq = 0;

    // Id* = 2 * P / (3 * Vd), Iq* = -2 * Q / (3 * Vd)
    const Id_A = (2 * P_ac_MW * 1e6) / (3 * Math.max(10, Vd));
    const Iq_A = -(2 * Q_ac_MVAr * 1e6) / (3 * Math.max(10, Vd));
    const I_mag_A = Math.sqrt(Id_A * Id_A + Iq_A * Iq_A);

    // Power factor and phase angle
    const pfAngleRad = Math.atan2(Q_ac_MVAr, Math.max(0.001, P_ac_MW));
    const calculatedPF = Math.cos(pfAngleRad);

    // LCL Filter Characteristics
    const fres = (1 / (2 * Math.PI)) * Math.sqrt((this.lcl_L1 + this.lcl_L2) / (this.lcl_L1 * this.lcl_L2 * this.lcl_C));
    const thdPercent = Math.max(0.9, Math.min(4.8, 1.4 + (1.0 - loadFactor) * 1.6));

    // Harmonic Spectrum generation (Fundamental, 3rd, 5th, 7th, 11th, 13th harmonics)
    const harmonicSpectrum = [
      { harmonic: 'H1 (50Hz)', frequencyHz: 50, amplitudePercent: 100 },
      { harmonic: 'H3 (150Hz)', frequencyHz: 150, amplitudePercent: Number((0.25 * (1.2 - loadFactor)).toFixed(2)) },
      { harmonic: 'H5 (250Hz)', frequencyHz: 250, amplitudePercent: Number((0.85 * (1.1 - loadFactor * 0.3)).toFixed(2)) },
      { harmonic: 'H7 (350Hz)', frequencyHz: 350, amplitudePercent: Number((0.62 * (1.1 - loadFactor * 0.3)).toFixed(2)) },
      { harmonic: 'H11 (550Hz)', frequencyHz: 550, amplitudePercent: Number((0.35 * (1.0 - loadFactor * 0.2)).toFixed(2)) },
      { harmonic: 'H13 (650Hz)', frequencyHz: 650, amplitudePercent: Number((0.22 * (1.0 - loadFactor * 0.2)).toFixed(2)) },
      { harmonic: 'H_PWM (3kHz)', frequencyHz: 3000, amplitudePercent: Number((0.45 * (this.lcl_L1 * 1000)).toFixed(2)) }
    ];

    // PWM 3-Phase Waveform snapshot
    const waveformPoints = 40;
    const threePhaseWaveforms = [];
    for (let i = 0; i < waveformPoints; i++) {
      const angle = (i / waveformPoints) * 2 * Math.PI;
      threePhaseWaveforms.push({
        angleDeg: Number(((angle * 180) / Math.PI).toFixed(0)),
        phaseA: Number(Math.sin(angle).toFixed(3)),
        phaseB: Number(Math.sin(angle - (2 * Math.PI) / 3).toFixed(3)),
        phaseC: Number(Math.sin(angle + (2 * Math.PI) / 3).toFixed(3)),
        currentA: Number((Math.sin(angle - pfAngleRad) * (I_mag_A / Math.max(1, Id_A || 1))).toFixed(3))
      });
    }

    return {
      activePowerAC_MW: Number(P_ac_MW.toFixed(3)),
      reactivePowerAC_MVAr: Number(Q_ac_MVAr.toFixed(2)),
      apparentPowerMVA: Number(S_ac_MVA.toFixed(2)),
      efficiencyPercent: Number((efficiency * 100).toFixed(2)),
      currentId_A: Number(Id_A.toFixed(1)),
      currentIq_A: Number(Iq_A.toFixed(1)),
      currentMagnitudeA: Number(I_mag_A.toFixed(1)),
      powerFactor: Number(calculatedPF.toFixed(3)),
      pfType: Q_ac_MVAr > 0.05 ? 'Capacitive (Leading)' : Q_ac_MVAr < -0.05 ? 'Inductive (Lagging)' : 'Unity (1.00)',
      modulationIndex: Number(Math.min(0.95, 0.4 + loadFactor * 0.5).toFixed(3)),
      pllLocked: true,
      pllFrequencyHz: Number(this.actualFreqHz.toFixed(2)),
      lclResonantFreqHz: Number(fres.toFixed(0)),
      thdPercent: Number(thdPercent.toFixed(2)),
      harmonicSpectrum,
      threePhaseWaveforms,
      phasorDiagram: {
        voltageAngleDeg: 0,
        currentAngleDeg: Number((-pfAngleRad * (180 / Math.PI)).toFixed(1)),
        voltageMagnitudePu: Number(gridVoltagePu.toFixed(2)),
        currentMagnitudePu: Number(Math.min(1.2, loadFactor).toFixed(2))
      }
    };
  }
}
