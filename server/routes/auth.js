// Auth routes â€” register and login for all roles
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate phone number format if provided
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number' });
      }
    }

    // Check existing email
    const existingEmail = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existingEmail) {
      return res.status(409).json({ error: 'This email address is already registered. Please login or use another email.' });
    }

    // Check existing phone number if provided
    if (phone) {
      const existingPhone = queryOne('SELECT id FROM users WHERE phone = ?', [phone.trim()]);
      if (existingPhone) {
        return res.status(409).json({ error: 'This phone number is already registered with an existing account.' });
      }
    }

    if (username) {
      const cleanUsername = username.trim();
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
      }
      const existingUsername = queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
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

// GET /api/auth/me â€” get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = queryOne('SELECT id, role, email, name, phone FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  let institution = null;
  if (user.role === 'institution') {
    institution = queryOne('SELECT * FROM institutions WHERE user_id = ?', [user.id]);
  }
  
  res.json({ user, institution });
});

// GET /api/auth/institutions — list all institutions (DB registered + static Kerala list)
router.get('/institutions', async (req, res) => {
  try {
    const { KERALA_INSTITUTIONS } = await import('../kerala-institutions.js').catch(() => ({ KERALA_INSTITUTIONS: [] }));
    const dbInstitutions = queryAll('SELECT id, name, place, district, institution_type, education_level FROM institutions ORDER BY name');

    // Build a set of DB institution names (normalised) to avoid duplicates
    const dbNames = new Set(dbInstitutions.map(i => i.name.toLowerCase().trim()));

    // Static list items not already in DB get a synthetic negative ID so client can detect them
    const staticOnly = KERALA_INSTITUTIONS
      .filter(i => !dbNames.has(i.name.toLowerCase().trim()))
      .map((i, idx) => ({
        id: `static_${idx}`,
        name: i.name,
        place: i.place,
        district: i.district,
        institution_type: i.institution_type,
        education_level: i.education_level,
        registered: false,
      }));

    const merged = [
      ...dbInstitutions.map(i => ({ ...i, registered: true })),
      ...staticOnly,
    ].sort((a, b) => a.name.localeCompare(b.name));

    res.json(merged);
  } catch (err) {
    // Fallback: just return DB institutions
    const dbInstitutions = queryAll('SELECT id, name, place, district, institution_type, education_level FROM institutions ORDER BY name');
    res.json(dbInstitutions.map(i => ({ ...i, registered: true })));
  }
});

export default router;
