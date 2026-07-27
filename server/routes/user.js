const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const isAuth = require('../middleware/auth');
const { query, escapeSql } = require('../dbHelper');
const { upload } = require('../middleware/upload');

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

// Setup / Update Patient Profile (NO auto-routine generation)
router.post('/setup-profile', isAuth, async (req, res) => {
    try {
        const { height, weight, age, gender, goal, lifestyle, allergies, medical_conditions, phone, profile_picture } = req.body;

        const setClauses = [];
        if (height !== undefined) setClauses.push(`height = ${escapeSql(height)}`);
        if (weight !== undefined) setClauses.push(`weight = ${escapeSql(weight)}`);
        if (age !== undefined) setClauses.push(`age = ${escapeSql(age)}`);
        if (gender !== undefined) setClauses.push(`gender = ${escapeSql(gender)}`);
        if (goal !== undefined) setClauses.push(`goal = ${escapeSql(goal)}`);
        if (lifestyle !== undefined) setClauses.push(`lifestyle = ${escapeSql(lifestyle)}`);
        if (allergies !== undefined) setClauses.push(`allergies = ${escapeSql(allergies)}`);
        if (medical_conditions !== undefined) setClauses.push(`medical_conditions = ${escapeSql(medical_conditions)}`);
        if (phone !== undefined) setClauses.push(`phone = ${escapeSql(phone)}`);
        if (profile_picture !== undefined) setClauses.push(`profile_picture = ${escapeSql(profile_picture)}`);

        if (setClauses.length > 0) {
            await query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ${req.userId}`);
        }

        res.status(200).json({ message: 'Perfil guardado. Tu nutricionista creará tu rutina personalizada.' });
    } catch (err) {
        console.error('[USER Error setup-profile]', err);
        res.status(500).json({ message: 'Error en el servidor al guardar el perfil.' });
    }
});

// Legacy endpoint — kept for backward compat but no longer auto-generates routine
router.post('/setup-routine', isAuth, async (req, res) => {
    try {
        const { height, weight, lifestyle } = req.body;
        const setClauses = [];
        if (height) setClauses.push(`height = ${escapeSql(height)}`);
        if (weight) setClauses.push(`weight = ${escapeSql(weight)}`);
        if (lifestyle) setClauses.push(`lifestyle = ${escapeSql(lifestyle)}`);
        if (setClauses.length > 0) {
            await query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ${req.userId}`);
        }
        res.status(200).json({ message: 'Perfil guardado. Tu nutricionista creará tu rutina personalizada.' });
    } catch (err) {
        console.error('[USER Error setup-routine]', err);
        res.status(500).json({ message: 'Error en el servidor al guardar el perfil.' });
    }
});

// Get Professionals List
router.get('/professionals', isAuth, async (req, res) => {
    try {
        const pros = await query(`SELECT id, name, specialization, description, experience FROM professionals`);
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

// Save Daily Progress
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

// Upload Avatar for Patient
router.post('/upload-avatar', isAuth, (req, res) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            if (err.message === 'Request aborted' || err.code === 'ECONNRESET') {
                return res.status(400).json({ message: 'Subida cancelada por el usuario.' });
            }
            console.error('[USER Avatar Upload Error]', err);
            return res.status(400).json({ message: err.message || 'Error al subir el archivo.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibio ninguna imagen.' });
        }

        try {
            // Delete old avatar if it's a local file
            const users = await query(`SELECT profile_picture FROM users WHERE id = ${req.userId}`);
            const oldPic = users && users[0] && users[0].profile_picture;
            if (oldPic && oldPic.startsWith('/uploads/avatars/')) {
                const oldPath = path.join(__dirname, '../../public', oldPic);
                try {
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                } catch (unlinkErr) {
                    console.warn('[Avatar Cleanup Warning]', unlinkErr.message);
                }
            }

            const publicUrl = `/uploads/avatars/${req.file.filename}`;
            await query(`UPDATE users SET profile_picture = ${escapeSql(publicUrl)} WHERE id = ${req.userId}`);
            return res.json({ message: 'Foto de perfil actualizada.', url: publicUrl });
        } catch (dbErr) {
            console.error('[USER Error upload-avatar]', dbErr);
            return res.status(500).json({ message: 'Error al guardar la foto de perfil.' });
        }
    });
});

module.exports = router;
