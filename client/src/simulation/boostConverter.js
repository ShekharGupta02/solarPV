/**
 * Switched-Mode DC-DC Boost Converter Physical Model
 * Calculates CCM/DCM state, waveforms, ripples, and semiconductor losses
 */

export function calculateBoostState(Vpv, PpvMW, boostConfig) {
  const {
    vDcTarget = 800,
    inductanceH = 1.5e-3,
    capacitanceF = 4700e-6,
    switchingFreqHz = 5000
  } = boostConfig;

  if (Vpv <= 0.1 || PpvMW <= 0.001) {
    return {
      dutyCycle: 0,
      vDcBus: vDcTarget,
      inductorCurrentMeanA: 0,
      inductorCurrentRippleA: 0,
      capVoltageRippleV: 0,
      capVoltageRipplePercent: 0,
      isCCM: true,
      efficiencyPercent: 98.5,
      lossBreakdown: { conductionLossMW: 0, switchingLossMW: 0, inductorLossMW: 0, totalLossMW: 0 },
      waveforms: { timeMicroSec: [], iInductor: [], vSwitch: [], iDiode: [] }
    };
  }

  // Duty Cycle D = 1 - (Vin / Vout)
  let D = 1 - (Vpv / vDcTarget);
  D = Math.max(0.05, Math.min(0.92, D));

  const T_sw = 1 / switchingFreqHz;
  const I_pv = (PpvMW * 1e6) / Vpv;
  const I_out = I_pv * (1 - D);

  // Inductor Ripple ΔIL = (Vin * D) / (f_sw * L)
  const deltaIL = (Vpv * D) / (switchingFreqHz * inductanceH);
  const iL_min = Math.max(0, I_pv - deltaIL / 2);
  const iL_max = I_pv + deltaIL / 2;
  const isCCM = (I_pv - deltaIL / 2) > 0;

  // Capacitor Ripple ΔVc = (Iout * D) / (f_sw * C)
  const deltaVc = (I_out * D) / (switchingFreqHz * capacitanceF);
  const capRipplePercent = (deltaVc / vDcTarget) * 100;

  // Loss Breakdown (MOSFET / IGBT + Fast Recovery Diode)
  const Ron = 0.006; // switch on-resistance (6 mOhm)
  const Rl = 0.004;  // inductor DCR (4 mOhm)
  const Resr = 0.008; // capacitor ESR
  const tr = 70e-9;  // rise time
  const tf = 110e-9; // fall time

  const pCondSwitch = I_pv * I_pv * Ron * D;
  const pCondInductor = I_pv * I_pv * Rl;
  const pCondCap = I_out * I_out * Resr;
  const pSwitching = 0.5 * vDcTarget * I_pv * (tr + tf) * switchingFreqHz;

  const totalLossWatts = pCondSwitch + pCondInductor + pCondCap + pSwitching;
  const totalLossMW = totalLossWatts / 1e6;
  const efficiencyPercent = Math.max(90, Math.min(99.4, (1 - totalLossMW / PpvMW) * 100));

  // Generate 2 cycles of high-resolution switching waveforms for oscilloscope
  const timeMicroSec = [];
  const iInductor = [];
  const vSwitch = [];
  const iDiode = [];

  const pointsPerCycle = 30;
  const tCycleUs = T_sw * 1e6;

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let p = 0; p < pointsPerCycle; p++) {
      const frac = p / pointsPerCycle;
      const tUs = cycle * tCycleUs + frac * tCycleUs;
      timeMicroSec.push(Number(tUs.toFixed(1)));

      if (frac < D) {
        // Switch ON: Inductor charging, switch voltage ~0, diode current = 0
        const current_iL = iL_min + (iL_max - iL_min) * (frac / D);
        iInductor.push(Number(current_iL.toFixed(1)));
        vSwitch.push(Number((current_iL * Ron).toFixed(1)));
        iDiode.push(0);
      } else {
        // Switch OFF: Inductor discharging into DC bus, switch voltage = Vout, diode conducts
        const decayFrac = (frac - D) / (1 - D);
        const current_iL = iL_max - (iL_max - iL_min) * decayFrac;
        iInductor.push(Number(current_iL.toFixed(1)));
        vSwitch.push(Number(vDcTarget.toFixed(1)));
        iDiode.push(Number(current_iL.toFixed(1)));
      }
    }
  }

  return {
    dutyCycle: Number(D.toFixed(3)),
    vDcBus: vDcTarget,
    inductorCurrentMeanA: Number(I_pv.toFixed(1)),
    inductorCurrentRippleA: Number(deltaIL.toFixed(1)),
    capVoltageRippleV: Number(deltaVc.toFixed(2)),
    capVoltageRipplePercent: Number(capRipplePercent.toFixed(3)),
    isCCM,
    efficiencyPercent: Number(efficiencyPercent.toFixed(2)),
    lossBreakdown: {
      conductionLossMW: Number(((pCondSwitch + pCondCap) / 1e6).toFixed(4)),
      switchingLossMW: Number((pSwitching / 1e6).toFixed(4)),
      inductorLossMW: Number((pCondInductor / 1e6).toFixed(4)),
      totalLossMW: Number(totalLossMW.toFixed(4))
    },
    waveforms: {
      timeMicroSec,
      iInductor,
      vSwitch,
      iDiode
    }
  };
}
