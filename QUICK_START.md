# Chess Coaching Platform — Quick Start

## Starting the Server

```bash
./start.sh
```

This starts MongoDB (if not already running) and the Express server.
Open the site in your browser at **http://localhost:3001** — or open any `.html` file directly in your browser (they all point to port 3001).

## Stopping the Server

```bash
./stop.sh
```

---

## First-Time Setup (already done)

These steps were completed during setup and do not need to be repeated:

| Step | Command | Status |
|------|---------|--------|
| Install dependencies | `npm install` | Done |
| Install MongoDB | Binary at `~/mongodb/bin/mongod` | Done |
| Create `.env` | `MONGODB_URI`, `JWT_SECRET`, `PORT=3001` | Done |
| Seed coach account | `node server/seed.js` | Done |

---

## Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Coach (Alex Kolay, FM) | `chessboss2020` | `FideMaster2022!` |

Students can self-register at `register.html`.

---

## Architecture

```
Browser (any .html page)
        │
        ▼
    api.js  →  Express API (port 3001, JWT auth)
                    │
                    ├── /api/auth      (login, register, me, reset-password)
                    ├── /api/users     (coaches list, user by id)
                    ├── /api/lessons   (CRUD, conflict detection, pending inbox)
                    └── /api/schedules (coach availability, slot booking)
                              │
                              ▼
                         MongoDB (local)
                    User · Lesson · Schedule
```

All data lives in MongoDB. `localStorage` is used only for the JWT session token and UI preferences.

---

## Key Pages

| Page | Who | Purpose |
|------|-----|---------|
| `index.html` | Public | Landing page |
| `coaches.html` | Public | Browse coaches (loaded from API) |
| `coaching.html` | Public | Alex Kolay's personal coaching page |
| `login.html` | Anyone | Login (coach or student) |
| `register.html` | New users | Registration (loads coach list from API) |
| `coach-dashboard.html` | Coach | Stats & quick actions |
| `coach-schedule.html` | Coach | Set availability, view bookings |
| `lesson-requests.html` | Coach | Accept / reject pending requests |
| `student-dashboard.html` | Student | Book slots, view upcoming lessons |

---

## Troubleshooting

**Port already in use:** macOS AirPlay uses port 5000. The server runs on **3001** to avoid this.

**MongoDB won't start:** Check `~/mongodb/logs/mongod.log` for details. Make sure `~/mongodb/data/db` exists.

**"Not authorized" errors:** Your JWT may have expired (7-day expiry). Log out and log back in.

**Reset everything:** `node server/seed.js` re-creates the coach account if deleted.
