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

module.exports = router;
