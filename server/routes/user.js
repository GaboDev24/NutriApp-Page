const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/auth');
const { query, escapeSql } = require('../dbHelper');

// Get Profile
router.get('/profile', isAuth, async (req, res) => {
    try {
        const users = await query(`SELECT * FROM users WHERE id = ${req.userId}`);
        const user = users && users[0];
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        let routine = null;
        if (user.routine_id) {
            const routines = await query(`SELECT * FROM routines WHERE id = ${user.routine_id}`);
            if (routines && routines[0]) {
                routine = routines[0];
                if (typeof routine.meals === 'string') {
                    try { routine.meals = JSON.parse(routine.meals); } catch (_) {}
                }
            }
        }

        delete user.password;
        user.routine = routine;
        res.json(user);
    } catch (err) {
        console.error('[USER Error profile]', err);
        res.status(500).json({ message: 'Error en el servidor al obtener el perfil de usuario.' });
    }
});

// Setup Routine Onboarding
router.post('/setup-routine', isAuth, async (req, res) => {
    try {
        const { height, weight, lifestyle } = req.body;

        const meals = [
            { time: 'Desayuno', description: 'Avena con frutas y yogur', calories: 400 },
            { time: 'Almuerzo', description: 'Pechuga de pollo con arroz integral y brócoli', calories: 600 },
            { time: 'Merienda', description: 'Un puñado de frutos secos y una manzana', calories: 200 },
            { time: 'Cena', description: 'Salmón a la plancha con ensalada verde', calories: 500 }
        ];
        const recommendations = 'Bebe al menos 2 litros de agua al día y mantén la constancia.';

        const insertRoutineSql = `INSERT INTO routines (userId, meals, recommendations) VALUES (${req.userId}, ${escapeSql(JSON.stringify(meals))}, ${escapeSql(recommendations)})`;
        const routineRes = await query(insertRoutineSql);

        const newRoutines = await query(`SELECT id FROM routines WHERE userId = ${req.userId} ORDER BY id DESC LIMIT 1`);
        const routineId = newRoutines && newRoutines[0] ? newRoutines[0].id : null;

        await query(`UPDATE users SET height = ${escapeSql(height)}, weight = ${escapeSql(weight)}, lifestyle = ${escapeSql(lifestyle)}, routine_id = ${escapeSql(routineId)} WHERE id = ${req.userId}`);

        res.status(200).json({
            message: 'Rutina generada con éxito',
            routine: { id: routineId, userId: req.userId, meals, recommendations }
        });
    } catch (err) {
        console.error('[USER Error setup-routine]', err);
        res.status(500).json({ message: 'Error en el servidor al generar la rutina.' });
    }
});

// Get Professionals List
router.get('/professionals', isAuth, async (req, res) => {
    try {
        const pros = await query(`SELECT id, name, specialization, description FROM professionals`);
        res.json(pros || []);
    } catch (err) {
        console.error('[USER Error professionals]', err);
        res.status(500).json({ message: 'Error en el servidor al cargar la lista de profesionales.' });
    }
});

// Request Professional
router.post('/request-professional', isAuth, async (req, res) => {
    try {
        const { proId } = req.body;
        const pros = await query(`SELECT * FROM professionals WHERE id = ${escapeSql(proId)}`);
        const pro = pros && pros[0];
        if (!pro) return res.status(404).json({ message: 'Profesional no encontrado' });

        let pendingRequests = [];
        if (pro.pendingRequests) {
            try { pendingRequests = JSON.parse(pro.pendingRequests); } catch (_) {
                pendingRequests = pro.pendingRequests.split(',').filter(Boolean);
            }
        }

        if (!pendingRequests.includes(req.userId) && !pendingRequests.includes(String(req.userId))) {
            pendingRequests.push(req.userId);
            await query(`UPDATE professionals SET pendingRequests = ${escapeSql(JSON.stringify(pendingRequests))} WHERE id = ${pro.id}`);
        }

        res.json({ message: 'Solicitud enviada con éxito' });
    } catch (err) {
        console.error('[USER Error request-professional]', err);
        res.status(500).json({ message: 'Error en el servidor al enviar la solicitud al profesional.' });
    }
});

// Log Daily Progress
router.post('/log-progress', isAuth, async (req, res) => {
    try {
        const { weight, notes, mealsConsumed } = req.body;
        await query(`INSERT INTO progress (userId, weight, notes, mealsConsumed) VALUES (${req.userId}, ${escapeSql(weight)}, ${escapeSql(notes || '')}, ${escapeSql(JSON.stringify(mealsConsumed || []))})`);
        res.status(201).json({ message: 'Progreso registrado' });
    } catch (err) {
        console.error('[USER Error log-progress]', err);
        res.status(500).json({ message: 'Error en el servidor al registrar el progreso diario.' });
    }
});

// Get Messages
router.get('/messages', isAuth, async (req, res) => {
    try {
        const users = await query(`SELECT assignedProfessional FROM users WHERE id = ${req.userId}`);
        const user = users && users[0];
        if (!user || !user.assignedProfessional) {
            return res.json([]);
        }

        const messages = await query(`
            SELECT * FROM messages 
            WHERE (sender = ${req.userId} AND recipient = ${user.assignedProfessional})
               OR (sender = ${user.assignedProfessional} AND recipient = ${req.userId})
            ORDER BY createdAt ASC
        `);

        res.json(messages || []);
    } catch (err) {
        console.error('[USER Error get messages]', err);
        res.status(500).json({ message: 'Error al obtener mensajes' });
    }
});

// Send Message to Professional
router.post('/message', isAuth, async (req, res) => {
    try {
        const { content } = req.body;
        const users = await query(`SELECT assignedProfessional FROM users WHERE id = ${req.userId}`);
        const user = users && users[0];

        if (!user || !user.assignedProfessional) {
            return res.status(400).json({ message: 'No tienes un profesional asignado' });
        }

        await query(`
            INSERT INTO messages (sender, senderModel, recipient, recipientModel, content)
            VALUES (${req.userId}, 'User', ${user.assignedProfessional}, 'Professional', ${escapeSql(content)})
        `);

        res.json({ message: 'Mensaje enviado' });
    } catch (err) {
        console.error('[USER Error send message]', err);
        res.status(500).json({ message: 'Error al enviar mensaje' });
    }
});

// Save Daily Progress (Simplified endpoint)
router.post('/progress', isAuth, async (req, res) => {
    try {
        const { weight, notes } = req.body;

        if (!weight) {
            return res.status(400).json({ message: 'El peso es requerido' });
        }

        await query(`INSERT INTO progress (userId, weight, notes) VALUES (${req.userId}, ${escapeSql(weight)}, ${escapeSql(notes || null)})`);
        await query(`UPDATE users SET weight = ${escapeSql(weight)} WHERE id = ${req.userId}`);

        res.status(201).json({ message: 'Progreso registrado exitosamente' });
    } catch (err) {
        console.error('[USER Error progress]', err);
        res.status(500).json({ message: 'Error al registrar el progreso' });
    }
});

// Get User Progress History
router.get('/progress', isAuth, async (req, res) => {
    try {
        const progress = await query(`SELECT * FROM progress WHERE userId = ${req.userId} ORDER BY date DESC LIMIT 30`);
        res.json(progress || []);
    } catch (err) {
        console.error('[USER Error get progress]', err);
        res.status(500).json({ message: 'Error al obtener historial de progreso' });
    }
});

module.exports = router;
