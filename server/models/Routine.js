const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meals: [{
        time: String,
        description: String,
        calories: Number
    }],
    recommendations: String,
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Routine', routineSchema);
