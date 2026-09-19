// Auth routes â€” register and login for all roles
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, queryAll, execute, saveDb } from '../db.js';


const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'anavandi-ksrtc-secure-jwt-token-secret-2026-production';

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

// GET /api/auth/check-unique — validate roll number, email, and phone uniqueness in real time
router.get('/check-unique', (req, res) => {
  try {
    const { email, phone, roll_no, institution_id } = req.query;
    const result = {
      available: true,
      emailExists: false,
      phoneExists: false,
      rollExists: false,
      error: null
    };

    if (email) {
      const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [email.trim().toLowerCase()]);
      if (existing) {
        result.available = false;
        result.emailExists = true;
        result.error = 'This email ID is already registered.';
      }
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone) {
        const existing = queryOne('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
        if (existing) {
          result.available = false;
          result.phoneExists = true;
          if (!result.error) result.error = 'This phone number is already registered.';
        }
      }
    }

    if (roll_no) {
      const cleanRoll = roll_no.trim().toLowerCase();
      const q = institution_id
        ? "SELECT id FROM applications WHERE institution_id = ? AND LOWER(roll_no) = ? AND status != 'rejected'"
        : "SELECT id FROM applications WHERE LOWER(roll_no) = ? AND status != 'rejected'";
      const p = institution_id ? [institution_id, cleanRoll] : [cleanRoll];
      const existing = queryOne(q, p);
      if (existing) {
        result.available = false;
        result.rollExists = true;
        if (!result.error) result.error = 'This roll number is already registered.';
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Check unique error:', err);
    res.status(500).json({ error: 'Check failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, name, phone, role,
            rollNo, institutionId,
            // Institution fields (only for institution role)
            institutionName, institutionPlace, postalName, pincode, district,
            institutionType, educationLevel, headName,
            affiliationUniversity, affiliationNumber } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Check existing email (strictly case-insensitive)
    const existingEmail = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({ error: 'This email ID is already registered.' });
    }

    // Validate and check existing phone number
    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number' });
      }
      const existingPhone = queryOne('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
      if (existingPhone) {
        return res.status(409).json({ error: 'This phone number is already registered.' });
      }
    }

    // Check existing roll number if student
    if (rollNo) {
      const cleanRoll = rollNo.trim().toLowerCase();
      const q = institutionId
        ? "SELECT id FROM applications WHERE institution_id = ? AND LOWER(roll_no) = ? AND status != 'rejected'"
        : "SELECT id FROM applications WHERE LOWER(roll_no) = ? AND status != 'rejected'";
      const p = institutionId ? [institutionId, cleanRoll] : [cleanRoll];
      const existingRoll = queryOne(q, p);
      if (existingRoll) {
        return res.status(409).json({ error: 'This roll number is already registered.' });
      }
    }

    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
      }
      const existingUsername = queryOne('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const userId = execute(
      'INSERT INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [role, cleanEmail, username ? username.trim() : cleanEmail, passwordHash, name.trim(), cleanPhone]
    );

    // If institution, create institution record with pending verification status
    if (role === 'institution') {
      if (!institutionName) {
        return res.status(400).json({ error: 'Institution Name is required' });
      }
      const instId = execute(
        `INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, 
         institution_type, education_level, head_name, affiliation_university, affiliation_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_ksrtc_verification')`,
        [
          userId,
          institutionName.trim(),
          institutionPlace ? institutionPlace.trim() : null,
          postalName ? postalName.trim() : null,
          pincode ? pincode.trim() : null,
          district ? district.trim() : null,
          institutionType ? institutionType.trim() : null,
          educationLevel ? educationLevel.trim() : null,
          headName ? headName.trim() : null,
          affiliationUniversity ? affiliationUniversity.trim() : null,
          affiliationNumber ? affiliationNumber.trim() : null
        ]
      );


      const newInst = queryOne('SELECT * FROM institutions WHERE id = ?', [instId]);
      saveDb();

      // Crucial: Institution is NOT immediately granted access. Requires KSRTC verification.
      return res.status(201).json({ 
        success: true,
        status: 'pending_ksrtc_verification',
        message: 'Institution registration submitted successfully. KSRTC will verify the institution details before granting access.',
        institution: newInst
      });
    }

    saveDb();

    const token = jwt.sign({ id: userId, role, email: cleanEmail, name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token, 
      user: { id: userId, role, email: cleanEmail, name },
      institution: null
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      if (err.message.includes('email')) return res.status(409).json({ error: 'This email ID is already registered.' });
      if (err.message.includes('phone')) return res.status(409).json({ error: 'This phone number is already registered.' });
      if (err.message.includes('roll_no')) return res.status(409).json({ error: 'This roll number is already registered.' });
    }
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

    const cleanInput = email.trim().toLowerCase();
    const user = queryOne('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?', [cleanInput, cleanInput]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If institution, verify that KSRTC has approved them before permitting login
    let institution = null;
    if (user.role === 'institution') {
      institution = queryOne('SELECT * FROM institutions WHERE user_id = ?', [user.id]);
      if (institution) {
        if (institution.status === 'pending_ksrtc_verification' || institution.status === 'under_review') {
          return res.status(403).json({
            error: 'KSRTC Verification Required: Your institution registration has been submitted successfully. KSRTC will verify the institution details before granting access.',
            status: institution.status
          });
        }
        if (institution.status === 'rejected') {
          return res.status(403).json({
            error: `Your institution registration could not be approved at this time. Reason: ${institution.verification_notes || 'Contact unreachable or affiliation could not be verified'}. Please contact KSRTC for further verification.`,
            status: 'rejected'
          });
        }
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
