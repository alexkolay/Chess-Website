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

describe('GET /api/schedules/coach/:coachId', () => {
    it('returns sensible defaults when a coach has not set a schedule yet', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .get(`/api/schedules/coach/${coach.user.id}`)
            .set('Authorization', `Bearer ${coach.token}`);

        expect(res.status).toBe(200);
        expect(res.body.slots).toEqual([]);
        expect(res.body.settings.startTime).toBe('09:00');
    });
});

describe('PUT /api/schedules/coach/:coachId', () => {
    it('lets a coach save their own availability', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .put(`/api/schedules/coach/${coach.user.id}`)
            .set('Authorization', `Bearer ${coach.token}`)
            .send({
                settings: { startTime: '08:00', endTime: '18:00', timeIncrement: 30, availableDays: [1, 2, 3] },
                slots: [{ date: '2026-10-01', time: '09:00', status: 'available' }]
            });

        expect(res.status).toBe(200);
        expect(res.body.slots).toHaveLength(1);
        expect(res.body.settings.startTime).toBe('08:00');
    });

    it('blocks a coach from editing another coach’s schedule', async () => {
        const coachA = await registerAndLogin({
            username: 'coachA', email: 'coachA@example.com', password: 'password123', role: 'coach'
        });
        const coachB = await registerAndLogin({
            username: 'coachB', email: 'coachB@example.com', password: 'password123', role: 'coach'
        });

        const res = await request(app)
            .put(`/api/schedules/coach/${coachB.user.id}`)
            .set('Authorization', `Bearer ${coachA.token}`)
            .send({ settings: {}, slots: [] });

        expect(res.status).toBe(403);
    });

    it('blocks a student from setting coach availability', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });
        const student = await registerAndLogin({
            username: 'student1', email: 'student1@example.com', password: 'password123', role: 'student'
        });

        const res = await request(app)
            .put(`/api/schedules/coach/${coach.user.id}`)
            .set('Authorization', `Bearer ${student.token}`)
            .send({ settings: {}, slots: [] });

        expect(res.status).toBe(403);
    });
});

describe('GET /api/schedules/available/:coachId', () => {
    it('only returns slots marked available', async () => {
        const coach = await registerAndLogin({
            username: 'coach1', email: 'coach1@example.com', password: 'password123', role: 'coach'
        });

        await request(app)
            .put(`/api/schedules/coach/${coach.user.id}`)
            .set('Authorization', `Bearer ${coach.token}`)
            .send({
                settings: { startTime: '09:00', endTime: '17:00', timeIncrement: 60, availableDays: [1, 2, 3, 4, 5] },
                slots: [
                    { date: '2026-10-01', time: '09:00', status: 'available' },
                    { date: '2026-10-01', time: '10:00', status: 'booked' }
                ]
            });

        const res = await request(app)
            .get(`/api/schedules/available/${coach.user.id}`)
            .set('Authorization', `Bearer ${coach.token}`);

        expect(res.status).toBe(200);
        expect(res.body.slots).toHaveLength(1);
        expect(res.body.slots[0].time).toBe('09:00');
    });
});
