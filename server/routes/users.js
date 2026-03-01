const router = require('express').Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get all coaches with student counts (public — no auth required)
router.get('/coaches', async (req, res) => {
    try {
        const coaches = await User.find({ role: 'coach' })
            .select('-password -createdAt')
            .lean();

        // Count students per coach in one aggregation query
        const studentCounts = await User.aggregate([
            { $match: { role: 'student', coach: { $exists: true, $ne: null } } },
            { $group: { _id: '$coach', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        studentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

        const result = coaches.map(coach => ({
            ...coach,
            studentCount: countMap[coach._id.toString()] || 0
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single user by ID (auth required)
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('coach', 'username profile hourlyRate expertise');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
