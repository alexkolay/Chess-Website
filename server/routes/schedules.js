const router = require('express').Router();
const Schedule = require('../models/Schedule');
const { auth, isCoach } = require('../middleware/auth');

// Get a coach's full schedule (coach sees their own, or anyone can fetch for student booking view)
router.get('/coach/:coachId', auth, async (req, res) => {
    try {
        let schedule = await Schedule.findOne({ coach: req.params.coachId });
        if (!schedule) {
            // Return sensible defaults when no schedule has been saved yet
            return res.json({
                coach: req.params.coachId,
                settings: { startTime: '09:00', endTime: '17:00', timeIncrement: 60, availableDays: [1, 2, 3, 4, 5] },
                slots: []
            });
        }
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Save / overwrite a coach's schedule (coach only, must be their own)
router.put('/coach/:coachId', [auth, isCoach], async (req, res) => {
    try {
        if (req.user.userId !== req.params.coachId) {
            return res.status(403).json({ message: 'You can only update your own schedule' });
        }

        const { settings, slots } = req.body;

        const schedule = await Schedule.findOneAndUpdate(
            { coach: req.params.coachId },
            { $set: { settings, slots, updatedAt: new Date() } },
            { new: true, upsert: true, runValidators: true }
        );

        res.json(schedule);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get only available slots for a coach (used by students when booking)
router.get('/available/:coachId', auth, async (req, res) => {
    try {
        const schedule = await Schedule.findOne({ coach: req.params.coachId });
        if (!schedule) return res.json({ settings: null, slots: [] });

        const availableSlots = schedule.slots.filter(s => s.status === 'available');
        res.json({ settings: schedule.settings, slots: availableSlots });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
