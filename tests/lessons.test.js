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
    return { token: res.body.token, user: res.body.user };
}

async function makeCoachAndStudent() {
    const coach = await registerAndLogin({
        username: 'coach1', email: 'coach1@example.com', password: 'password123',
        role: 'coach', hourlyRate: 40
    });
    const student = await registerAndLogin({
        username: 'student1', email: 'student1@example.com', password: 'password123',
        role: 'student'
    });
    return { coach, student };
}

describe('POST /api/lessons/request (student booking)', () => {
    it('lets a student request an open slot with the coach', async () => {
        const { coach, student } = await makeCoachAndStudent();

        const res = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60, topic: 'Openings' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
        expect(res.body.price).toBe(40);
    });

    it('rejects a request from a coach account (students only)', async () => {
        const { coach } = await makeCoachAndStudent();

        const res = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        expect(res.status).toBe(403);
    });

    it('rejects a second request that overlaps the student’s existing lesson', async () => {
        const { coach, student } = await makeCoachAndStudent();

        await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        const res = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:30', duration: 60 });

        expect(res.status).toBe(409);
    });

    it('rejects booking with an unknown coach id', async () => {
        const { student } = await makeCoachAndStudent();
        const fakeCoachId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: fakeCoachId.toString(), date: '2026-10-01', time: '10:00', duration: 60 });

        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/lessons/:id/status (accepting/rejecting requests)', () => {
    it('lets the coach accept a pending request', async () => {
        const { coach, student } = await makeCoachAndStudent();

        const requestRes = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        const res = await request(app)
            .patch(`/api/lessons/${requestRes.body._id}/status`)
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ status: 'scheduled' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('scheduled');
    });

    it('does not let the student accept their own request', async () => {
        const { coach, student } = await makeCoachAndStudent();

        const requestRes = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        const res = await request(app)
            .patch(`/api/lessons/${requestRes.body._id}/status`)
            .set('Authorization', `Bearer ${student.token}`)
            .send({ status: 'scheduled' });

        expect(res.status).toBe(403);
    });

    it('does not let an unrelated user change the lesson status', async () => {
        const { coach, student } = await makeCoachAndStudent();
        const stranger = await registerAndLogin({
            username: 'stranger', email: 'stranger@example.com', password: 'password123', role: 'student'
        });

        const requestRes = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        const res = await request(app)
            .patch(`/api/lessons/${requestRes.body._id}/status`)
            .set('Authorization', `Bearer ${stranger.token}`)
            .send({ status: 'cancelled' });

        expect(res.status).toBe(403);
    });
});

describe('GET /api/lessons', () => {
    it('only returns lessons belonging to the logged-in user', async () => {
        const { coach, student } = await makeCoachAndStudent();
        const otherStudent = await registerAndLogin({
            username: 'student2', email: 'student2@example.com', password: 'password123', role: 'student'
        });

        await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });

        const res = await request(app)
            .get('/api/lessons')
            .set('Authorization', `Bearer ${otherStudent.token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});
