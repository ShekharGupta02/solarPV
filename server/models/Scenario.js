const mongoose = require('mongoose');

const TariffHourSchema = new mongoose.Schema({
  hour: { type: Number, required: true },
  buyPrice: { type: Number, required: true }, // $/MWh or c/kWh
  sellPrice: { type: Number, required: true }
}, { _id: false });

const ScenarioSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['Utility-Scale', 'Commercial & Industrial', 'Microgrid', 'Residential', 'Custom'],
    default: 'Utility-Scale'
  },
  isPreset: { type: Boolean, default: false },
  pvConfig: {
    pNominalMW: { type: Number, default: 100 },
    vMp: { type: Number, default: 41.5 },
    iMp: { type: Number, default: 13.25 },
    vOc: { type: Number, default: 49.8 },
    iSc: { type: Number, default: 14.1 },
    tempCoeffVoc: { type: Number, default: -0.28 }, // %/°C
    tempCoeffIsc: { type: Number, default: 0.048 },  // %/°C
    modulesSeries: { type: Number, default: 24 },
    stringsParallel: { type: Number, default: 7500 },
    noct: { type: Number, default: 45 }, // °C
    mpptAlgorithm: {
      type: String,
      enum: ['Incremental Conductance', 'Perturb & Observe'],
      default: 'Incremental Conductance'
    },
    mpptStepSize: { type: Number, default: 0.005 }
  },
  boostConfig: {
    inductanceH: { type: Number, default: 1.5e-3 },
    capacitanceF: { type: Number, default: 4700e-6 },
    switchingFreqHz: { type: Number, default: 5000 },
    vDcTarget: { type: Number, default: 800 }
  },
  bessConfig: {
    capacityMWh: { type: Number, default: 200 },
    maxChargePowerMW: { type: Number, default: 50 },
    maxDischargePowerMW: { type: Number, default: 50 },
    initialSoc: { type: Number, default: 50 },
    socMin: { type: Number, default: 15 },
    socMax: { type: Number, default: 95 },
    efficiencyRoundTrip: { type: Number, default: 92 },
    cRate: { type: Number, default: 0.5 },
    cellChemistry: {
      type: String,
      enum: ['LFP (Lithium Iron Phosphate)', 'NMC (Nickel Manganese Cobalt)', 'Flow Battery'],
      default: 'LFP (Lithium Iron Phosphate)'
    }
  },
  inverterConfig: {
    ratedPowerMVA: { type: Number, default: 110 },
    vGridLineRMS: { type: Number, default: 33000 },
    gridFrequencyHz: { type: Number, default: 50 },
    targetPowerFactor: { type: Number, default: 1.0 },
    lcl_L1_H: { type: Number, default: 0.15e-3 },
    lcl_L2_H: { type: Number, default: 0.08e-3 },
    lcl_C_F: { type: Number, default: 120e-6 }
  },
  emsConfig: {
    mode: {
      type: String,
      enum: ['Self-Consumption', 'Time-of-Use Arbitrage', 'Peak Shaving', 'Zero Export', 'Grid Ancillary', 'Islanding'],
      default: 'Time-of-Use Arbitrage'
    },
    gridExportLimitMW: { type: Number, default: 70 },
    gridImportLimitMW: { type: Number, default: 100 },
    peakShavingThresholdMW: { type: Number, default: 60 },
    tariffSchedule: [TariffHourSchema]
  },
  environment: {
    irradianceProfile: { type: [Number], default: [] },
    ambientTempProfile: { type: [Number], default: [] },
    loadProfile: { type: [Number], default: [] }
  }
}, { timestamps: true });

module.exports = mongoose.model('Scenario', ScenarioSchema);
