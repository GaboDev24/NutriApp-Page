const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    lifestyle: {
        type: String,
        enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
        default: 'sedentary'
    },
    assignedProfessional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', default: null },
    routine: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
