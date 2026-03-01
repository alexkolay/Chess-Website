const router = require('express').Router();
const Lesson = require('../models/Lesson');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { auth, isCoach, isStudent } = require('../middleware/auth');

// ── Conflict detection ────────────────────────────────────────────────────────
// Returns the first overlapping lesson for the student, or null.
async function findConflict(studentId, dateTime, durationMinutes, excludeId = null) {
    const newStart = new Date(dateTime);
    const newEnd   = new Date(newStart.getTime() + durationMinutes * 60000);

    const candidates = await Lesson.find({
        student: studentId,
        status: { $in: ['pending', 'scheduled'] },
        dateTime: {
            $gte: new Date(newStart.getTime() - 12 * 3600000), // 12 h look-back window
            $lte: newEnd
        },
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
    });

    // Precise overlap: two intervals overlap when start1 < end2 AND end1 > start2
    return candidates.find(l => {
        const lStart = new Date(l.dateTime);
        const lEnd   = new Date(lStart.getTime() + l.duration * 60000);
        return lStart < newEnd && lEnd > newStart;
    }) || null;
}

// ── GET all lessons for the current user ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const lessons = await Lesson.find({
            $or: [{ coach: req.user.userId }, { student: req.user.userId }]
        })
            .populate('coach student', 'username email profile')
            .sort({ dateTime: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET pending lesson requests for the logged-in coach ───────────────────────
router.get('/pending', [auth, isCoach], async (req, res) => {
    try {
        const lessons = await Lesson.find({
            coach: req.user.userId,
            status: 'pending'
        })
            .populate('student', 'username profile')
            .sort({ dateTime: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST coach creates a lesson directly (status = scheduled) ─────────────────
router.post('/', [auth, isCoach], async (req, res) => {
    try {
        const { student, dateTime, duration, topic, price, notes, meetingLink } = req.body;

        const conflict = await findConflict(student, dateTime, duration);
        if (conflict) {
            return res.status(409).json({
                message: `Student already has a ${conflict.status} lesson at this time`
            });
        }

        const lesson = new Lesson({
            coach: req.user.userId,
            student,
            dateTime,
            duration,
            topic,
            price,
            notes,
            meetingLink,
            status: 'scheduled'
        });
        await lesson.save();

        // Mark the matching schedule slot as booked
        const dateStr = new Date(dateTime).toISOString().slice(0, 10);
        const timeStr = new Date(dateTime).toISOString().slice(11, 16);
        await Schedule.findOneAndUpdate(
            { coach: req.user.userId, 'slots.date': dateStr, 'slots.time': timeStr },
            { $set: { 'slots.$.status': 'booked', 'slots.$.lesson': lesson._id } }
        );

        res.status(201).json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── POST student requests a lesson (status = pending) ─────────────────────────
// Body: { coachId, date "YYYY-MM-DD", time "HH:MM", duration (min), topic, notes }
router.post('/request', [auth, isStudent], async (req, res) => {
    try {
        const { coachId, date, time, duration, topic, notes } = req.body;
        const dur      = Number(duration) || 60;
        const dateTime = new Date(`${date}T${time.slice(0, 5)}:00`);

        if (isNaN(dateTime)) {
            return res.status(400).json({ message: 'Invalid date or time' });
        }

        // Verify the slot is still available in the coach's schedule
        const schedule = await Schedule.findOne({
            coach: coachId,
            slots: { $elemMatch: { date, time: time.slice(0, 5), status: 'available' } }
        });
        if (!schedule) {
            return res.status(409).json({ message: 'That time slot is no longer available' });
        }

        // Check the student has no conflicting lesson across ALL coaches
        const conflict = await findConflict(req.user.userId, dateTime, dur);
        if (conflict) {
            return res.status(409).json({
                message: `You already have a ${conflict.status} lesson at this time`
            });
        }

        const coach = await User.findById(coachId);
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ message: 'Coach not found' });
        }
        const price = Math.round((coach.hourlyRate || 50) * (dur / 60));

        const lesson = new Lesson({
            coach: coachId,
            student: req.user.userId,
            dateTime,
            duration: dur,
            topic: topic || 'General coaching',
            notes,
            price,
            status: 'pending'
        });
        await lesson.save();

        // Lock the slot so no other student can request the same time
        await Schedule.findOneAndUpdate(
            {
                coach: coachId,
                'slots.date': date,
                'slots.time': time.slice(0, 5),
                'slots.status': 'available'
            },
            { $set: { 'slots.$.status': 'booked', 'slots.$.lesson': lesson._id } }
        );

        res.status(201).json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── PATCH update lesson status ────────────────────────────────────────────────
// Coach accepts (pending→scheduled) or either party cancels.
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        const actingAsCoach   = lesson.coach.toString()   === req.user.userId;
        const actingAsStudent = lesson.student.toString() === req.user.userId;

        if (!actingAsCoach && !actingAsStudent) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (status === 'scheduled' && !actingAsCoach) {
            return res.status(403).json({ message: 'Only the coach can accept lesson requests' });
        }

        // Re-check for conflicts when the coach accepts — another coach could have
        // booked this student in the time since the request was made.
        if (status === 'scheduled' && lesson.status === 'pending') {
            const conflict = await findConflict(
                lesson.student, lesson.dateTime, lesson.duration, lesson._id
            );
            if (conflict) {
                return res.status(409).json({
                    message: 'Student now has a conflicting lesson at this time'
                });
            }
        }

        lesson.status = status;
        await lesson.save();

        // When cancelled, free the schedule slot back to available
        if (status === 'cancelled') {
            await Schedule.findOneAndUpdate(
                { coach: lesson.coach, 'slots.lesson': lesson._id },
                { $set: { 'slots.$.status': 'available', 'slots.$.lesson': null, 'slots.$.studentName': null } }
            );
        }

        res.json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── DELETE a lesson (coach only) ──────────────────────────────────────────────
router.delete('/:id', [auth, isCoach], async (req, res) => {
    try {
        const lesson = await Lesson.findOneAndDelete({
            _id: req.params.id,
            coach: req.user.userId
        });
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        // Free the schedule slot
        await Schedule.findOneAndUpdate(
            { coach: req.user.userId, 'slots.lesson': lesson._id },
            { $set: { 'slots.$.status': 'available', 'slots.$.lesson': null, 'slots.$.studentName': null } }
        );

        res.json({ message: 'Lesson deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
