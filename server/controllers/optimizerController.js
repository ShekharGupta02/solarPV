const { optimize24HourDispatch } = require('../engine/milpOptimizer');

const runDispatchOptimization = async (req, res) => {
  try {
    const scenario = req.body;
    if (!scenario || !scenario.pvConfig) {
      return res.status(400).json({ success: false, message: 'Invalid scenario payload for optimizer' });
    }

    const optimizationResults = optimize24HourDispatch(scenario);

    return res.json({
      success: true,
      data: optimizationResults
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  runDispatchOptimization
};
