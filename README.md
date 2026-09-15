# Chess Coaching Platform

This is a small booking app for chess coaching: coaches set their availability and manage lesson requests, students browse coaches and book open slots. It's a plain HTML/CSS/JS frontend talking to a Node/Express API backed by MongoDB — no framework, no build step.

**Status:** still a work in progress, not released yet. The core flow — browse a coach, request a slot, coach accepts, lesson gets scheduled — works end to end. A few things are still rough around the edges; see [Known Limitations](#known-limitations).

## How It Works

```
Browser (static .html pages)
        │
        ▼
    api.js  →  Express API (port 3001, JWT auth)
                    │
                    ├── /api/auth      login, register, current user
                    ├── /api/users     coach directory, profile updates
                    ├── /api/lessons   requests, approval, conflict detection
                    └── /api/schedules coach availability, open slots
                              │
                              ▼
                         MongoDB (local)
                    User · Lesson · Schedule
```

Every page loads `api.js`, a small client that wraps `fetch` calls to the Express API and stores the JWT session token in `localStorage`. There's no server-rendered templating — pages fetch their data from the API and update the DOM directly, so you can open any HTML file and it'll talk to whatever server is running on port 3001.

## Getting Started

### Prerequisites

- Node.js
- MongoDB (a local binary works fine — see below)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/chess-coaching
   JWT_SECRET=<your-secret>
   PORT=3001
   SEED_COACH_PASSWORD=<password-for-the-seeded-coach-account>
   ```
3. Seed a coach account so there's someone to log in as and book against:
   ```bash
   SEED_COACH_PASSWORD=<same-as-above> node server/seed.js
   ```
   Check `server/seed.js` for the username it creates — it's not meant to be a real credential, just a starting point for local testing. Feel free to register your own accounts through `register.html` instead.

### Running

```bash
./start.sh   # starts MongoDB (if not already running) + the Express server
./stop.sh    # stops both
```

The site is served at **http://localhost:3001**. (Port 3001 rather than 5000, since macOS AirPlay Receiver reserves 5000.)

## Project Layout

```
public/            Static frontend — HTML pages, api.js, app.js, styles.css
server/
  index.js         Express app entry point
  routes/          auth, users, lessons, schedules
  models/          Mongoose schemas (User, Lesson, Schedule)
  middleware/       JWT auth + role guards (isCoach, isStudent)
  seed.js           Creates/resets the default coach account
tests/             Jest + Supertest API tests
start.sh / stop.sh  Local MongoDB + server lifecycle scripts
```

## Key Pages

| Page | Who | Purpose |
|------|-----|---------|
| `index.html` | Public | Landing page |
| `coaches.html` | Public | Browse coaches (loaded from the API) |
| `coaching.html` | Public | Individual coach's personal booking page |
| `login.html` / `register.html` | Anyone | Auth (registration pulls the coach list from the API) |
| `coach-dashboard.html` | Coach | Stats and quick actions |
| `coach-schedule.html` | Coach | Set availability, view bookings |
| `lesson-requests.html` | Coach | Accept / reject pending lesson requests |
| `student-dashboard.html` | Student | Book open slots, view upcoming lessons |

## API Overview

All routes are prefixed with `/api`. Most require a `Bearer` JWT (issued by `/auth/login` or `/auth/register`); coach-only routes additionally check the user's role.

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/auth/register` | — | Create a student or coach account |
| POST | `/auth/login` | — | Log in, receive a JWT |
| GET | `/auth/me` | JWT | Current user's profile |
| GET | `/users/coaches` | — | List coaches |
| GET | `/users/students` | Coach | The logged-in coach's linked students |
| GET | `/users/:id` | JWT | Fetch a user by id |
| PATCH | `/users/profile` | JWT | Update the logged-in user's profile |
| POST | `/users/add-coach` | JWT | Add a coach account |
| GET | `/lessons` | JWT | List the logged-in user's lessons |
| GET | `/lessons/pending` | Coach | Lessons awaiting approval |
| POST | `/lessons` | Coach | Create a lesson directly |
| POST | `/lessons/request` | Student | Request a lesson slot |
| PATCH | `/lessons/:id/status` | JWT | Approve/reject/update a lesson |
| DELETE | `/lessons/:id` | Coach | Remove a lesson |
| GET | `/schedules/coach/:coachId` | JWT | A coach's schedule |
| PUT | `/schedules/coach/:coachId` | Coach | Update availability |
| GET | `/schedules/available/:coachId` | JWT | Open bookable slots |

Booking uses server-side conflict detection and atomic slot locking, so two students can't double-book the same slot.

## Authentication & Access Control

Logging in or registering gets you back a JWT, which the frontend stashes in `localStorage` and sends as a `Bearer` token on every API call after that. Tokens are valid for 7 days, so a session survives closing the tab, but eventually expires and you have to log back in.

Passwords are never stored in plain text — they go through bcrypt before touching the database, and the hash is explicitly stripped out of anything the API sends back to the client.

Authorization happens in two layers:

1. **Is this a real, logged-in user at all?** The `auth` middleware (`server/middleware/auth.js`) checks for a valid token on every protected route and rejects the request with a 401 if it's missing or invalid.
2. **Is this user allowed to do *this particular thing*?** Some routes are role-gated with `isCoach` / `isStudent` middleware — e.g. only coaches can accept a lesson request or edit their own schedule. Beyond role checks, a few routes also verify *ownership*: a coach can only edit their own schedule (`schedules.js` checks `req.user.userId` against the `:coachId` in the URL), and only the two people on a lesson — the coach and the student — can change its status. This is enforced server-side, not just hidden in the UI, so hitting the API directly with someone else's ID doesn't get you anywhere.

## Testing

There's a Jest + Supertest suite under [`tests/`](tests/) that exercises the API directly (no browser needed) — registration and login, the auth guard itself, booking conflicts, and the access-control rules described above (e.g. a student can't accept their own lesson request, a coach can't edit another coach's schedule).

Tests run against a real MongoDB instance, just a separate database (`chess-coaching-test`) so they never touch your actual data. Each test file wipes its collections between tests.

```bash
# MongoDB needs to be running first (e.g. via ./start.sh, or just start mongod yourself)
npm test
```

If you're adding a new route or changing how bookings/conflicts work, it's worth adding a case here — it's much faster than manually registering test accounts through the UI every time.

## Acknowledgments

The backend test suite under [`tests/`](tests/) (Jest + Supertest, covering auth, booking conflicts, and the schedule/roster endpoints) was written with Claude's help.

## Known Limitations

- JWTs live in `localStorage`, which is convenient but XSS-exposed; moving to httpOnly cookies is a possible future improvement.

## Troubleshooting

- **Port already in use:** the server runs on 3001, not 5000, to avoid conflicting with macOS AirPlay.
- **MongoDB won't start:** check `~/mongodb/logs/mongod.log`, and confirm `~/mongodb/data/db` exists.
- **"Not authorized" errors:** the JWT may have expired (7-day expiry) — log out and back in.
- **Reset the coach account:** re-run `SEED_COACH_PASSWORD=<password> node server/seed.js`.
