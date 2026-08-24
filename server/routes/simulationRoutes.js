const express = require('express');
const router = express.Router();
const {
  runSimulation,
  getIvPvCurves,
  getBatteryDegradationProjection
} = require('../controllers/simulationController');

router.post('/run', runSimulation);
router.post('/iv-pv-curve', getIvPvCurves);
router.post('/battery-degradation', getBatteryDegradationProjection);

module.exports = router;
