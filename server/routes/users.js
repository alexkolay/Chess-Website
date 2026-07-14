const router = require('express').Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get all coaches with student counts (public — no auth required)
router.get('/coaches', async (req, res) => {
    try {
        const coaches = await User.find({ role: 'coach' })
            .select('-password -createdAt')
            .lean();

        // Count students per coach — unwind the coaches array to group by each coach ID
        const studentCounts = await User.aggregate([
            { $match: { role: 'student', coaches: { $exists: true, $ne: [] } } },
            { $unwind: '$coaches' },
            { $group: { _id: '$coaches', count: { $sum: 1 } } }
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

// Add a coach to the student's coaches array (student auth required)
router.post('/add-coach', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can add coaches' });
        }

        const { coachId } = req.body;
        if (!coachId) {
            return res.status(400).json({ message: 'coachId is required' });
        }

        const coach = await User.findById(coachId);
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ message: 'Coach not found' });
        }

        const student = await User.findById(req.user.userId);
        if (student.coaches.some(id => id.toString() === coach._id.toString())) {
            return res.status(400).json({ message: 'You are already working with this coach' });
        }

        student.coaches.push(coach._id);
        await student.save();

        // Return updated coaches list (populated)
        const updated = await User.findById(req.user.userId)
            .populate('coaches', 'username email profile hourlyRate expertise');
        res.json({ message: 'Coach added successfully', coaches: updated.coaches });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update coach profile (hourlyRate and/or FIDE rating) — coach auth required
router.patch('/profile', auth, async (req, res) => {
    try {
        if (req.user.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can update their profile' });
        }
        const { hourlyRate, rating } = req.body;
        const update = {};
        if (hourlyRate !== undefined) {
            const rate = Number(hourlyRate);
            if (isNaN(rate) || rate < 0) return res.status(400).json({ message: 'Invalid hourly rate' });
            update.hourlyRate = rate;
        }
        if (rating !== undefined) {
            const r = Number(rating);
            if (isNaN(r) || r < 0) return res.status(400).json({ message: 'Invalid rating' });
            update['profile.rating'] = r;
        }
        if (!Object.keys(update).length) {
            return res.status(400).json({ message: 'Nothing to update' });
        }
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: update },
            { new: true, select: '-password' }
        );
        res.json({ message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single user by ID (auth required)
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('coaches', 'username profile hourlyRate expertise');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
