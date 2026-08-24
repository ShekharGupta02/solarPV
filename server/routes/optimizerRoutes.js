const express = require('express');
const router = express.Router();
const { runDispatchOptimization } = require('../controllers/optimizerController');

router.post('/dispatch', runDispatchOptimization);

module.exports = router;
