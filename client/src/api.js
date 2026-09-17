// API helper — centralized fetch wrapper
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('anavandi_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('anavandi_token', token);
    } else {
      localStorage.removeItem('anavandi_token');
    }
  }

  getUser() {
    const data = localStorage.getItem('anavandi_user');
    return data ? JSON.parse(data) : null;
  }

  setUser(user) {
    if (user) {
      localStorage.setItem('anavandi_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('anavandi_user');
    }
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.href = '/';
  }

  async fetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }

  get(path) { return this.fetch(path); }
  
  post(path, body) {
    return this.fetch(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put(path, body) {
    return this.fetch(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path) {
    return this.fetch(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
