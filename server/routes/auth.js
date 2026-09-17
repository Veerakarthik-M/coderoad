// Auth routes — register and login for all roles
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, queryAll, execute, saveDb } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'anavandi-hackathon-2026-secret';

// Middleware to verify JWT token
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-check middleware
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, name, phone, role,
            // Institution fields (only for institution role)
            institutionName, institutionPlace, postalName, pincode, district,
            institutionType, educationLevel, headName,
            affiliationUniversity, affiliationNumber } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check existing user
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    if (username) {
      const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const userId = execute(
      'INSERT INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [role, email, username || email, passwordHash, name, phone || null]
    );

    // If institution, create institution record
    if (role === 'institution' && institutionName) {
      execute(
        `INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, 
         institution_type, education_level, head_name, affiliation_university, affiliation_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, institutionName, institutionPlace, postalName, pincode, district,
         institutionType, educationLevel, headName, affiliationUniversity, affiliationNumber]
      );
    }

    saveDb();

    const token = jwt.sign({ id: userId, role, email, name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token, 
      user: { id: userId, role, email, name } 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = queryOne('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // If institution, get institution info
    let institution = null;
    if (user.role === 'institution') {
      institution = queryOne('SELECT * FROM institutions WHERE user_id = ?', [user.id]);
    }

    res.json({ 
      token, 
      user: { 
        id: user.id, role: user.role, email: user.email, name: user.name 
      },
      institution
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = queryOne('SELECT id, role, email, name, phone FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  let institution = null;
  if (user.role === 'institution') {
    institution = queryOne('SELECT * FROM institutions WHERE user_id = ?', [user.id]);
  }
  
  res.json({ user, institution });
});

// GET /api/auth/institutions — list all institutions (for student registration dropdown)
router.get('/institutions', (req, res) => {
  const institutions = queryAll('SELECT id, name, place, district FROM institutions ORDER BY name');
  res.json(institutions);
});

export default router;
