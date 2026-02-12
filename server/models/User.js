const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    height: Number,
    weight: Number,
    lifestyle: { 
        type: String, 
        enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
        default: 'sedentary'
    },
    assignedProfessional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
    routine: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
