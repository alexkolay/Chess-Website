// Chess Coaching Platform — central API helper
// Include this file before page-specific scripts: <script src="api.js"></script>

const API_BASE = '';

const Api = {
    _read(key) {
        return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    },

    _write(key, value) {
        sessionStorage.setItem(key, value);
        localStorage.setItem(key, value);
    },

    _clear(key) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    },

    getToken() {
        return this._read('authToken');
    },

    setSession(token, user) {
        this._write('authToken', token);
        this._write('currentUser', JSON.stringify(user));
        // Legacy keys kept so existing page logic still works during migration
        this._write('isLoggedIn', 'true');
        this._write('userType', user.role);
        this._write('username', user.username);
    },

    clearSession() {
        ['authToken', 'currentUser', 'isLoggedIn', 'userType', 'username',
         'coachData', 'studentData'].forEach(key => this._clear(key));
    },

    getCurrentUser() {
        try { return JSON.parse(this._read('currentUser')); } catch { return null; }
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    requireAuth(redirectTo = 'login.html') {
        if (!this.isLoggedIn()) window.location.href = redirectTo;
    },

    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    },

    async _fetch(path, options = {}) {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(API_BASE + path, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
        return data;
    },

    // Auth
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

    // Users
    getCoaches() {
        return this._fetch('/api/users/coaches');
    },

    getUser(id) {
        return this._fetch(`/api/users/${id}`);
    },

    getMyStudents() {
        return this._fetch('/api/users/students');
    },

    addCoach(coachId) {
        return this._fetch('/api/users/add-coach', {
            method: 'POST',
            body: JSON.stringify({ coachId })
        });
    },

    // Schedules
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

    // Lessons
    getLessons() {
        return this._fetch('/api/lessons');
    },

    getPendingRequests() {
        return this._fetch('/api/lessons/pending');
    },

    createLesson(data) {
        return this._fetch('/api/lessons', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

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
    },

    updateProfile(data) {
        return this._fetch('/api/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
};
