const express = require('express');
const router = express.Router();
const { query } = require('../dbHelper');

// Get all professionals for landing page
router.get('/professionals', async (req, res) => {
    try {
        const pros = await query(`SELECT id, name, specialization, description FROM professionals`);
        res.json(pros || []);
    } catch (err) {
        console.error('[PUBLIC Error professionals]', err);
        res.status(500).json({ message: 'Error en el servidor al cargar la lista pública de profesionales.' });
    }
});

// Get dynamic testimonials from patients who have logged progress
router.get('/testimonials', async (req, res) => {
    try {
        // Fetch patients who have made 2+ progress logs and have a goal set
        const patients = await query(`
            SELECT u.id, u.name, u.profile_picture, u.goal,
                   COUNT(p.id) AS progress_count,
                   MIN(CAST(p.weight AS FLOAT)) AS first_weight,
                   MAX(CAST(p.weight AS FLOAT)) AS latest_weight
            FROM users u
            JOIN progress p ON p.userId = u.id
            WHERE u.goal IS NOT NULL AND u.goal != ''
            GROUP BY u.id, u.name, u.profile_picture, u.goal
            HAVING COUNT(p.id) >= 2
            ORDER BY COUNT(p.id) DESC
            LIMIT 6
        `);

        const result = (patients || []).map(p => ({
            name:          p.name,
            profile_picture: p.profile_picture,
            goal:          p.goal,
            progress_count: p.progress_count,
            weight_change: p.first_weight && p.latest_weight
                ? parseFloat((p.latest_weight - p.first_weight).toFixed(1))
                : null
        }));

        res.json(result);
    } catch (err) {
        console.error('[PUBLIC Error testimonials]', err);
        res.json([]); // Fail gracefully so the frontend can show static fallback
    }
});

// Get public user opinions
router.get('/opinions', async (req, res) => {
    try {
        const opinions = await query(`
            SELECT id, author_name, rating, opinion_text, created_at
            FROM opinions
            ORDER BY created_at DESC
            LIMIT 20
        `);
        res.json(opinions || []);
    } catch (err) {
        console.error('[PUBLIC Error opinions GET]', err);
        res.json([]);
    }
});

// Submit a new user opinion
router.post('/opinions', async (req, res) => {
    try {
        const { author_name, rating, opinion_text } = req.body;
        if (!author_name || !opinion_text) {
            return res.status(400).json({ message: 'Nombre y opinión son requeridos.' });
        }
        const safeRating = Math.min(5, Math.max(1, parseInt(rating) || 5));
        await query(
            `INSERT INTO opinions (author_name, rating, opinion_text) VALUES (?, ?, ?)`,
            [author_name.trim().slice(0, 100), safeRating, opinion_text.trim().slice(0, 1000)]
        );
        res.json({ success: true, message: '¡Gracias por tu opinión!' });
    } catch (err) {
        console.error('[PUBLIC Error opinions POST]', err);
        res.status(500).json({ message: 'Error al guardar la opinión.' });
    }
});


// Avatar Image Proxy to bypass Cross-Origin-Resource-Policy (CORP) restrictions from cloud storage
router.get('/avatar-proxy', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).send('URL de imagen requerida');
        }

        if (!imageUrl.includes('spiderwebargapi.com.ar') && !imageUrl.startsWith('http')) {
            return res.status(400).send('Dominio no permitido');
        }

        const fetchRes = await fetch(imageUrl);
        if (!fetchRes.ok) {
            return res.status(fetchRes.status).send('No se pudo obtener la imagen');
        }

        const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await fetchRes.arrayBuffer());

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.send(buffer);
    } catch (err) {
        console.error('[AVATAR PROXY Error]', err.message);
        return res.status(500).send('Error al obtener la imagen');
    }
});

module.exports = router;
