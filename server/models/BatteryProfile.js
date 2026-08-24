const mongoose = require('mongoose');

const BatteryDegradationLogSchema = new mongoose.Schema({
  cycleNumber: Number,
  depthOfDischargePercent: Number,
  effectiveCapacityMWh: Number,
  stateOfHealthPercent: Number,
  internalResistanceOhms: Number,
  calendarAgingLossPercent: Number,
  cycleAgingLossPercent: Number
}, { _id: false });

const BatteryProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  chemistry: {
    type: String,
    enum: ['LFP (Lithium Iron Phosphate)', 'NMC (Nickel Manganese Cobalt)', 'Flow Battery'],
    default: 'LFP (Lithium Iron Phosphate)'
  },
  nominalCapacityMWh: { type: Number, required: true },
  nominalVoltageV: { type: Number, default: 750 },
  r0_Ohms: { type: Number, default: 0.015 }, // Thevenin R0
  r1_Ohms: { type: Number, default: 0.020 }, // Thevenin R1
  c1_Farads: { type: Number, default: 2500 }, // Thevenin C1
  thermalMassJ_K: { type: Number, default: 1.5e7 },
  coolingHeatTransferW_K: { type: Number, default: 4500 },
  projectedLifespanYears: { type: Number, default: 15 },
  ratedCyclesAt80DoD: { type: Number, default: 6000 },
  degradationLog: [BatteryDegradationLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('BatteryProfile', BatteryProfileSchema);
