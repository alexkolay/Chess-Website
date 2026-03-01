const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '7d';

function buildUserResponse(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        hourlyRate: user.hourlyRate,
        expertise: user.expertise,
        coaches: user.coaches || []
    };
}

// Register
router.post('/register', async (req, res) => {
    try {
        const {
            username, email, password, role,
            name, title, specialization, expertise,
            rating, coachUsername, hourlyRate
        } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'Username, email, password and role are required' });
        }

        // Check for duplicates
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'Email' : 'Username';
            return res.status(400).json({ message: `${field} already in use` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            username,
            email,
            password: hashedPassword,
            role,
            profile: {
                name: name || username,
                rating: rating ? Number(rating) : undefined,
                title: title || undefined
            }
        };

        if (role === 'coach') {
            userData.hourlyRate = hourlyRate ? Number(hourlyRate) : 50;
            // Accept expertise as array or comma-separated string from specialization
            if (expertise) {
                userData.expertise = Array.isArray(expertise) ? expertise : [expertise];
            } else if (specialization) {
                userData.expertise = specialization.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        if (role === 'student' && coachUsername) {
            const coach = await User.findOne({ username: coachUsername, role: 'coach' });
            if (!coach) {
                return res.status(400).json({ message: 'Coach not found' });
            }
            userData.coaches = [coach._id];
        }

        const user = new User(userData);
        await user.save();

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        res.status(201).json({ token, user: buildUserResponse(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login — accepts username OR email
router.post('/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!password || (!username && !email)) {
            return res.status(400).json({ message: 'Credentials required' });
        }

        const query = username ? { username } : { email };
        const user = await User.findOne(query).populate('coaches', 'username profile hourlyRate expertise');

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        res.json({ token, user: buildUserResponse(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get current logged-in user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('coaches', 'username profile hourlyRate expertise');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update password (replaces the localStorage-only reset flow)
router.post('/reset-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) {
            return res.status(400).json({ message: 'Username and new password required' });
        }
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Username not found' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
