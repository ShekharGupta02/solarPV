/**
 * Faults, Disturbances & Grid Code Compliance Injection Matrix
 */

export const DISTURBANCE_PRESETS = {
  CLOUD_PASSAGE: {
    id: 'cloud_passage',
    name: 'Cloud Passage Ramp-Down',
    description: 'Rapid irradiance plunge from 1000 W/m² to 280 W/m² in 5 seconds. Tests BESS ramp-rate smoothing compliance (<10%/min).',
    durationSeconds: 15,
    targetIrradiance: 280,
    gridVoltagePu: 1.0,
    gridConnected: true,
    loadMultiplier: 1.0,
    expectedBehavior: 'BESS discharges rapidly to absorb the solar drop and prevent steep grid export ramp violation.'
  },
  VOLTAGE_SAG_LVRT: {
    id: 'voltage_sag_lvrt',
    name: '0.50 pu Grid Voltage Sag (LVRT / FRT)',
    description: 'Three-phase symmetrical grid voltage sag down to 0.50 pu for 1000 ms. Tests Low-Voltage Ride-Through & reactive current support.',
    durationSeconds: 8,
    targetIrradiance: 950,
    gridVoltagePu: 0.50,
    gridConnected: true,
    loadMultiplier: 1.0,
    expectedBehavior: 'Inverter stays online (no trip) and injects dynamic reactive current Iq = 2.0 * (1 - 0.5) * In to support grid voltage recovery.'
  },
  GRID_OUTAGE: {
    id: 'grid_outage',
    name: 'Total Grid Blackout (Anti-Islanding & Microgrid)',
    description: 'Main substation breaker trips. Tests anti-islanding detection (<100ms) and seamless transition to Grid-Forming BESS backup mode.',
    durationSeconds: 20,
    targetIrradiance: 850,
    gridVoltagePu: 0.0,
    gridConnected: false,
    loadMultiplier: 1.0,
    expectedBehavior: 'Anti-islanding relay detects Loss of Mains; BESS inverter assumes V-f grid-forming control, powering critical factory loads.'
  },
  LOAD_STEP: {
    id: 'load_step',
    name: 'Sudden Heavy Load Step (+60%)',
    description: 'Factory initiates heavy motor/arc load step from 50 MW to 80 MW. Tests synthetic inertia & frequency stability.',
    durationSeconds: 12,
    targetIrradiance: 900,
    gridVoltagePu: 0.98,
    gridConnected: true,
    loadMultiplier: 1.60,
    expectedBehavior: 'BESS injects instantaneous active power (synthetic inertia) to cushion the substation transformer from overload.'
  },
  OVER_FREQUENCY: {
    id: 'over_frequency',
    name: 'Over-Frequency Surge (50.8 Hz)',
    description: 'Regional grid over-frequency event (50.8 Hz). Tests Frequency-Watt droop curtailment & fast battery charging.',
    durationSeconds: 10,
    targetIrradiance: 1000,
    gridVoltagePu: 1.02,
    gridFrequencyHz: 50.8,
    gridConnected: true,
    loadMultiplier: 0.9,
    expectedBehavior: 'Inverter throttles active power or BESS charges at maximum rate to arrest frequency rise.'
  }
};
