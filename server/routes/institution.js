// Institution routes — review and approve/reject student applications,
// view students, travel/verification history
import { Router } from 'express';
import { authMiddleware, requireRole } from './auth.js';
import { queryOne, queryAll, execute, saveDb } from '../db.js';

const router = Router();

// Helper: get institution record for the current logged-in institution user
function getInstitution(userId) {
  return queryOne('SELECT * FROM institutions WHERE user_id = ?', [userId]);
}

// Middleware: ensure institution has been approved by KSRTC
function requireApprovedInstitution(req, res, next) {
  const institution = getInstitution(req.user.id);
  if (!institution) {
    return res.status(404).json({ error: 'Institution profile not found' });
  }
  const status = institution.status || 'verified';
  if (status === 'pending_ksrtc_verification' || status === 'under_review') {
    return res.status(403).json({
      error: 'Institution access restricted. Your registration is awaiting KSRTC telephone and administrative verification.',
      status
    });
  }
  if (status === 'rejected') {
    return res.status(403).json({
      error: 'Institution registration rejected by KSRTC: ' + (institution.verification_notes || 'Credentials could not be verified.'),
      status
    });
  }
  req.institution = institution;
  next();
}

// GET /api/institution/profile — check institution status & profile info
router.get('/profile', authMiddleware, requireRole('institution'), (req, res) => {
  try {
    const institution = getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });
    res.json({ institution });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch institution profile' });
  }
});

// GET /api/institution/applications — get all applications for this institution
router.get('/applications', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const applications = queryAll(
      `SELECT a.*, u.name as student_name, u.email as student_email, u.phone as student_phone
       FROM applications a
       JOIN users u ON a.student_user_id = u.id
       WHERE a.institution_id = ?
       ORDER BY 
         CASE a.status 
           WHEN 'pending' THEN 1 
           WHEN 'inst_approved' THEN 2 
           WHEN 'approved' THEN 3
           WHEN 'issued' THEN 4
           WHEN 'rejected' THEN 5
         END,
         a.created_at DESC`,
      [institution.id]
    );

    const appIds = applications.map(a => a.id);
    let allDocs = [];
    if (appIds.length > 0) {
      allDocs = queryAll(
        `SELECT id, application_id, doc_type, original_name, stored_path 
         FROM document_uploads 
         WHERE application_id IN (${appIds.join(',')})`
      );
    }
    applications.forEach(a => {
      a.documents = allDocs.filter(d => d.application_id === a.id);
    });

    res.json({ applications, institutionId: institution.id, institution });
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/institution/approve/:id — approve a student application
router.post('/approve/:id', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const app = queryOne(
      'SELECT * FROM applications WHERE id = ? AND institution_id = ? AND status = ?',
      [req.params.id, institution.id, 'pending']
    );
    if (!app) return res.status(404).json({ error: 'Application not found or not pending' });

    execute(
      "UPDATE applications SET status = 'inst_approved', updated_at = datetime('now') WHERE id = ?",
      [req.params.id]
    );
    saveDb();

    res.json({ message: 'Application approved by institution', status: 'inst_approved' });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// POST /api/institution/reject/:id — reject a student application
router.post('/reject/:id', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const { reason } = req.body;
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const app = queryOne(
      'SELECT * FROM applications WHERE id = ? AND institution_id = ? AND status = ?',
      [req.params.id, institution.id, 'pending']
    );
    if (!app) return res.status(404).json({ error: 'Application not found or not pending' });

    execute(
      "UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?",
      [reason || 'Rejected by institution', req.params.id]
    );
    saveDb();

    res.json({ message: 'Application rejected', status: 'rejected' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// GET /api/institution/students — list all students belonging to this institution
// Includes pass status
router.get('/students', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const students = queryAll(
      `SELECT 
         u.id as user_id, u.name, u.email, u.phone,
         a.id as application_id, a.roll_no, a.course, a.department, a.year_of_study,
         a.route_from, a.route_to, a.status, a.created_at,
         c.credential_id, c.valid_from, c.valid_to, c.revoked,
         (
           SELECT ve.verified_at FROM verification_events ve
           WHERE ve.student_user_id = u.id
           ORDER BY ve.verified_at DESC LIMIT 1
         ) as last_verified_at
       FROM applications a
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN credentials c ON c.application_id = a.id AND c.revoked = 0
       WHERE a.institution_id = ?
       ORDER BY a.status, u.name`,
      [institution.id]
    );

    res.json({ students, institutionId: institution.id });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/institution/student/:userId/history — travel/verification history for a student
router.get('/student/:userId/history', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    // Verify this student belongs to this institution
    const studentApp = queryOne(
      `SELECT a.*, u.name, u.email, u.phone, c.credential_id, c.valid_from, c.valid_to, c.revoked
       FROM applications a
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN credentials c ON c.application_id = a.id
       WHERE a.institution_id = ? AND a.student_user_id = ?
       ORDER BY a.created_at DESC LIMIT 1`,
      [institution.id, req.params.userId]
    );

    if (!studentApp) {
      return res.status(404).json({ error: 'Student not found in this institution' });
    }

    const events = queryAll(
      `SELECT * FROM verification_events
       WHERE student_user_id = ?
       ORDER BY verified_at DESC
       LIMIT 100`,
      [req.params.userId]
    );

    res.json({ student: studentApp, events });
  } catch (err) {
    console.error('Get student history error:', err);
    res.status(500).json({ error: 'Failed to fetch student history' });
  }
});

// GET /api/institution/verification-logs — recent verification events for this institution
router.get('/verification-logs', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const filterMode = req.query.mode; // ONLINE | OFFLINE
    const filterResult = req.query.result; // VALID | INVALID | EXPIRED | REVOKED

    let query = `SELECT * FROM verification_events WHERE institution_id = ?`;
    const params = [institution.id];

    if (filterMode) { query += ` AND verification_mode = ?`; params.push(filterMode); }
    if (filterResult) { query += ` AND verification_result = ?`; params.push(filterResult); }

    query += ` ORDER BY verified_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const events = queryAll(query, params);

    const countResult = queryOne(
      `SELECT COUNT(*) as count FROM verification_events WHERE institution_id = ?`,
      [institution.id]
    );

    res.json({ events, total: countResult?.count || 0, page, limit });
  } catch (err) {
    console.error('Get verification logs error:', err);
    res.status(500).json({ error: 'Failed to fetch verification logs' });
  }
});

// GET /api/institution/stats — quick stats for the dashboard header
router.get('/stats', authMiddleware, requireRole('institution'), requireApprovedInstitution, (req, res) => {
  try {
    const institution = req.institution || getInstitution(req.user.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const total = queryOne('SELECT COUNT(*) as count FROM applications WHERE institution_id = ?', [institution.id]);
    const pending = queryOne("SELECT COUNT(*) as count FROM applications WHERE institution_id = ? AND status = 'pending'", [institution.id]);
    const approved = queryOne("SELECT COUNT(*) as count FROM applications WHERE institution_id = ? AND status IN ('inst_approved','issued')", [institution.id]);
    const issued = queryOne("SELECT COUNT(*) as count FROM applications WHERE institution_id = ? AND status = 'issued'", [institution.id]);
    const rejected = queryOne("SELECT COUNT(*) as count FROM applications WHERE institution_id = ? AND status = 'rejected'", [institution.id]);
    const recentScans = queryOne("SELECT COUNT(*) as count FROM verification_events WHERE institution_id = ? AND verified_at > datetime('now', '-24 hours')", [institution.id]);

    res.json({
      total: total?.count || 0,
      pending: pending?.count || 0,
      approved: approved?.count || 0,
      issued: issued?.count || 0,
      rejected: rejected?.count || 0,
      recentScans: recentScans?.count || 0,
      institution
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

