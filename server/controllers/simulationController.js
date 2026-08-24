const {
  solvePvPoint,
  generateIvPvCurve,
  solveBoostConverter,
  solveBessStep,
  solveInverter,
  run24HourSimulation
} = require('../engine/solarEngine');
const SimulationResult = require('../models/SimulationResult');
const { isConnectedToMongo, inMemoryStore } = require('../config/db');

// Run complete 24-hour simulation for a scenario configuration
const runSimulation = async (req, res) => {
  try {
    const scenario = req.body;
    if (!scenario || !scenario.pvConfig) {
      return res.status(400).json({ success: false, message: 'Invalid scenario payload' });
    }

    const simulationOutput = run24HourSimulation(scenario);

    // Save simulation result in DB / Memory for history & reporting
    const resultDoc = {
      scenarioName: scenario.name || 'Custom Simulation',
      summary: simulationOutput.summary,
      timeSeries: simulationOutput.timeSeries,
      createdAt: new Date()
    };

    if (isConnectedToMongo()) {
      await SimulationResult.create(resultDoc);
    } else {
      const resId = 'sim-' + Date.now();
      inMemoryStore.simulationResults.set(resId, { _id: resId, ...resultDoc });
    }

    return res.json({
      success: true,
      data: simulationOutput
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate I-V and P-V curve points for given Irradiance and Ambient Temperature
const getIvPvCurves = async (req, res) => {
  try {
    const { irradiance = 1000, ambientTemp = 25, pvConfig = {} } = req.body;
    const curvePoints = generateIvPvCurve(Number(irradiance), Number(ambientTemp), pvConfig);
    const mppPoint = solvePvPoint(Number(irradiance), Number(ambientTemp), pvConfig);

    return res.json({
      success: true,
      data: {
        mpp: mppPoint,
        curve: curvePoints
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Simulate 10-year Battery Degradation & Health Projection
const getBatteryDegradationProjection = async (req, res) => {
  try {
    const {
      capacityMWh = 200,
      chemistry = 'LFP (Lithium Iron Phosphate)',
      cyclesPerDay = 1.2,
      averageDoD = 75,
      averageCellTempC = 28
    } = req.body;

    const degradationData = [];
    let currentCapacity = capacityMWh;
    let soh = 100.0;
    let r0 = 0.015; // ohms

    // Temperature acceleration factor (Arrhenius): Ea = 30 kJ/mol
    const tempFactor = Math.exp((30000 / 8.314) * (1 / 298.15 - 1 / (averageCellTempC + 273.15)));
    const dodExponent = chemistry.includes('LFP') ? 1.6 : 1.9;

    for (let year = 0; year <= 15; year++) {
      const totalCycles = Math.round(year * 365 * cyclesPerDay);

      // Cycle fade: Wöhler power-law
      const cycleFadePercent = 0.0028 * Math.pow(totalCycles, 0.55) * Math.pow(averageDoD / 80, dodExponent);

      // Calendar fade: square-root of time
      const calendarFadePercent = 0.85 * Math.sqrt(year) * tempFactor;

      const totalLossPercent = Math.min(45, cycleFadePercent + calendarFadePercent);
      soh = Math.max(55, 100 - totalLossPercent);
      currentCapacity = capacityMWh * (soh / 100);
      const effectiveR0 = r0 * (1 + (totalLossPercent / 100) * 1.8);

      degradationData.push({
        year,
        totalCycles,
        stateOfHealthPercent: Number(soh.toFixed(1)),
        effectiveCapacityMWh: Number(currentCapacity.toFixed(2)),
        internalResistanceMOhms: Number((effectiveR0 * 1000).toFixed(2)),
        isEndOfLife: soh < 80
      });
    }

    return res.json({
      success: true,
      data: {
        chemistry,
        nominalCapacityMWh: capacityMWh,
        warrantyThresholdYear: degradationData.find(d => d.isEndOfLife)?.year || '>15',
        projection: degradationData
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  runSimulation,
  getIvPvCurves,
  getBatteryDegradationProjection
};
