const mongoose = require('mongoose');

const TimeStepDataSchema = new mongoose.Schema({
  timeHour: Number,
  irradiance: Number,
  ambientTemp: Number,
  cellTemp: Number,
  pvVoltage: Number,
  pvCurrent: Number,
  pvPowerMW: Number,
  pvPowerAvailableMW: Number,
  mpptEfficiency: Number,
  boostDutyCycle: Number,
  vDcBus: Number,
  bessPowerMW: Number, // positive = discharging, negative = charging
  bessSoc: Number,
  bessVoltage: Number,
  bessCurrent: Number,
  bessTempC: Number,
  inverterPowerAC_MW: Number,
  inverterPowerQ_MVAr: Number,
  inverterEfficiency: Number,
  gridPowerMW: Number, // positive = export to grid, negative = import from grid
  loadPowerMW: Number,
  curtailedPowerMW: Number,
  costRevenueHourly: Number
}, { _id: false });

const SimulationResultSchema = new mongoose.Schema({
  scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: false },
  scenarioName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  summary: {
    totalPvEnergyMWh: Number,
    totalLoadEnergyMWh: Number,
    totalGridExportMWh: Number,
    totalGridImportMWh: Number,
    totalBatteryChargedMWh: Number,
    totalBatteryDischargedMWh: Number,
    roundTripEfficiencyActual: Number,
    totalCurtailmentMWh: Number,
    curtailmentPercentage: Number,
    netEconomicRevenueUSD: Number,
    equivalentCo2SavedTons: Number,
    finalSoc: Number,
    peakPvPowerMW: Number,
    avgInverterEfficiency: Number
  },
  timeSeries: [TimeStepDataSchema]
}, { timestamps: true });

module.exports = mongoose.model('SimulationResult', SimulationResultSchema);
