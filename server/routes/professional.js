const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/auth');
const Professional = require('../models/Professional');
const User = require('../models/User');

// Get Patients and Requests
router.get('/patients', isAuth, async (req, res) => {
    try {
        const pro = await Professional.findById(req.userId)
            .populate('patients', 'name email')
            .populate('pendingRequests', 'name email');
        res.json(pro);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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

        res.json({ message: `Request ${action}ed` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
