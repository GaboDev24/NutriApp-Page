const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    weight: { type: Number, required: true },
    notes: { type: String, default: null },
    mealsConsumed: [{
        mealId: mongoose.Schema.Types.ObjectId,
        description: String,
        calories: Number,
        consumed: { type: Boolean, default: false }
    }],
    createdAt: { type: Date, default: Date.now }
});

// Index for faster queries by user and date
progressSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Progress', progressSchema);
