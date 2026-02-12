const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    weight: Number,
    notes: String,
    mealsConsumed: [{
        mealId: mongoose.Schema.Types.ObjectId,
        description: String,
        calories: Number,
        consumed: { type: Boolean, default: false }
    }]
});

module.exports = mongoose.model('Progress', progressSchema);
