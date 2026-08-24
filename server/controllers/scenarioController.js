const Scenario = require('../models/Scenario');
const { isConnectedToMongo, inMemoryStore } = require('../config/db');

// Built-in Industrial Benchmark Presets
const PRESET_SCENARIOS = [
  {
    _id: 'preset-100mw-utility',
    name: '100 MW Utility-Scale PV + 200 MWh BESS (Nevada Grid)',
    description: 'High-voltage transmission grid connected plant with 2-hour storage, incremental conductance MPPT, and Time-of-Use price arbitrage dispatch.',
    category: 'Utility-Scale',
    isPreset: true,
    pvConfig: {
      pNominalMW: 100,
      vMp: 41.5,
      iMp: 13.25,
      vOc: 49.8,
      iSc: 14.1,
      tempCoeffVoc: -0.28,
      tempCoeffIsc: 0.048,
      modulesSeries: 24,
      stringsParallel: 7500,
      noct: 45,
      mpptAlgorithm: 'Incremental Conductance',
      mpptStepSize: 0.005
    },
    boostConfig: {
      inductanceH: 1.5e-3,
      capacitanceF: 4700e-6,
      switchingFreqHz: 5000,
      vDcTarget: 800
    },
    bessConfig: {
      capacityMWh: 200,
      maxChargePowerMW: 50,
      maxDischargePowerMW: 50,
      initialSoc: 50,
      socMin: 15,
      socMax: 95,
      efficiencyRoundTrip: 92,
      cRate: 0.5,
      cellChemistry: 'LFP (Lithium Iron Phosphate)'
    },
    inverterConfig: {
      ratedPowerMVA: 110,
      vGridLineRMS: 33000,
      gridFrequencyHz: 50,
      targetPowerFactor: 1.0,
      lcl_L1_H: 0.15e-3,
      lcl_L2_H: 0.08e-3,
      lcl_C_F: 120e-6
    },
    emsConfig: {
      mode: 'Time-of-Use Arbitrage',
      gridExportLimitMW: 70,
      gridImportLimitMW: 100,
      peakShavingThresholdMW: 60,
      tariffSchedule: [
        { hour: 0, buyPrice: 45, sellPrice: 32 },
        { hour: 1, buyPrice: 40, sellPrice: 28 },
        { hour: 2, buyPrice: 38, sellPrice: 25 },
        { hour: 3, buyPrice: 38, sellPrice: 25 },
        { hour: 4, buyPrice: 42, sellPrice: 30 },
        { hour: 5, buyPrice: 55, sellPrice: 38 },
        { hour: 6, buyPrice: 75, sellPrice: 52 },
        { hour: 7, buyPrice: 85, sellPrice: 60 },
        { hour: 8, buyPrice: 90, sellPrice: 65 },
        { hour: 9, buyPrice: 80, sellPrice: 55 },
        { hour: 10, buyPrice: 70, sellPrice: 45 },
        { hour: 11, buyPrice: 65, sellPrice: 40 },
        { hour: 12, buyPrice: 60, sellPrice: 38 },
        { hour: 13, buyPrice: 60, sellPrice: 38 },
        { hour: 14, buyPrice: 65, sellPrice: 42 },
        { hour: 15, buyPrice: 80, sellPrice: 55 },
        { hour: 16, buyPrice: 110, sellPrice: 80 },
        { hour: 17, buyPrice: 165, sellPrice: 125 },
        { hour: 18, buyPrice: 195, sellPrice: 150 },
        { hour: 19, buyPrice: 210, sellPrice: 165 },
        { hour: 20, buyPrice: 180, sellPrice: 140 },
        { hour: 21, buyPrice: 140, sellPrice: 105 },
        { hour: 22, buyPrice: 85, sellPrice: 60 },
        { hour: 23, buyPrice: 60, sellPrice: 42 }
      ]
    },
    environment: {
      irradianceProfile: [0, 0, 0, 0, 0, 45, 180, 420, 680, 890, 990, 1020, 980, 870, 690, 460, 220, 60, 0, 0, 0, 0, 0, 0],
      ambientTempProfile: [18, 17, 16, 16, 17, 19, 22, 25, 28, 31, 33, 34, 34, 33, 31, 29, 27, 24, 22, 20, 19, 19, 18, 18],
      loadProfile: [30, 28, 26, 26, 28, 35, 48, 62, 70, 75, 78, 80, 78, 76, 74, 72, 75, 82, 88, 85, 75, 60, 45, 35]
    }
  },
  {
    _id: 'preset-5mw-commercial',
    name: '5 MW Commercial & Industrial Rooftop + 10 MWh BESS',
    description: 'Industrial facility with high daytime factory loads, peak demand limiting, and zero-export protection.',
    category: 'Commercial & Industrial',
    isPreset: true,
    pvConfig: {
      pNominalMW: 5,
      vMp: 41.5,
      iMp: 13.25,
      vOc: 49.8,
      iSc: 14.1,
      tempCoeffVoc: -0.28,
      tempCoeffIsc: 0.048,
      modulesSeries: 20,
      stringsParallel: 450,
      noct: 46,
      mpptAlgorithm: 'Perturb & Observe',
      mpptStepSize: 0.01
    },
    boostConfig: {
      inductanceH: 2.0e-3,
      capacitanceF: 2200e-6,
      switchingFreqHz: 8000,
      vDcTarget: 750
    },
    bessConfig: {
      capacityMWh: 10,
      maxChargePowerMW: 2.5,
      maxDischargePowerMW: 2.5,
      initialSoc: 40,
      socMin: 20,
      socMax: 90,
      efficiencyRoundTrip: 91,
      cRate: 0.5,
      cellChemistry: 'LFP (Lithium Iron Phosphate)'
    },
    inverterConfig: {
      ratedPowerMVA: 5.5,
      vGridLineRMS: 11000,
      gridFrequencyHz: 50,
      targetPowerFactor: 0.98,
      lcl_L1_H: 0.25e-3,
      lcl_L2_H: 0.12e-3,
      lcl_C_F: 60e-6
    },
    emsConfig: {
      mode: 'Peak Shaving',
      gridExportLimitMW: 1.0,
      gridImportLimitMW: 6.0,
      peakShavingThresholdMW: 3.5,
      tariffSchedule: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        buyPrice: h >= 14 && h <= 20 ? 220 : 95,
        sellPrice: 40
      }))
    },
    environment: {
      irradianceProfile: [0, 0, 0, 0, 0, 30, 150, 380, 620, 810, 930, 970, 920, 800, 610, 390, 180, 40, 0, 0, 0, 0, 0, 0],
      ambientTempProfile: [20, 19, 18, 18, 19, 21, 24, 27, 30, 32, 35, 36, 36, 35, 33, 31, 29, 26, 24, 22, 21, 21, 20, 20],
      loadProfile: [1.2, 1.1, 1.0, 1.0, 1.5, 2.8, 4.2, 4.8, 5.2, 5.4, 5.5, 5.3, 5.0, 5.1, 5.3, 5.4, 4.8, 3.9, 2.8, 2.2, 1.8, 1.5, 1.3, 1.2]
    }
  },
  {
    _id: 'preset-500kw-microgrid',
    name: '500 kW Resilient Hospital Microgrid + 1.2 MWh BESS',
    description: 'Islanded and grid-tied capable healthcare microgrid with black-start grid forming inverter and critical load backup.',
    category: 'Microgrid',
    isPreset: true,
    pvConfig: {
      pNominalMW: 0.5,
      vMp: 41.5,
      iMp: 13.25,
      vOc: 49.8,
      iSc: 14.1,
      tempCoeffVoc: -0.28,
      tempCoeffIsc: 0.048,
      modulesSeries: 18,
      stringsParallel: 50,
      noct: 44,
      mpptAlgorithm: 'Incremental Conductance',
      mpptStepSize: 0.005
    },
    boostConfig: {
      inductanceH: 3.5e-3,
      capacitanceF: 1500e-6,
      switchingFreqHz: 10000,
      vDcTarget: 700
    },
    bessConfig: {
      capacityMWh: 1.2,
      maxChargePowerMW: 0.35,
      maxDischargePowerMW: 0.45,
      initialSoc: 65,
      socMin: 15,
      socMax: 95,
      efficiencyRoundTrip: 93,
      cRate: 0.75,
      cellChemistry: 'NMC (Nickel Manganese Cobalt)'
    },
    inverterConfig: {
      ratedPowerMVA: 0.6,
      vGridLineRMS: 400,
      gridFrequencyHz: 50,
      targetPowerFactor: 1.0,
      lcl_L1_H: 0.45e-3,
      lcl_L2_H: 0.22e-3,
      lcl_C_F: 40e-6
    },
    emsConfig: {
      mode: 'Self-Consumption',
      gridExportLimitMW: 0.2,
      gridImportLimitMW: 0.8,
      peakShavingThresholdMW: 0.4,
      tariffSchedule: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        buyPrice: 140,
        sellPrice: 70
      }))
    },
    environment: {
      irradianceProfile: [0, 0, 0, 0, 0, 50, 200, 450, 720, 920, 1010, 1040, 1000, 890, 710, 480, 240, 70, 0, 0, 0, 0, 0, 0],
      ambientTempProfile: [22, 21, 20, 20, 21, 23, 26, 29, 32, 34, 36, 37, 37, 36, 34, 32, 30, 27, 25, 24, 23, 23, 22, 22],
      loadProfile: [0.28, 0.26, 0.25, 0.25, 0.27, 0.32, 0.38, 0.42, 0.44, 0.45, 0.46, 0.45, 0.44, 0.45, 0.46, 0.45, 0.43, 0.41, 0.39, 0.36, 0.34, 0.32, 0.30, 0.29]
    }
  },
  {
    _id: 'preset-10kw-residential',
    name: '10 kW Smart Home Solar + 15 kWh Storage',
    description: 'Residential rooftop PV with battery storage, EV charging integration, and self-consumption maximization.',
    category: 'Residential',
    isPreset: true,
    pvConfig: {
      pNominalMW: 0.01, // 10 kW
      vMp: 41.5,
      iMp: 13.25,
      vOc: 49.8,
      iSc: 14.1,
      tempCoeffVoc: -0.28,
      tempCoeffIsc: 0.048,
      modulesSeries: 12,
      stringsParallel: 2,
      noct: 43,
      mpptAlgorithm: 'Incremental Conductance',
      mpptStepSize: 0.01
    },
    boostConfig: {
      inductanceH: 5.0e-3,
      capacitanceF: 680e-6,
      switchingFreqHz: 16000,
      vDcTarget: 400
    },
    bessConfig: {
      capacityMWh: 0.015, // 15 kWh
      maxChargePowerMW: 0.005, // 5 kW
      maxDischargePowerMW: 0.006, // 6 kW
      initialSoc: 30,
      socMin: 10,
      socMax: 98,
      efficiencyRoundTrip: 94,
      cRate: 0.5,
      cellChemistry: 'LFP (Lithium Iron Phosphate)'
    },
    inverterConfig: {
      ratedPowerMVA: 0.012, // 12 kVA
      vGridLineRMS: 230,
      gridFrequencyHz: 50,
      targetPowerFactor: 1.0,
      lcl_L1_H: 1.2e-3,
      lcl_L2_H: 0.6e-3,
      lcl_C_F: 15e-6
    },
    emsConfig: {
      mode: 'Self-Consumption',
      gridExportLimitMW: 0.005,
      gridImportLimitMW: 0.015,
      peakShavingThresholdMW: 0.008,
      tariffSchedule: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        buyPrice: h >= 16 && h <= 21 ? 280 : 110,
        sellPrice: 50
      }))
    },
    environment: {
      irradianceProfile: [0, 0, 0, 0, 0, 40, 160, 400, 650, 850, 950, 980, 940, 830, 650, 420, 200, 50, 0, 0, 0, 0, 0, 0],
      ambientTempProfile: [15, 14, 14, 13, 14, 16, 18, 21, 23, 25, 26, 27, 27, 26, 25, 23, 21, 19, 18, 17, 16, 16, 15, 15],
      loadProfile: [0.0012, 0.0009, 0.0008, 0.0008, 0.0011, 0.0022, 0.0038, 0.0035, 0.0022, 0.0020, 0.0021, 0.0025, 0.0022, 0.0020, 0.0024, 0.0031, 0.0045, 0.0072, 0.0085, 0.0078, 0.0062, 0.0041, 0.0025, 0.0016]
    }
  }
];

// Initialize in-memory store with presets
PRESET_SCENARIOS.forEach(p => inMemoryStore.scenarios.set(p._id, p));

// Get all scenarios (presets + custom saved)
const getScenarios = async (req, res) => {
  try {
    let customScenarios = [];
    if (isConnectedToMongo()) {
      customScenarios = await Scenario.find().sort({ createdAt: -1 });
    } else {
      customScenarios = Array.from(inMemoryStore.scenarios.values()).filter(s => !s.isPreset);
    }
    return res.json({
      success: true,
      data: [...PRESET_SCENARIOS, ...customScenarios]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single scenario by ID
const getScenarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const preset = PRESET_SCENARIOS.find(p => p._id === id);
    if (preset) return res.json({ success: true, data: preset });

    if (isConnectedToMongo()) {
      const scenario = await Scenario.findById(id);
      if (!scenario) return res.status(404).json({ success: false, message: 'Scenario not found' });
      return res.json({ success: true, data: scenario });
    } else {
      const scenario = inMemoryStore.scenarios.get(id);
      if (!scenario) return res.status(404).json({ success: false, message: 'Scenario not found' });
      return res.json({ success: true, data: scenario });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create / Save custom scenario
const createScenario = async (req, res) => {
  try {
    const payload = req.body;
    payload.isPreset = false;

    if (isConnectedToMongo()) {
      const newScenario = await Scenario.create(payload);
      return res.status(201).json({ success: true, data: newScenario });
    } else {
      const newId = 'custom-' + Date.now();
      const customDoc = { _id: newId, ...payload, createdAt: new Date(), updatedAt: new Date() };
      inMemoryStore.scenarios.set(newId, customDoc);
      return res.status(201).json({ success: true, data: customDoc });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Delete custom scenario
const deleteScenario = async (req, res) => {
  try {
    const { id } = req.params;
    if (id.startsWith('preset-')) {
      return res.status(400).json({ success: false, message: 'Cannot delete built-in preset scenarios' });
    }

    if (isConnectedToMongo()) {
      await Scenario.findByIdAndDelete(id);
    } else {
      inMemoryStore.scenarios.delete(id);
    }
    return res.json({ success: true, message: 'Scenario deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getScenarios,
  getScenarioById,
  createScenario,
  deleteScenario,
  PRESET_SCENARIOS
};
