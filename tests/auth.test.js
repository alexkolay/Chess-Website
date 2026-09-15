const request = require('supertest');
const { app, mongoose, clearDB, closeDB } = require('./setup');

beforeAll(async () => {
    await mongoose.connection.asPromise();
});

afterEach(async () => {
    await clearDB();
});

afterAll(async () => {
    await closeDB();
});

const student = {
    username: 'student1',
    email: 'student1@example.com',
    password: 'password123',
    role: 'student'
};

const coach = {
    username: 'coach1',
    email: 'coach1@example.com',
    password: 'password123',
    role: 'coach',
    hourlyRate: 40
};

describe('POST /api/auth/register', () => {
    it('creates a new student and returns a token', async () => {
        const res = await request(app).post('/api/auth/register').send(student);
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.username).toBe(student.username);
        expect(res.body.user.role).toBe('student');
    });

    it('creates a new coach with a hourly rate', async () => {
        const res = await request(app).post('/api/auth/register').send(coach);
        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('coach');
    });

    it('rejects a duplicate username', async () => {
        await request(app).post('/api/auth/register').send(student);
        const res = await request(app).post('/api/auth/register').send({ ...student, email: 'different@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/username/i);
    });

    it('rejects a duplicate email', async () => {
        await request(app).post('/api/auth/register').send(student);
        const res = await request(app).post('/api/auth/register').send({ ...student, username: 'different' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email/i);
    });

    it('rejects an invalid email address', async () => {
        const res = await request(app).post('/api/auth/register').send({ ...student, email: 'not-an-email' });
        expect(res.status).toBe(400);
    });

    it('rejects a registration missing required fields', async () => {
        const res = await request(app).post('/api/auth/register').send({ username: 'onlyusername' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(student);
    });

    it('logs in with the correct username and password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            username: student.username,
            password: student.password
        });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('logs in with email instead of username', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: student.email,
            password: student.password
        });
        expect(res.status).toBe(200);
    });

    it('rejects the wrong password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            username: student.username,
            password: 'wrong-password'
        });
        expect(res.status).toBe(400);
    });

    it('rejects a username that does not exist', async () => {
        const res = await request(app).post('/api/auth/login').send({
            username: 'nobody',
            password: 'password123'
        });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/auth/me', () => {
    it('rejects a request with no token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('rejects a garbage token', async () => {
        const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
        expect(res.status).toBe(401);
    });

    it('returns the logged-in user for a valid token', async () => {
        const registerRes = await request(app).post('/api/auth/register').send(student);
        const token = registerRes.body.token;

        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.username).toBe(student.username);
        expect(res.body.password).toBeUndefined();
    });
});
