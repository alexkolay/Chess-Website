const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dateTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    status: {
        type: String,
        // pending  = student requested, awaiting coach acceptance
        // scheduled = confirmed by coach
        // completed = lesson took place
        // cancelled = rejected or cancelled by either party
        enum: ['pending', 'scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    topic: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    meetingLink: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Lesson', lessonSchema);
