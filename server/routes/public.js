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

module.exports = router;
