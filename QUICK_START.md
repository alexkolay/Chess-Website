# Chess Coaching Platform - Quick Start Guide

## How to Access the Website

### Option 1: Simple HTML Version (Recommended for Quick Access)
The main application uses static HTML files that work directly in a browser:

1. **Open directly in browser:**
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
   
   ```bash
   # Using Python (if installed)
   python3 -m http.server 8000
   
   # Using Node.js http-server (if installed)
   npx http-server -p 8000
   ```
   
   Then visit: `http://localhost:8000`

2. **Note:** This version uses **localStorage** for data persistence (no database required)

### Option 2: Full Stack with Backend Server
If you want to use the MongoDB backend:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up MongoDB:**
   - Make sure MongoDB is running locally, OR
   - Set `MONGODB_URI` in a `.env` file for cloud MongoDB

3. **Start the server:**
   ```bash
   npm start
   # Server runs on http://localhost:5000
   ```

4. **Start React client (optional):**
   ```bash
   cd client
   npm install
   npm start
   # React app runs on http://localhost:5173 (Vite default)
   ```

---

## What's Implemented

### 🏠 **Public Pages**
- **Home Page** (`index.html`) - Landing page with platform overview
- **Coaches Page** (`coaches.html`) - Browse available coaches
- **About Page** (`about.html`) - Platform information
- **Login/Register** - Authentication for both coaches and students

### 👨‍🏫 **Coach Features**

#### Coach Dashboard (`coach-dashboard.html`)
- Quick stats (active students, upcoming lessons, pending requests)
- Today's schedule overview
- Quick action buttons

#### Coach Schedule (`coach-schedule.html`) ⭐ **Most Feature-Rich**
- **Weekly schedule view** with Monday-Friday columns
- **Week navigation** (Previous/Next week buttons)
- **Time slot management:**
  - Available slots (green)
  - Booked slots (blue) - shows student name, rating, and lesson focus
  - Unavailable/Past slots (red)
- **Schedule Settings Modal:**
  - Set start/end times
  - Choose time increment (15min, 30min, 45min, 1hr, 1.5hr, 2hr)
  - Select available days of the week
  - Reset schedule option
- **Schedule Lesson Modal:**
  - Select student from dropdown
  - Enter student rating
  - Choose lesson focus (Opening, Middlegame, Endgame, Tactics, Game Analysis)
  - Add notes
- **Manage Students Modal:**
  - View all students (assigned/unassigned)
  - Statistics (total, assigned, unassigned)
  - Remove individual students
  - Remove all unassigned students
- **Rating Setup Modal:**
  - First-time coach rating setup
  - Skip option available
- **Per-week scheduling** - Each week has its own schedule data stored separately

### 👨‍🎓 **Student Features**

#### Student Dashboard (`student-dashboard.html`)
- View assigned coach
- Browse available time slots
- Request lessons
- View upcoming lessons

### 🔐 **Authentication System**
- **Registration** (`register.html`):
  - Separate forms for students and coaches
  - Coach registration includes expertise selection
- **Login** (`login.html`):
  - Tab-based interface (Student/Coach)
  - Password reset functionality
  - Uses localStorage for session management

### 📚 **Additional Pages**
- `lesson-requests.html` - Manage lesson requests
- `achievements.html` - Achievement system
- `coaching.html` - Coaching information
- `tech.html` - Technical details

### 🎨 **UI/UX Features**
- Responsive design (mobile-friendly)
- Modern styling with Poppins font
- Chess-themed color scheme
- Modal dialogs for forms
- Mobile hamburger menu
- Chess pattern backgrounds

### 💾 **Data Storage**
- **Current Implementation:** Uses `localStorage` for:
  - User accounts (`userData_username`)
  - Schedule data (`scheduleData_username_weekKey`)
  - Schedule settings (`scheduleSettings_username`)
  - Session management (`isLoggedIn`, `userType`, `username`)

- **Backend Available:** MongoDB models and routes exist but may not be fully integrated with HTML pages

### 🛠 **Technical Stack**

**Frontend (Main):**
- Vanilla HTML/CSS/JavaScript
- Responsive CSS Grid/Flexbox
- localStorage for data persistence

**Frontend (Alternative):**
- React + TypeScript (in `client/` folder)
- Material-UI components
- Vite build tool

**Backend:**
- Node.js + Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing

---

## Quick Test Flow

1. **Open** `index.html` in browser
2. **Register** as a coach or student
3. **Login** with your credentials
4. **As Coach:**
   - Go to Schedule page
   - Set up your schedule settings
   - Schedule lessons with students
   - Manage your student roster
5. **As Student:**
   - Browse coaches
   - View available time slots
   - Request lessons

---

## Important Notes

- The HTML pages use **localStorage**, so data persists in your browser
- Each coach's schedule is stored per week (Monday-Friday)
- Past time slots are automatically marked as unavailable
- The React client (`client/` folder) appears to be a separate/newer implementation
- The backend server exists but the HTML pages currently work standalone

---

## Troubleshooting

**If pages don't load properly:**
- Make sure you're using a local server (not just `file://`)
- Check browser console for JavaScript errors
- Clear localStorage if you encounter data issues: `localStorage.clear()`

**If backend doesn't work:**
- Ensure MongoDB is running
- Check `.env` file for `MONGODB_URI`
- Verify all npm packages are installed

