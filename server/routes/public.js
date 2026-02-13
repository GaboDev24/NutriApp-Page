const express = require('express');
const router = express.Router();
const Professional = require('../models/Professional');

// Get all professionals for landing page
router.get('/professionals', async (req, res) => {
    try {
        const pros = await Professional.find({}, 'name specialization description');
        res.json(pros);
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al cargar la lista pública de profesionales.' });
    }
});

module.exports = router;
