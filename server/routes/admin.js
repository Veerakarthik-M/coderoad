// Admin routes — KSRTC admin: final approval, credential issuance, revocation
import { Router } from 'express';
import { authMiddleware, requireRole } from './auth.js';
import { queryOne, queryAll, execute, saveDb } from '../db.js';
import { signCredential } from '../crypto/sign.js';

const router = Router();

// GET /api/admin/applications — get all institution-approved applications
router.get('/applications', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const applications = queryAll(
      `SELECT a.*, u.name as student_name, u.email as student_email, u.phone as student_phone,
       i.name as institution_name, i.place as institution_place, i.district as institution_district
       FROM applications a
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       ORDER BY 
         CASE a.status 
           WHEN 'inst_approved' THEN 1
           WHEN 'approved' THEN 2
           WHEN 'issued' THEN 3
           WHEN 'pending' THEN 4
           WHEN 'rejected' THEN 5
         END,
         a.created_at DESC`
    );
    res.json({ applications });
  } catch (err) {
    console.error('Admin get applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/admin/approve/:id — approve and issue credential
router.post('/approve/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const app = queryOne(
      `SELECT a.*, u.name as student_name, i.name as institution_name
       FROM applications a
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       WHERE a.id = ? AND a.status = 'inst_approved'`,
      [req.params.id]
    );
    if (!app) {
      return res.status(404).json({ error: 'Application not found or not institution-approved' });
    }

    // Generate credential ID
    const credentialId = `ANV-${new Date().getFullYear()}-${String(app.id).padStart(6, '0')}`;

    // Set validity: from today to end of current academic year (March 31)
    const now = new Date();
    const validFrom = now.toISOString().split('T')[0];
    const yearEnd = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
    const validTo = `${yearEnd}-03-31`;

    // Build credential payload
    const payload = {
      cid: credentialId,
      sid: app.roll_no,
      name: app.student_name,
      inst: app.institution_name,
      route: `${app.route_from} → ${app.route_to}`,
      km: app.distance_km,
      type: 'Student Concession',
      from: validFrom,
      to: validTo,
      iss: 'KSRTC-ANAVANDI',
      iat: Math.floor(Date.now() / 1000)
    };

    // Sign the credential
    const jwsToken = await signCredential(payload);

    // Store credential
    execute(
      `INSERT INTO credentials (application_id, credential_id, jws_token, valid_from, valid_to)
       VALUES (?, ?, ?, ?, ?)`,
      [app.id, credentialId, jwsToken, validFrom, validTo]
    );

    // Update application status
    execute(
      "UPDATE applications SET status = 'issued', updated_at = datetime('now') WHERE id = ?",
      [app.id]
    );

    saveDb();

    res.json({
      message: 'Credential issued successfully',
      credentialId,
      validFrom,
      validTo
    });
  } catch (err) {
    console.error('Admin approve error:', err);
    res.status(500).json({ error: 'Credential issuance failed' });
  }
});

// POST /api/admin/reject/:id — reject application
router.post('/reject/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { reason } = req.body;
    const app = queryOne(
      'SELECT * FROM applications WHERE id = ? AND status = ?',
      [req.params.id, 'inst_approved']
    );
    if (!app) {
      return res.status(404).json({ error: 'Application not found or not institution-approved' });
    }

    execute(
      "UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?",
      [reason || 'Rejected by KSRTC', req.params.id]
    );
    saveDb();

    res.json({ message: 'Application rejected', status: 'rejected' });
  } catch (err) {
    console.error('Admin reject error:', err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// POST /api/admin/revoke/:credentialId — revoke an issued credential
router.post('/revoke/:credentialId', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { reason } = req.body;
    const credential = queryOne(
      'SELECT * FROM credentials WHERE credential_id = ? AND revoked = 0',
      [req.params.credentialId]
    );
    if (!credential) {
      return res.status(404).json({ error: 'Active credential not found' });
    }

    execute(
      "UPDATE credentials SET revoked = 1, revoked_at = datetime('now'), revoke_reason = ? WHERE credential_id = ?",
      [reason || 'Revoked by KSRTC Admin', req.params.credentialId]
    );
    saveDb();

    res.json({ message: 'Credential revoked', credentialId: req.params.credentialId });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ error: 'Revocation failed' });
  }
});

// GET /api/admin/stats — dashboard statistics
router.get('/stats', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const total = queryOne('SELECT COUNT(*) as count FROM applications');
    const pending = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'");
    const instApproved = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'inst_approved'");
    const issued = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'issued'");
    const rejected = queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'");
    const revoked = queryOne('SELECT COUNT(*) as count FROM credentials WHERE revoked = 1');
    const active = queryOne('SELECT COUNT(*) as count FROM credentials WHERE revoked = 0');

    res.json({
      total: total.count,
      pending: pending.count,
      instApproved: instApproved.count,
      issued: issued.count,
      rejected: rejected.count,
      revokedCredentials: revoked.count,
      activeCredentials: active.count
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/credentials — list all issued credentials
router.get('/credentials', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const credentials = queryAll(
      `SELECT c.*, a.roll_no, a.route_from, a.route_to, a.course,
       u.name as student_name, i.name as institution_name
       FROM credentials c
       JOIN applications a ON c.application_id = a.id
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       ORDER BY c.created_at DESC`
    );
    res.json({ credentials });
  } catch (err) {
    console.error('Get credentials error:', err);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

export default router;
