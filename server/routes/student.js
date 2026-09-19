// Student routes — application CRUD, pass display, and document upload
import { Router } from 'express';
import { authMiddleware, requireRole } from './auth.js';
import { queryOne, queryAll, execute, saveDb } from '../db.js';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer config: store ID cards to disk with unique filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowedMime.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP) and PDF files are allowed'));
    }
  },
});

const router = Router();

// POST /api/student/apply — submit a new concession application
router.post('/apply', authMiddleware, requireRole('student'), (req, res) => {
  try {
    const {
      institutionId, dateOfBirth, age, gender, guardianName,
      aadhaarNumber, address, place, postalName, pincode, district,
      rollNo, course, department, yearOfStudy, semester, academicYear,
      routeFrom, routeTo, distanceKm, concessionCategory
    } = req.body;

    // Check for existing active application
    const existing = queryOne(
      "SELECT id FROM applications WHERE student_user_id = ? AND status NOT IN ('rejected')",
      [req.user.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'You already have an active application' });
    }

    // Check for duplicate roll number in the same institution
    if (rollNo && institutionId) {
      const existingRollNo = queryOne(
        "SELECT id FROM applications WHERE institution_id = ? AND LOWER(roll_no) = LOWER(?) AND status NOT IN ('rejected')",
        [institutionId, rollNo]
      );
      if (existingRollNo) {
        return res.status(409).json({ error: 'An active application with this Roll Number already exists for the selected institution.' });
      }
    }

    const appId = execute(
      `INSERT INTO applications (
        student_user_id, institution_id, status,
        date_of_birth, age, gender, guardian_name,
        aadhaar_number, address, place, postal_name, pincode, district,
        roll_no, course, department, year_of_study, semester, academic_year,
        route_from, route_to, distance_km, concession_category
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, institutionId,
        dateOfBirth, age, gender, guardianName,
        aadhaarNumber, address, place, postalName, pincode, district,
        rollNo, course, department || null, yearOfStudy || null, semester || null, academicYear || null,
        routeFrom, routeTo, distanceKm, concessionCategory || 'General'
      ]
    );

    saveDb();
    res.status(201).json({ id: appId, status: 'pending', message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Application submission failed' });
  }
});

// GET /api/student/application — get current student's application and credential
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
  
  if (!app) return res.json({ application: null, credential: null });

  let credential = null;
  if (app.status === 'issued') {
    credential = queryOne(
      'SELECT * FROM credentials WHERE application_id = ? AND revoked = 0',
      [app.id]
    );
  }

  res.json({ application: app, credential });
});

// GET /api/student/pass — get the digital pass data for display
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

  if (!app) return res.status(404).json({ error: 'No issued pass found' });

  const credential = queryOne(
    'SELECT * FROM credentials WHERE application_id = ? AND revoked = 0',
    [app.id]
  );

  if (!credential) return res.status(404).json({ error: 'Credential not found or revoked' });

  res.json({ 
    pass: {
      studentName: app.student_name,
      rollNo: app.roll_no,
      institution: app.institution_name,
      course: app.course,
      department: app.department,
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

// POST /api/student/upload-id — upload student ID card or photo
// Accepts a single file under field name 'document'
// doc_type: 'id_card' | 'photo' | 'other'
router.post(
  '/upload-id',
  authMiddleware,
  requireRole('student'),
  upload.single('document'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const docType = req.body.doc_type || 'id_card';
      const applicationId = req.body.application_id ? parseInt(req.body.application_id) : null;

      // Verify this application belongs to the student if provided
      if (applicationId) {
        const app = queryOne(
          'SELECT id FROM applications WHERE id = ? AND student_user_id = ?',
          [applicationId, req.user.id]
        );
        if (!app) {
          return res.status(403).json({ error: 'Application not found or access denied' });
        }

        // Update the application document path
        const colName = docType === 'photo' ? 'photo_path' : 'document_path';
        execute(
          `UPDATE applications SET ${colName} = ?, updated_at = datetime('now') WHERE id = ?`,
          [req.file.filename, applicationId]
        );
      }

      // Record in document_uploads table
      const uploadId = execute(
        `INSERT INTO document_uploads 
         (application_id, student_user_id, doc_type, original_name, stored_path, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          applicationId,
          req.user.id,
          docType,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
        ]
      );
      saveDb();

      res.status(201).json({
        uploadId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        docType,
        message: 'File uploaded successfully',
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }
);

// GET /api/student/documents — list uploaded documents for this student
router.get('/documents', authMiddleware, requireRole('student'), (req, res) => {
  const docs = queryAll(
    `SELECT id, doc_type, original_name, stored_path, mime_type, file_size, uploaded_at
     FROM document_uploads WHERE student_user_id = ? ORDER BY uploaded_at DESC`,
    [req.user.id]
  );
  res.json({ documents: docs });
});

export default router;
