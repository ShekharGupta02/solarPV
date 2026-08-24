const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, isConnectedToMongo } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const scenarioRoutes = require('./routes/scenarioRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const optimizerRoutes = require('./routes/optimizerRoutes');

app.use('/api/scenarios', scenarioRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/optimizer', optimizerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Grid-Connected Solar PV + BESS + EMS Simulation Engine',
    database: isConnectedToMongo() ? 'MongoDB' : 'In-Memory Hybrid Store',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Initialize DB and start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`⚡ Solar PV + BESS + EMS Backend Server running on Port ${PORT}`);
    console.log(`⚡ Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`================================================================`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use by another process.`);
    } else {
      console.error('[Server Error]', error);
    }
  });
});
