process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/chess-coaching-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';
process.env.PORT = '0';

const mongoose = require('mongoose');
const app = require('../server/index');

async function clearDB() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

async function closeDB() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
}

module.exports = { app, mongoose, clearDB, closeDB };
