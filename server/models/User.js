const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['coach', 'student'],
        required: true
    },
    profile: {
        name: String,
        rating: Number,
        title: String,
        bio: String,
        profileImage: String
    },
    // For coaches
    hourlyRate: {
        type: Number,
        required: function() {
            return this.role === 'coach';
        }
    },
    // For students
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.role === 'student';
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema); 