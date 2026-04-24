import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: false },
    googleAccessToken: { type: String, required: false },
    googleRefreshToken: { type: String, required: false },
    googleId: { type: String, required: true }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);