const mongoose = require('mongoose');

// In-Memory Database Store as resilient fallback if local/remote MongoDB daemon is not running
const inMemoryStore = {
  scenarios: new Map(),
  simulationResults: new Map(),
  batteryProfiles: new Map()
};

let isConnectedToMongo = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/solarpv_ems';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isConnectedToMongo = true;
    console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    isConnectedToMongo = false;
    console.log(`[MongoDB] Local/Remote MongoDB instance not detected (${error.message}).`);
    console.log(`[Database] Initialized high-performance In-Memory Hybrid Persistence Layer.`);
  }
};

module.exports = {
  connectDB,
  isConnectedToMongo: () => isConnectedToMongo,
  inMemoryStore
};
