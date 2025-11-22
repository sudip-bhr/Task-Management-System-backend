import mongoose from 'mongoose';
import { CONFIG } from '../config/constants';

export const connectDB = async () => {
  try {
    const mongoUri = CONFIG.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in environment variables');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
  }
};