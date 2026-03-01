// Chess Coaching Platform — central API helper
// Include this file before page-specific scripts: <script src="api.js"></script>

const API_BASE = 'http://localhost:3001';

const Api = {
    // ── Session helpers ──────────────────────────────────────────────────────
    getToken() {
        return localStorage.getItem('authToken');
    },

    setSession(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        // Legacy keys kept so existing page logic still works during migration
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userType', user.role);
        localStorage.setItem('username', user.username);
    },

    clearSession() {
        ['authToken', 'currentUser', 'isLoggedIn', 'userType', 'username',
         'coachData', 'studentData'].forEach(k => localStorage.removeItem(k));
    },

    getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    },

    isLoggedIn() {
        return !!localStorage.getItem('authToken');
    },

    requireAuth(redirectTo = 'login.html') {
        if (!this.isLoggedIn()) window.location.href = redirectTo;
    },

    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    },

    // ── Core fetch wrapper ───────────────────────────────────────────────────
    async _fetch(path, options = {}) {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(API_BASE + path, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
        return data;
    },

    // ── Auth ─────────────────────────────────────────────────────────────────
    async login(username, password) {
        const data = await this._fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setSession(data.token, data.user);
        return data.user;
    },

    async register(userData) {
        const data = await this._fetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        return data;
    },

    me() {
        return this._fetch('/api/auth/me');
    },

    resetPassword(username, newPassword) {
        return this._fetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ username, newPassword })
        });
    },

    // ── Users ────────────────────────────────────────────────────────────────
    getCoaches() {
        return this._fetch('/api/users/coaches');
    },

    getUser(id) {
        return this._fetch(`/api/users/${id}`);
    },

    // ── Schedules ────────────────────────────────────────────────────────────
    getSchedule(coachId) {
        return this._fetch(`/api/schedules/coach/${coachId}`);
    },

    updateSchedule(coachId, data) {
        return this._fetch(`/api/schedules/coach/${coachId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    getAvailableSlots(coachId) {
        return this._fetch(`/api/schedules/available/${coachId}`);
    },

    // ── Lessons ──────────────────────────────────────────────────────────────
    getLessons() {
        return this._fetch('/api/lessons');
    },

    // Pending requests in the coach's inbox
    getPendingRequests() {
        return this._fetch('/api/lessons/pending');
    },

    createLesson(data) {
        return this._fetch('/api/lessons', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Student requests a lesson from a coach's available slot
    requestLesson(data) {
        return this._fetch('/api/lessons/request', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateLessonStatus(id, status) {
        return this._fetch(`/api/lessons/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    deleteLesson(id) {
        return this._fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    }
};
