# Chess Coaching Platform

A web application connecting chess coaches with students — coaches manage their availability and lesson requests, students browse coaches and book open slots. Built as a static HTML/CSS/JS frontend backed by a Node.js/Express API and MongoDB.

> **Status:** Under active development, not yet released. Core booking flow works end to end, but a few pieces (see [Known Limitations](#known-limitations)) still need finishing.

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

Every page loads `api.js`, a small client that wraps `fetch` calls to the Express API and stores the JWT session token in `localStorage`. There is no server-rendered templating — the HTML pages fetch data from the API and update the DOM directly.

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
   SEED_COACH_PASSWORD=<password-for-seeded-coach-account>
   ```
3. Seed a coach account (username `chessboss2020`):
   ```bash
   SEED_COACH_PASSWORD=<same-as-above> node server/seed.js
   ```

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

## Authentication

- JWT-based, 7-day expiry, stored client-side in `localStorage`.
- Passwords hashed with bcrypt.
- Role-based middleware (`isCoach`, `isStudent`) gates coach- and student-only routes.

## Known Limitations

- `coach-schedule.html` and `student-dashboard.html` still read/write some schedule data via `localStorage` instead of the API — migration in progress.
- JWTs live in `localStorage`, which is convenient but XSS-exposed; moving to httpOnly cookies is a possible future improvement.

## Troubleshooting

- **Port already in use:** the server runs on 3001, not 5000, to avoid conflicting with macOS AirPlay.
- **MongoDB won't start:** check `~/mongodb/logs/mongod.log`, and confirm `~/mongodb/data/db` exists.
- **"Not authorized" errors:** the JWT may have expired (7-day expiry) — log out and back in.
- **Reset the coach account:** re-run `SEED_COACH_PASSWORD=<password> node server/seed.js`.
