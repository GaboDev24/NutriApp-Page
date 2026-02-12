const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/auth');
const User = require('../models/User');
const Routine = require('../models/Routine');
const UserProgress = require('../models/Progress');

// Get Profile
router.get('/profile', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('routine');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Setup Routine Onboarding
router.post('/setup-routine', isAuth, async (req, res) => {
    try {
        const { height, weight, lifestyle } = req.body;
        const user = await User.findById(req.userId);

        user.height = height;
        user.weight = weight;
        user.lifestyle = lifestyle;

        // Simple Automated Routine Logic
        // In a real app, this would be more complex
        const meals = [
            { time: 'Desayuno', description: 'Avena con frutas y yogur', calories: 400 },
            { time: 'Almuerzo', description: 'Pechuga de pollo con arroz integral y brócoli', calories: 600 },
            { time: 'Merienda', description: 'Un puñado de frutos secos y una manzana', calories: 200 },
            { time: 'Cena', description: 'Salmón a la plancha con ensalada verde', calories: 500 }
        ];

        const newRoutine = new Routine({
            userId: user._id,
            meals,
            recommendations: 'Bebe al menos 2 litros de agua al día y mantén la constancia.'
        });

        const routine = await newRoutine.save();
        user.routine = routine._id;
        await user.save();

        res.status(200).json({ message: 'Routine generated successfully', routine });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get Professionals List
router.get('/professionals', isAuth, async (req, res) => {
    try {
        const pros = await Professional.find({}, 'name specialization');
        res.json(pros);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Request Professional
router.post('/request-professional', isAuth, async (req, res) => {
    try {
        const { proId } = req.body;
        const pro = await Professional.findById(proId);
        if (!pro) return res.status(404).json({ message: 'Professional not found' });

        if (!pro.pendingRequests.includes(req.userId)) {
            pro.pendingRequests.push(req.userId);
            await pro.save();
        }

        res.json({ message: 'Request sent successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Log Daily Progress
router.post('/log-progress', isAuth, async (req, res) => {
    try {
        const { weight, notes, mealsConsumed } = req.body;
        const newProgress = new UserProgress({
            userId: req.userId,
            weight,
            notes,
            mealsConsumed
        });
        await newProgress.save();
        res.status(201).json({ message: 'Progress logged' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
