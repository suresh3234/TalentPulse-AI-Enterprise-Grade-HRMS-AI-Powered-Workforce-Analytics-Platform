const mongoose = require("mongoose");
const logger = require("../utils/logger");

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50,             // handle 50 concurrent connections
      minPoolSize: 10,             // keep 10 warm
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: "majority"
    });
    
    logger.info("Database connected successfully in production-ready pool mode", {
      host: conn.connection.host,
      name: conn.connection.name,
      poolSize: conn.connection.base ? "multi" : "standard"
    });
    return conn;
  } catch (error) {
    logger.error("Database connection failed during startup:", {
      message: error.message,
    });
    throw error;
  }
};

module.exports = connectDB;
