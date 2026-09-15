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

describe('coach-side conflicts (two students, one coach, overlapping times)', () => {
    it('lets the coach accept the first request but rejects accepting a second one that overlaps it', async () => {
        const { coach, student } = await makeCoachAndStudent();
        const student2 = await registerAndLogin({
            username: 'student2', email: 'student2@example.com', password: 'password123', role: 'student'
        });

        // Both students request the same coach for overlapping times. Requesting doesn't
        // check the coach's calendar (only the student's), so both stay pending.
        const req1 = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:00', duration: 60 });
        const req2 = await request(app)
            .post('/api/lessons/request')
            .set('Authorization', `Bearer ${student2.token}`)
            .send({ coachId: coach.user.id, date: '2026-10-01', time: '10:30', duration: 60 });

        expect(req1.status).toBe(201);
        expect(req2.status).toBe(201);

        const accept1 = await request(app)
            .patch(`/api/lessons/${req1.body._id}/status`)
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ status: 'scheduled' });
        expect(accept1.status).toBe(200);

        // Accepting the second one would double-book the coach at 10:30.
        const accept2 = await request(app)
            .patch(`/api/lessons/${req2.body._id}/status`)
            .set('Authorization', `Bearer ${coach.token}`)
            .send({ status: 'scheduled' });
        expect(accept2.status).toBe(409);
    });

    it('rejects a coach directly booking a lesson that overlaps one they already have scheduled', async () => {
        const { coach, student } = await makeCoachAndStudent();
        const student2 = await registerAndLogin({
            username: 'student2', email: 'student2@example.com', password: 'password123', role: 'student'
        });

        const first = await request(app)
            .post('/api/lessons')
            .set('Authorization', `Bearer ${coach.token}`)
            .send({
                student: student.user.id, dateTime: '2026-10-01T10:00:00.000Z',
                duration: 60, topic: 'Openings', price: 40
            });
        expect(first.status).toBe(201);

        const overlapping = await request(app)
            .post('/api/lessons')
            .set('Authorization', `Bearer ${coach.token}`)
            .send({
                student: student2.user.id, dateTime: '2026-10-01T10:30:00.000Z',
                duration: 60, topic: 'Endgames', price: 40
            });
        expect(overlapping.status).toBe(409);
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
