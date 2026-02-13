const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/auth');
const Professional = require('../models/Professional');
const User = require('../models/User');
const Routine = require('../models/Routine');
const Message = require('../models/Message');

// Get Patients and Requests
router.get('/patients', isAuth, async (req, res) => {
    try {
        const pro = await Professional.findById(req.userId)
            .populate('patients', 'name email')
            .populate('pendingRequests', 'name email');
        res.json(pro);
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al obtener la lista de pacientes y solicitudes.' });
    }
});

// Handle Patient Request
router.post('/handle-request', isAuth, async (req, res) => {
    try {
        const { userId, action } = req.body;
        const pro = await Professional.findById(req.userId);

        if (action === 'accept') {
            pro.patients.push(userId);
            const user = await User.findById(userId);
            user.assignedProfessional = pro._id;
            await user.save();
        }

        pro.pendingRequests = pro.pendingRequests.filter(id => id.toString() !== userId);
        await pro.save();

        res.json({ message: `Solicitud ${action === 'accept' ? 'aceptada' : 'denegada'}` });
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud del paciente.' });
    }
});

// Get Single Patient Details with Routine and Messages
router.get('/patient/:id', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const patient = await User.findById(patientId).select('-password');

        if (!patient) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        // Check if patient belongs to this professional
        const pro = await Professional.findById(req.userId);
        if (!pro.patients.includes(patientId)) {
            return res.status(403).json({ message: 'No tienes permiso para ver este paciente' });
        }

        let routine = null;
        if (patient.routine) {
            routine = await Routine.findById(patient.routine);
        }

        const messages = await Message.find({
            $or: [
                { sender: req.userId, recipient: patientId },
                { sender: patientId, recipient: req.userId }
            ]
        }).sort({ createdAt: 1 });

        res.json({ patient, routine, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener datos del paciente' });
    }
});

// Create or Update Routine
router.post('/patient/:id/routine', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const { meals, recommendations } = req.body;

        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        let routine;
        if (patient.routine) {
            routine = await Routine.findById(patient.routine);
            routine.meals = meals;
            routine.recommendations = recommendations;
            routine.lastUpdated = Date.now();
            await routine.save();
        } else {
            routine = new Routine({
                userId: patientId,
                meals,
                recommendations
            });
            await routine.save();
            patient.routine = routine._id;
            await patient.save();
        }

        res.json({ message: 'Rutina guardada exitosamente', routine });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al guardar la rutina' });
    }
});

// Send Message
router.post('/patient/:id/message', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const { content } = req.body;

        const message = new Message({
            sender: req.userId,
            senderModel: 'Professional',
            recipient: patientId,
            recipientModel: 'User',
            content
        });

        await message.save();
        res.json({ message: 'Mensaje enviado', data: message });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al enviar mensaje' });
    }
});

// Update Professional Profile
router.put('/profile', isAuth, async (req, res) => {
    try {
        const { name, specialization, description, bio, experience, education } = req.body;
        const pro = await Professional.findById(req.userId);

        if (!pro) {
            return res.status(404).json({ message: 'Profesional no encontrado' });
        }

        if (name) pro.name = name;
        if (specialization) pro.specialization = specialization;
        if (description !== undefined) pro.description = description;
        if (bio !== undefined) pro.bio = bio;
        if (experience !== undefined) pro.experience = experience;
        if (education !== undefined) pro.education = education;

        await pro.save();
        res.json({ message: 'Perfil actualizado exitosamente', professional: pro });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar perfil' });
    }
});

// Get Patient Statistics
router.get('/patient/:id/stats', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const Progress = require('../models/Progress');

        // Check if patient belongs to this professional
        const pro = await Professional.findById(req.userId);
        if (!pro.patients.includes(patientId)) {
            return res.status(403).json({ message: 'No tienes permiso para ver este paciente' });
        }

        const patient = await User.findById(patientId).select('-password');
        if (!patient) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        // Get progress history
        const progressHistory = await Progress.find({ userId: patientId })
            .sort({ date: -1 })
            .limit(30); // Last 30 entries

        // Calculate statistics
        const stats = {
            currentWeight: patient.weight,
            initialWeight: progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].weight : patient.weight,
            height: patient.height,
            lifestyle: patient.lifestyle,
            totalEntries: progressHistory.length,
            progressHistory: progressHistory.reverse() // Chronological order
        };

        if (stats.initialWeight && stats.currentWeight) {
            stats.weightChange = stats.currentWeight - stats.initialWeight;
        }

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// Get Patient Progress History
router.get('/patient/:id/progress', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const Progress = require('../models/Progress');

        // Check if patient belongs to this professional
        const pro = await Professional.findById(req.userId);
        if (!pro.patients.includes(patientId)) {
            return res.status(403).json({ message: 'No tienes permiso para ver este paciente' });
        }

        const progress = await Progress.find({ userId: patientId })
            .sort({ date: -1 });

        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener progreso' });
    }
});

module.exports = router;
