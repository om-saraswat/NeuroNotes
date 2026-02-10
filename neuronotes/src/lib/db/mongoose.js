/**
 * MongoDB connection utility using Mongoose
 */

import mongoose from 'mongoose';

// Cache the database connection
let cachedConnection = null;

/**
 * Connects to MongoDB using the provided URI
 * 
 * @returns {Promise<mongoose.Connection>} A Promise that resolves to the Mongoose connection
 */
export async function connectToDatabase() {
  // If we have a cached connection, return it
  if (cachedConnection) {
    return cachedConnection;
  }

  // Ensure we have a MongoDB URI
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  try {
    // Connect to MongoDB
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      // These options help with connection stability
      maxPoolSize: 10,
    });

    console.log('Connected to MongoDB');
    
    // Cache the connection for future use
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnects from MongoDB
 */
export async function disconnectFromDatabase() {
  if (cachedConnection) {
    await mongoose.disconnect();
    cachedConnection = null;
    console.log('Disconnected from MongoDB');
  }
}
