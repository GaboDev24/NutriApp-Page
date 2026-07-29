const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const isAuth = require('../middleware/auth');
const { query, escapeSql, sdk } = require('../dbHelper');
const { upload } = require('../middleware/upload');

// Get Patients and Requests
router.get('/patients', isAuth, async (req, res) => {
    try {
        const pros = await query(`SELECT * FROM professionals WHERE id = ${req.userId}`);
        const pro = pros && pros[0];
        if (!pro) return res.status(404).json({ message: 'Profesional no encontrado' });

        let patientIds = [];
        let pendingIds = [];
        try { patientIds = JSON.parse(pro.patients || '[]'); } catch (_) {}
        try { pendingIds = JSON.parse(pro.pendingRequests || '[]'); } catch (_) {}

        let patientsList = [];
        if (patientIds.length > 0) {
            patientsList = await query(`SELECT id, name, email, weight, height, age, gender, goal, lifestyle, allergies, medical_conditions, phone, profile_picture, routine_id FROM users WHERE id IN (${patientIds.join(',')})`);
        }

        let pendingList = [];
        if (pendingIds.length > 0) {
            pendingList = await query(`SELECT id, name, email FROM users WHERE id IN (${pendingIds.join(',')})`);
        }

        delete pro.password;
        pro.patients = patientsList || [];
        pro.pendingRequests = pendingList || [];

        res.json(pro);
    } catch (err) {
        console.error('[PRO Error patients]', err);
        res.status(500).json({ message: 'Error en el servidor al obtener la lista de pacientes y solicitudes.' });
    }
});

// Handle Patient Request
router.post('/handle-request', isAuth, async (req, res) => {
    try {
        const { userId, action } = req.body;
        const pros = await query(`SELECT * FROM professionals WHERE id = ${req.userId}`);
        const pro = pros && pros[0];
        if (!pro) return res.status(404).json({ message: 'Profesional no encontrado' });

        let patientIds = [];
        let pendingIds = [];
        try { patientIds = JSON.parse(pro.patients || '[]'); } catch (_) {}
        try { pendingIds = JSON.parse(pro.pendingRequests || '[]'); } catch (_) {}

        if (action === 'accept') {
            if (!patientIds.includes(Number(userId))) {
                patientIds.push(Number(userId));
            }
            await query(`UPDATE users SET assignedProfessional = ${req.userId} WHERE id = ${escapeSql(userId)}`);
        }

        pendingIds = pendingIds.filter(id => Number(id) !== Number(userId));

        await query(`UPDATE professionals SET patients = ${escapeSql(JSON.stringify(patientIds))}, pendingRequests = ${escapeSql(JSON.stringify(pendingIds))} WHERE id = ${req.userId}`);

        res.json({ message: `Solicitud ${action === 'accept' ? 'aceptada' : 'denegada'}` });
    } catch (err) {
        console.error('[PRO Error handle-request]', err);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud del paciente.' });
    }
});

// Get Single Patient Details with Routine and Messages
router.get('/patient/:id', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const users = await query(`SELECT id, name, email, height, weight, age, gender, goal, lifestyle, allergies, medical_conditions, phone, profile_picture, routine_id FROM users WHERE id = ${escapeSql(patientId)}`);
        const patient = users && users[0];

        if (!patient) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        const pros = await query(`SELECT patients FROM professionals WHERE id = ${req.userId}`);
        const pro = pros && pros[0];
        let patientIds = [];
        try { patientIds = JSON.parse(pro.patients || '[]'); } catch (_) {}

        if (!patientIds.includes(Number(patientId))) {
            return res.status(403).json({ message: 'No tienes permiso para ver este paciente' });
        }

        let routine = null;
        if (patient.routine_id) {
            const routines = await query(`SELECT * FROM routines WHERE id = ${patient.routine_id}`);
            if (routines && routines[0]) {
                routine = routines[0];
                try { routine.meals = JSON.parse(routine.meals); } catch (_) {}
            }
        }

        const messages = await query(`
            SELECT * FROM messages 
            WHERE (sender = ${req.userId} AND recipient = ${escapeSql(patientId)})
               OR (sender = ${escapeSql(patientId)} AND recipient = ${req.userId})
            ORDER BY createdAt ASC
        `);

        res.json({ patient, routine, messages: messages || [] });
    } catch (err) {
        console.error('[PRO Error patient details]', err);
        res.status(500).json({ message: 'Error al obtener datos del paciente' });
    }
});

// Create or Update Routine for Patient
router.post('/patient/:id/routine', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const { meals, recommendations } = req.body;

        const users = await query(`SELECT * FROM users WHERE id = ${escapeSql(patientId)}`);
        const patient = users && users[0];
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        let routineId = patient.routine_id;
        if (routineId) {
            await query(`UPDATE routines SET meals = ${escapeSql(JSON.stringify(meals))}, recommendations = ${escapeSql(recommendations)}, lastUpdated = CURRENT_TIMESTAMP WHERE id = ${routineId}`);
        } else {
            await query(`INSERT INTO routines (userId, meals, recommendations) VALUES (${escapeSql(patientId)}, ${escapeSql(JSON.stringify(meals))}, ${escapeSql(recommendations)})`);
            const createdRoutines = await query(`SELECT id FROM routines WHERE userId = ${escapeSql(patientId)} ORDER BY id DESC LIMIT 1`);
            routineId = createdRoutines && createdRoutines[0] ? createdRoutines[0].id : null;
            await query(`UPDATE users SET routine_id = ${escapeSql(routineId)} WHERE id = ${escapeSql(patientId)}`);
        }

        res.json({ message: 'Rutina guardada exitosamente', routine: { id: routineId, meals, recommendations } });
    } catch (err) {
        console.error('[PRO Error update routine]', err);
        res.status(500).json({ message: 'Error al guardar la rutina' });
    }
});

// Send Message to Patient
router.post('/patient/:id/message', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const { content } = req.body;

        await query(`
            INSERT INTO messages (sender, senderModel, recipient, recipientModel, content)
            VALUES (${req.userId}, 'Professional', ${escapeSql(patientId)}, 'User', ${escapeSql(content)})
        `);

        res.json({ message: 'Mensaje enviado' });
    } catch (err) {
        console.error('[PRO Error send message]', err);
        res.status(500).json({ message: 'Error al enviar mensaje' });
    }
});

// Update Professional Profile
router.put('/profile', isAuth, async (req, res) => {
    try {
        const { name, specialization, description, bio, experience, education } = req.body;
        const updates = [];
        if (name) updates.push(`name = ${escapeSql(name)}`);
        if (specialization) updates.push(`specialization = ${escapeSql(specialization)}`);
        if (description !== undefined) updates.push(`description = ${escapeSql(description)}`);
        if (bio !== undefined) updates.push(`bio = ${escapeSql(bio)}`);
        if (experience !== undefined) updates.push(`experience = ${escapeSql(experience)}`);
        if (education !== undefined) updates.push(`education = ${escapeSql(education)}`);

        if (updates.length > 0) {
            await query(`UPDATE professionals SET ${updates.join(', ')} WHERE id = ${req.userId}`);
        }

        const pros = await query(`SELECT * FROM professionals WHERE id = ${req.userId}`);
        const pro = pros && pros[0];
        if (pro) delete pro.password;

        res.json({ message: 'Perfil actualizado exitosamente', professional: pro });
    } catch (err) {
        console.error('[PRO Error update profile]', err);
        res.status(500).json({ message: 'Error al actualizar perfil' });
    }
});

// Get Patient Statistics
router.get('/patient/:id/stats', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const users = await query(`SELECT id, name, email, height, weight, age, gender, goal, lifestyle, allergies, medical_conditions, phone FROM users WHERE id = ${escapeSql(patientId)}`);
        const patient = users && users[0];
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });

        const progressHistory = await query(`SELECT * FROM progress WHERE userId = ${escapeSql(patientId)} ORDER BY date DESC LIMIT 30`);

        const stats = {
            currentWeight: patient.weight,
            initialWeight: progressHistory && progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].weight : patient.weight,
            height: patient.height,
            lifestyle: patient.lifestyle,
            totalEntries: progressHistory ? progressHistory.length : 0,
            progressHistory: progressHistory ? progressHistory.reverse() : []
        };

        if (stats.initialWeight && stats.currentWeight) {
            stats.weightChange = stats.currentWeight - stats.initialWeight;
        }

        res.json(stats);
    } catch (err) {
        console.error('[PRO Error stats]', err);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// Get Patient Progress History
router.get('/patient/:id/progress', isAuth, async (req, res) => {
    try {
        const patientId = req.params.id;
        const progress = await query(`SELECT * FROM progress WHERE userId = ${escapeSql(patientId)} ORDER BY date DESC`);
        res.json(progress || []);
    } catch (err) {
        console.error('[PRO Error progress history]', err);
        res.status(500).json({ message: 'Error al obtener progreso' });
    }
});

// Upload Avatar for Professional
router.post('/upload-avatar', isAuth, (req, res) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            if (err.message === 'Request aborted' || err.code === 'ECONNRESET') {
                return res.status(400).json({ message: 'Subida cancelada por el usuario.' });
            }
            console.error('[PRO Avatar Upload Error]', err);
            return res.status(400).json({ message: err.message || 'Error al subir el archivo.' });
        }
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No se recibió ninguna imagen.' });
        }

        try {
            const rawExt = path.extname(req.file.originalname || '').toLowerCase();
            const ext = rawExt || '.jpg';
            const filename = `avatar_pro_${req.userId}_${Date.now()}${ext}`;
            const projectId = process.env.CLOUD_ID || 28;

            let publicUrl = null;

            // 1. Upload to SpiderWeb Cloud Storage
            try {
                console.log(`[PRO AVATAR] Subiendo a SpiderWeb Cloud Storage (proyecto ${projectId})...`);
                const cloudRes = await sdk.storage.uploadFile(
                    projectId,
                    req.file.buffer,
                    filename,
                    req.file.mimetype || 'image/jpeg'
                );

                if (cloudRes && cloudRes.success && Array.isArray(cloudRes.files) && cloudRes.files.length > 0) {
                    let rawUrl = cloudRes.files[0].url;
                    if (rawUrl && rawUrl.startsWith('http://')) {
                        rawUrl = rawUrl.replace('http://', 'https://');
                    }
                    publicUrl = rawUrl;
                    console.log('[PRO AVATAR] Subida exitosa a Cloud Storage:', publicUrl);
                }
            } catch (cloudErr) {
                console.error('[PRO AVATAR Cloud Storage Error]', cloudErr.message || cloudErr);
            }

            // 2. Fallback if Cloud Storage is unavailable
            if (!publicUrl) {
                const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
                if (!isVercel) {
                    const uploadsDir = path.join(__dirname, '../../public/uploads/avatars');
                    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                    const localFilePath = path.join(uploadsDir, filename);
                    fs.writeFileSync(localFilePath, req.file.buffer);
                    publicUrl = `/uploads/avatars/${filename}`;
                } else {
                    const mime = req.file.mimetype || 'image/jpeg';
                    const b64 = req.file.buffer.toString('base64');
                    publicUrl = `data:${mime};base64,${b64}`;
                }
            }

            let finalUrl = publicUrl;
            if (publicUrl && publicUrl.startsWith('http')) {
                finalUrl = `/api/public/avatar-proxy?url=${encodeURIComponent(publicUrl)}`;
            }

            await query(`UPDATE professionals SET profile_picture = ${escapeSql(finalUrl)} WHERE id = ${req.userId}`);
            return res.json({ message: 'Foto de perfil actualizada.', url: finalUrl });
        } catch (dbErr) {
            console.error('[PRO Error upload-avatar]', dbErr);
            return res.status(500).json({ message: 'Error al guardar la foto de perfil.' });
        }
    });
});

module.exports = router;
