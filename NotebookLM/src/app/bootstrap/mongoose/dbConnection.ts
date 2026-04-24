
//connect to mongodb using mongoose
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const mongoURI = process.env.MONGODB_URI;


export async function dbConnection() {
    try {
        await mongoose.connect(mongoURI as string);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}