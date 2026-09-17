// Institution routes — review and approve/reject student applications
import { Router } from 'express';
import { authMiddleware, requireRole } from './auth.js';
import { queryOne, queryAll, execute, saveDb } from '../db.js';

const router = Router();

// GET /api/institution/applications — get all applications for this institution
router.get('/applications', authMiddleware, requireRole('institution'), (req, res) => {
  try {
    const institution = queryOne('SELECT id FROM institutions WHERE user_id = ?', [req.user.id]);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

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

    res.json({ applications, institutionId: institution.id });
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/institution/approve/:id — approve a student application
router.post('/approve/:id', authMiddleware, requireRole('institution'), (req, res) => {
  try {
    const institution = queryOne('SELECT id FROM institutions WHERE user_id = ?', [req.user.id]);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const app = queryOne(
      'SELECT * FROM applications WHERE id = ? AND institution_id = ? AND status = ?',
      [req.params.id, institution.id, 'pending']
    );
    if (!app) {
      return res.status(404).json({ error: 'Application not found or not pending' });
    }

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
router.post('/reject/:id', authMiddleware, requireRole('institution'), (req, res) => {
  try {
    const { reason } = req.body;
    const institution = queryOne('SELECT id FROM institutions WHERE user_id = ?', [req.user.id]);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const app = queryOne(
      'SELECT * FROM applications WHERE id = ? AND institution_id = ? AND status = ?',
      [req.params.id, institution.id, 'pending']
    );
    if (!app) {
      return res.status(404).json({ error: 'Application not found or not pending' });
    }

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

export default router;
