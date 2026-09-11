const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};

const isCoach = (req, res, next) => {
    if (req.user.role !== 'coach') {
        return res.status(403).json({ message: 'Access denied. Coaches only.' });
    }
    next();
};

const isStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Access denied. Students only.' });
    }
    next();
};

module.exports = { auth, isCoach, isStudent }; 