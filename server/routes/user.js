const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/auth');
const User = require('../models/User');
const Professional = require('../models/Professional');
const Routine = require('../models/Routine');
const UserProgress = require('../models/Progress');
const Message = require('../models/Message');

// Get Profile
router.get('/profile', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('routine');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al obtener el perfil de usuario.' });
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

        res.status(200).json({ message: 'Rutina generada con éxito', routine });
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al generar la rutina.' });
    }
});

// Get Professionals List
router.get('/professionals', isAuth, async (req, res) => {
    try {
        const pros = await Professional.find({}, 'name specialization');
        res.json(pros);
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al cargar la lista de profesionales.' });
    }
});

// Request Professional
router.post('/request-professional', isAuth, async (req, res) => {
    try {
        const { proId } = req.body;
        const pro = await Professional.findById(proId);
        if (!pro) return res.status(404).json({ message: 'Profesional no encontrado' });

        if (!pro.pendingRequests.includes(req.userId)) {
            pro.pendingRequests.push(req.userId);
            await pro.save();
        }

        res.json({ message: 'Solicitud enviada con éxito' });
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al enviar la solicitud al profesional.' });
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
        res.status(201).json({ message: 'Progreso registrado' });
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al registrar el progreso diario.' });
    }
});

// Get Messages
router.get('/messages', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.assignedProfessional) {
            return res.json([]);
        }

        const messages = await Message.find({
            $or: [
                { sender: req.userId, recipient: user.assignedProfessional },
                { sender: user.assignedProfessional, recipient: req.userId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener mensajes' });
    }
});

// Send Message to Professional
router.post('/message', isAuth, async (req, res) => {
    try {
        const { content } = req.body;
        const user = await User.findById(req.userId);

        if (!user.assignedProfessional) {
            return res.status(400).json({ message: 'No tienes un profesional asignado' });
        }

        const message = new Message({
            sender: req.userId,
            senderModel: 'User',
            recipient: user.assignedProfessional,
            recipientModel: 'Professional',
            content
        });

        await message.save();
        res.json({ message: 'Mensaje enviado', data: message });
    } catch (err) {
        res.status(500).json({ message: 'Error al enviar mensaje' });
    }
});

// Save Daily Progress (New simplified endpoint)
router.post('/progress', isAuth, async (req, res) => {
    try {
        const { weight, notes } = req.body;

        if (!weight) {
            return res.status(400).json({ message: 'El peso es requerido' });
        }

        const newProgress = new UserProgress({
            userId: req.userId,
            weight,
            notes: notes || null
        });

        await newProgress.save();

        // Update user's current weight
        await User.findByIdAndUpdate(req.userId, { weight });

        res.status(201).json({ message: 'Progreso registrado exitosamente', progress: newProgress });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al registrar el progreso' });
    }
});

// Get User Progress History
router.get('/progress', isAuth, async (req, res) => {
    try {
        const progress = await UserProgress.find({ userId: req.userId })
            .sort({ date: -1 })
            .limit(30); // Last 30 entries

        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener historial de progreso' });
    }
});

module.exports = router;
