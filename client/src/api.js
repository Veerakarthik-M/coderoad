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

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      throw new Error(`Network error: Could not reach server (${networkErr.message}). Check connection.`);
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Server returned an invalid JSON response');
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error('Backend server is waking up. Please retry in 5–10 seconds.');
        }
        if (response.status === 404) {
          throw new Error(`API endpoint ${path} not found (404).`);
        }
        throw new Error(`Server error: HTTP ${response.status} (${response.statusText || 'Unknown'})`);
      }
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed: ${response.status}`);
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
