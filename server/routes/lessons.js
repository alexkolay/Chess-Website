const router = require('express').Router();
const Lesson = require('../models/Lesson');
const { auth, isCoach } = require('../middleware/auth');

// Get all lessons for a user (coach or student)
router.get('/', auth, async (req, res) => {
    try {
        const lessons = await Lesson.find({
            $or: [
                { coach: req.user.userId },
                { student: req.user.userId }
            ]
        }).populate('coach student', 'username email profile');
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new lesson (coach only)
router.post('/', [auth, isCoach], async (req, res) => {
    try {
        const { student, dateTime, duration, topic, price } = req.body;
        const lesson = new Lesson({
            coach: req.user.userId,
            student,
            dateTime,
            duration,
            topic,
            price
        });
        await lesson.save();
        res.status(201).json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update lesson status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const lesson = await Lesson.findById(req.params.id);
        
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        if (lesson.coach.toString() !== req.user.userId && 
            lesson.student.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        lesson.status = status;
        await lesson.save();
        res.json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a lesson (coach only)
router.delete('/:id', [auth, isCoach], async (req, res) => {
    try {
        const lesson = await Lesson.findOneAndDelete({
            _id: req.params.id,
            coach: req.user.userId
        });
        
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        
        res.json({ message: 'Lesson deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 