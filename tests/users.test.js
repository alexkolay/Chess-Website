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

async function registerAndLogin(overrides) {
    const res = await request(app).post('/api/auth/register').send(overrides);
    return { token: res.body.token, user: res.body.user, status: res.status, body: res.body };
}

describe('GET /api/users/coaches (public directory)', () => {
    it('works with no auth token at all', async () => {
        const res = await request(app).get('/api/users/coaches');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('lists a registered coach with their rate and specialization', async () => {
        await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123',
            role: 'coach', hourlyRate: 65, specialization: 'Openings, Endgames'
        });

        const res = await request(app).get('/api/users/coaches');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].username).toBe('coach1');
        expect(res.body[0].hourlyRate).toBe(65);
        expect(res.body[0].expertise).toEqual(['Openings', 'Endgames']);
    });

    it('accepts expertise as an array instead of a comma-separated string', async () => {
        await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123',
            role: 'coach', expertise: ['Tactics', 'Middlegame']
        });

        const res = await request(app).get('/api/users/coaches');
        expect(res.body[0].expertise).toEqual(['Tactics', 'Middlegame']);
    });

    it('does not list students', async () => {
        await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        const res = await request(app).get('/api/users/coaches');
        expect(res.body).toEqual([]);
    });

    it('reports how many students have added each coach', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        // one student links to the coach at registration time
        await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123',
            role: 'student', coachUsername: 'coach1'
        });

        // a second student links via the add-coach endpoint after the fact
        const student2 = await registerAndLogin({
            username: 'student2', email: 'student2@example.com', password: 'password123', role: 'student'
        });
        await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${student2.token}`)
            .send({ coachId: coach.user.id });

        const res = await request(app).get('/api/users/coaches');
        expect(res.body[0].studentCount).toBe(2);
    });
});

describe('GET /api/users/students (coach roster)', () => {
    it('lists only students linked to the logged-in coach', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });
        const otherCoach = await registerAndLogin({
            username: 'coach2', email: 'coach2@example.com', password: 'password123', role: 'coach'
        });
        await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123',
            role: 'student', coachUsername: 'coach1'
        });
        await registerAndLogin({
            username: 'student2', email: 'student2@example.com', password: 'password123',
            role: 'student', coachUsername: 'coach2'
        });

        const res = await request(app)
            .get('/api/users/students')
            .set('Authorization', `Bearer ${coach.token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].username).toBe('student1');
        expect(res.body[0].password).toBeUndefined();

        const otherRes = await request(app)
            .get('/api/users/students')
            .set('Authorization', `Bearer ${otherCoach.token}`);
        expect(otherRes.body).toHaveLength(1);
        expect(otherRes.body[0].username).toBe('student2');
    });

    it('rejects a student trying to fetch a roster', async () => {
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        const res = await request(app)
            .get('/api/users/students')
            .set('Authorization', `Bearer ${student.token}`);

        expect(res.status).toBe(403);
    });

    it('returns an empty list for a coach with no students yet', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .get('/api/users/students')
            .set('Authorization', `Bearer ${coach.token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('POST /api/users/add-coach', () => {
    it('lets a student add a coach', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        const res = await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id });

        expect(res.status).toBe(200);
        expect(res.body.coaches).toHaveLength(1);
    });

    it('rejects adding the same coach twice', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id });

        const res = await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id });

        expect(res.status).toBe(400);
    });

    it('rejects a coach trying to add another coach', async () => {
        const coachA = await registerAndLogin({
            username: 'coachA', email: 'coachA@example.com', password: 'password123', role: 'coach'
        });
        const coachB = await registerAndLogin({
            username: 'coachB', email: 'coachB@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${coachA.token}`)
            .send({ coachId: coachB.user.id });

        expect(res.status).toBe(403);
    });

    it('404s on a coachId that does not exist', async () => {
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post('/api/users/add-coach')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: fakeId.toString() });

        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/users/profile (rating & hourly rate)', () => {
    it('lets a coach set their FIDE rating', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .patch('/api/users/profile')
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ rating: 2200 });

        expect(res.status).toBe(200);
        expect(res.body.user.profile.rating).toBe(2200);
    });

    it('rejects a negative or non-numeric rating', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .patch('/api/users/profile')
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ rating: 'not-a-number' });

        expect(res.status).toBe(400);
    });

    it('blocks a student from updating a coach profile field', async () => {
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        const res = await request(app)
            .patch('/api/users/profile')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ rating: 2200 });

        expect(res.status).toBe(403);
    });
});
