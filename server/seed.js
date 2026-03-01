/**
 * Seed script — run once to create the default coach account in MongoDB.
 * Usage: node server/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/chess-coaching';

async function seed() {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ username: 'chessboss2020' });
    if (existing) {
        console.log('Default coach account already exists — skipping.');
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('FideMaster2022!', 10);

    await User.create({
        username:   'chessboss2020',
        email:      'alex@chesscoaching.com',
        password:   hashedPassword,
        role:       'coach',
        hourlyRate: 50,
        expertise:  ['Opening Preparation', 'Endgame Technique'],
        profile: {
            name:   'Alex Kolay',
            title:  'FIDE Master',
            rating: 2300,
            bio:    'FIDE Master with extensive tournament experience. Specialising in openings and endgames.'
        }
    });

    console.log('Default coach account created: username=chessboss2020');
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
