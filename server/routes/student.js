// Student routes — application CRUD and pass display
import { Router } from 'express';
import { authMiddleware, requireRole } from './auth.js';
import { queryOne, queryAll, execute, saveDb } from '../db.js';

const router = Router();

// POST /api/student/apply — submit a new concession application
router.post('/apply', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const {
      institutionId, dateOfBirth, age, gender, guardianName,
      aadhaarNumber, address, place, postalName, pincode, district,
      rollNo, course, academicYear,
      routeFrom, routeTo, distanceKm
    } = req.body;

    // Check for existing pending application
    const existing = queryOne(
      "SELECT id FROM applications WHERE student_user_id = ? AND status NOT IN ('rejected')",
      [req.user.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'You already have an active application' });
    }

    const appId = execute(
      `INSERT INTO applications (
        student_user_id, institution_id, status,
        date_of_birth, age, gender, guardian_name,
        aadhaar_number, address, place, postal_name, pincode, district,
        roll_no, course, academic_year,
        route_from, route_to, distance_km
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, institutionId,
        dateOfBirth, age, gender, guardianName,
        aadhaarNumber, address, place, postalName, pincode, district,
        rollNo, course, academicYear,
        routeFrom, routeTo, distanceKm
      ]
    );

    saveDb();
    res.status(201).json({ id: appId, status: 'pending', message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Application submission failed' });
  }
});

// GET /api/student/application — get current student's application
router.get('/application', authMiddleware, requireRole('student'), (req, res) => {
  const app = queryOne(
    `SELECT a.*, i.name as institution_name, i.place as institution_place, i.district as institution_district,
     u.name as student_name, u.email as student_email, u.phone as student_phone
     FROM applications a
     LEFT JOIN institutions i ON a.institution_id = i.id
     LEFT JOIN users u ON a.student_user_id = u.id
     WHERE a.student_user_id = ? 
     ORDER BY a.created_at DESC LIMIT 1`,
    [req.user.id]
  );
  
  if (!app) {
    return res.json({ application: null });
  }

  // If issued, get the credential too
  let credential = null;
  if (app.status === 'issued') {
    credential = queryOne(
      'SELECT * FROM credentials WHERE application_id = ? AND revoked = 0',
      [app.id]
    );
  }

  res.json({ application: app, credential });
});

// GET /api/student/pass — get the digital pass data
router.get('/pass', authMiddleware, requireRole('student'), (req, res) => {
  const app = queryOne(
    `SELECT a.*, i.name as institution_name, i.place as institution_place,
     u.name as student_name, u.email as student_email
     FROM applications a
     LEFT JOIN institutions i ON a.institution_id = i.id
     LEFT JOIN users u ON a.student_user_id = u.id
     WHERE a.student_user_id = ? AND a.status = 'issued'
     ORDER BY a.created_at DESC LIMIT 1`,
    [req.user.id]
  );

  if (!app) {
    return res.status(404).json({ error: 'No issued pass found' });
  }

  const credential = queryOne(
    'SELECT * FROM credentials WHERE application_id = ? AND revoked = 0',
    [app.id]
  );

  if (!credential) {
    return res.status(404).json({ error: 'Credential not found or revoked' });
  }

  res.json({ 
    pass: {
      studentName: app.student_name,
      rollNo: app.roll_no,
      institution: app.institution_name,
      course: app.course,
      routeFrom: app.route_from,
      routeTo: app.route_to,
      distanceKm: app.distance_km,
      validFrom: credential.valid_from,
      validTo: credential.valid_to,
      credentialId: credential.credential_id,
      qrData: credential.jws_token
    }
  });
});

export default router;
