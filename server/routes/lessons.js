const router = require('express').Router();
const Lesson = require('../models/Lesson');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { auth, isCoach, isStudent } = require('../middleware/auth');

const CONFLICT_LOOKBACK_MS = 12 * 3600000;

async function findConflict(filter, dateTime, durationMinutes, excludeId = null) {
    const newStart = new Date(dateTime);
    const newEnd   = new Date(newStart.getTime() + durationMinutes * 60000);

    const candidates = await Lesson.find({
        ...filter,
        dateTime: {
            $gte: new Date(newStart.getTime() - CONFLICT_LOOKBACK_MS),
            $lte: newEnd
        },
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
    });

    return candidates.find(existingLesson => {
        const existingStart = new Date(existingLesson.dateTime);
        const existingEnd   = new Date(existingStart.getTime() + existingLesson.duration * 60000);
        return existingStart < newEnd && existingEnd > newStart;
    }) || null;
}

function studentConflictFilter(studentId) {
    return { student: studentId, status: { $in: ['pending', 'scheduled'] } };
}

function coachConflictFilter(coachId) {
    return { coach: coachId, status: 'scheduled' };
}

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

router.post('/', [auth, isCoach], async (req, res) => {
    try {
        const { student, dateTime, duration, topic, price, notes, meetingLink } = req.body;

        const conflict = await findConflict(studentConflictFilter(student), dateTime, duration);
        if (conflict) {
            return res.status(409).json({
                message: `Student already has a ${conflict.status} lesson at this time`
            });
        }

        const coachConflict = await findConflict(coachConflictFilter(req.user.userId), dateTime, duration);
        if (coachConflict) {
            return res.status(409).json({
                message: 'You already have a lesson scheduled at this time'
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

        const dateStr = new Date(dateTime).toISOString().slice(0, 10);
        const timeStr = new Date(dateTime).toISOString().slice(11, 16);
        await Schedule.findOneAndUpdate(
            { coach: req.user.userId, slots: { $elemMatch: { date: dateStr, time: timeStr } } },
            { $set: { 'slots.$.status': 'booked', 'slots.$.lesson': lesson._id } }
        );

        res.status(201).json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/request', [auth, isStudent], async (req, res) => {
    try {
        const { coachId, date, time, duration, topic, notes } = req.body;
        const durationMinutes = Number(duration) || 60;
        const dateTime = new Date(`${date}T${time.slice(0, 5)}:00`);

        if (isNaN(dateTime)) {
            return res.status(400).json({ message: 'Invalid date or time' });
        }

        const conflict = await findConflict(studentConflictFilter(req.user.userId), dateTime, durationMinutes);
        if (conflict) {
            return res.status(409).json({
                message: `You already have a ${conflict.status} lesson at this time`
            });
        }

        const coach = await User.findById(coachId);
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ message: 'Coach not found' });
        }
        const price = Math.round((coach.hourlyRate || 50) * (durationMinutes / 60));

        const lesson = new Lesson({
            coach: coachId,
            student: req.user.userId,
            dateTime,
            duration: durationMinutes,
            topic: topic || 'General coaching',
            notes,
            price,
            status: 'pending'
        });
        await lesson.save();

        await Schedule.findOneAndUpdate(
            {
                coach: coachId,
                slots: { $elemMatch: { date, time: time.slice(0, 5), status: 'available' } }
            },
            { $set: { 'slots.$.status': 'booked', 'slots.$.lesson': lesson._id } }
        );

        res.status(201).json(lesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

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

        if (status === 'scheduled' && lesson.status === 'pending') {
            const studentConflict = await findConflict(
                studentConflictFilter(lesson.student), lesson.dateTime, lesson.duration, lesson._id
            );
            if (studentConflict) {
                return res.status(409).json({
                    message: 'Student now has a conflicting lesson at this time'
                });
            }

            const coachConflict = await findConflict(
                coachConflictFilter(lesson.coach), lesson.dateTime, lesson.duration, lesson._id
            );
            if (coachConflict) {
                return res.status(409).json({
                    message: 'You already have a lesson scheduled at this time'
                });
            }
        }

        lesson.status = status;
        await lesson.save();

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

router.delete('/:id', [auth, isCoach], async (req, res) => {
    try {
        const lesson = await Lesson.findOneAndDelete({
            _id: req.params.id,
            coach: req.user.userId
        });
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

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
