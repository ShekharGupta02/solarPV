const express = require('express');
const router = express.Router();
const {
  getScenarios,
  getScenarioById,
  createScenario,
  deleteScenario
} = require('../controllers/scenarioController');

router.get('/', getScenarios);
router.get('/:id', getScenarioById);
router.post('/', createScenario);
router.delete('/:id', deleteScenario);

module.exports = router;
