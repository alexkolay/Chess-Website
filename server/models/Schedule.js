const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM
    status: {
        type: String,
        enum: ['available', 'booked', 'unavailable'],
        default: 'available'
    },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    studentName: { type: String }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    settings: {
        startTime: { type: String, default: '09:00' },
        endTime:   { type: String, default: '17:00' },
        timeIncrement: { type: Number, default: 60 }, // minutes
        availableDays: { type: [Number], default: [1, 2, 3, 4, 5] } // 1=Mon … 5=Fri
    },
    slots: [slotSchema],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
