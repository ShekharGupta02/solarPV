/**
 * Client-side Physical Single-Diode PV Model with NOCT & Partial Shading Simulation
 */

const k_B = 1.380649e-23;
const q_e = 1.602176634e-19;

export function calculatePvOperatingPoint(G, Tamb, pvConfig, shadingPattern = [1, 1, 1]) {
  if (G <= 0.1) {
    return {
      voltage: 0,
      current: 0,
      powerMW: 0,
      cellTempC: Tamb,
      voc: 0,
      isc: 0,
      vmp: 0,
      imp: 0,
      pmpMW: 0,
      efficiencyPercent: 0
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

  // Average effective shading factor across 3 substrings (bypass diode groups)
  const avgShading = (shadingPattern[0] + shadingPattern[1] + shadingPattern[2]) / 3;
  const effectiveG = G * avgShading;

  // NOCT Model for Cell Temperature
  const Tcell = Tamb + ((noct - 20) / 800) * G;
  const deltaT = Tcell - 25; // standard test condition: 25°C

  // Thermal coefficients
  const moduleVoc = vOc * (1 + (tempCoeffVoc / 100) * deltaT);
  const moduleIsc = iSc * (effectiveG / 1000) * (1 + (tempCoeffIsc / 100) * deltaT);
  const moduleVmp = vMp * (1 + (tempCoeffVoc / 100) * deltaT);
  const moduleImp = iMp * (effectiveG / 1000) * (1 + (tempCoeffIsc / 100) * deltaT);

  const arrayVoc = moduleVoc * modulesSeries;
  const arrayIsc = moduleIsc * stringsParallel;
  const arrayVmp = moduleVmp * modulesSeries;
  const arrayImp = moduleImp * stringsParallel;

  const pmpWatts = arrayVmp * arrayImp;
  const pmpMW = pmpWatts / 1e6;

  // Approximate module surface area ~2.58 m2 for 550W module
  const totalAreaM2 = (modulesSeries * stringsParallel) * 2.58;
  const incidentSolarPowerWatts = effectiveG * totalAreaM2;
  const efficiencyPercent = incidentSolarPowerWatts > 0 ? (pmpWatts / incidentSolarPowerWatts) * 100 : 21.2;

  return {
    voltage: Number(arrayVmp.toFixed(1)),
    current: Number(arrayImp.toFixed(1)),
    powerMW: Number(pmpMW.toFixed(3)),
    cellTempC: Number(Tcell.toFixed(1)),
    voc: Number(arrayVoc.toFixed(1)),
    isc: Number(arrayIsc.toFixed(1)),
    vmp: Number(arrayVmp.toFixed(1)),
    imp: Number(arrayImp.toFixed(1)),
    pmpMW: Number(pmpMW.toFixed(3)),
    efficiencyPercent: Number(Math.min(23.5, efficiencyPercent).toFixed(1))
  };
}

/**
 * Generate Multi-Peak I-V and P-V curve with Bypass Diodes & Shading
 */
export function generateDetailedCurve(G, Tamb, pvConfig, shadingPattern = [1, 1, 1]) {
  const pv = calculatePvOperatingPoint(G, Tamb, pvConfig, shadingPattern);
  if (pv.voc <= 0) return [];

  const points = [];
  const numSteps = 70;
  const Voc = pv.voc;
  const Isc = pv.isc;
  const TcellK = pv.cellTempC + 273.15;
  const Ns = (pvConfig.modulesSeries || 24) * 72;
  const Vt = (1.25 * k_B * TcellK) / q_e * Ns;

  const isUniform = shadingPattern[0] === shadingPattern[1] && shadingPattern[1] === shadingPattern[2];

  if (isUniform) {
    const I0 = Isc / (Math.exp(Voc / Vt) - 1);
    for (let i = 0; i <= numSteps; i++) {
      const V = (Voc * i) / numSteps;
      let I = Isc - I0 * (Math.exp(V / Vt) - 1);
      if (I < 0) I = 0;
      const P = (V * I) / 1e6;
      points.push({
        voltage: Number(V.toFixed(1)),
        current: Number(I.toFixed(1)),
        powerMW: Number(P.toFixed(3))
      });
    }
  } else {
    // Partial Shading: 3 sub-strings with bypass diodes creating multi-peak P-V curve
    const s1 = shadingPattern[0];
    const s2 = shadingPattern[1];
    const s3 = shadingPattern[2];
    const Voc_sub = Voc / 3;
    const Vt_sub = Vt / 3;

    for (let i = 0; i <= numSteps; i++) {
      const V = (Voc * i) / numSteps;
      // Current is governed by the highest active bypass section
      let I = 0;
      const V_per_sub = V / 3;

      // Substring 1
      const I1 = Isc * s1 - (Isc * s1 / (Math.exp(Voc_sub / Vt_sub) - 1)) * (Math.exp(V_per_sub / Vt_sub) - 1);
      // Substring 2
      const I2 = Isc * s2 - (Isc * s2 / (Math.exp(Voc_sub / Vt_sub) - 1)) * (Math.exp(V_per_sub / Vt_sub) - 1);
      // Substring 3
      const I3 = Isc * s3 - (Isc * s3 / (Math.exp(Voc_sub / Vt_sub) - 1)) * (Math.exp(V_per_sub / Vt_sub) - 1);

      // Equivalent series combination with bypass conduction
      I = Math.max(0, Math.min(Math.max(I1, 0), Math.max(I2, 0), Math.max(I3, 0)));
      if (V < Voc * 0.35) I = Math.max(I, Isc * Math.max(s1, s2, s3) * 0.95);
      else if (V < Voc * 0.7) I = Math.max(I, Isc * (s1 + s2) / 2 * 0.85);

      const P = (V * I) / 1e6;
      points.push({
        voltage: Number(V.toFixed(1)),
        current: Number(I.toFixed(1)),
        powerMW: Number(P.toFixed(3))
      });
    }
  }

  return points;
}
