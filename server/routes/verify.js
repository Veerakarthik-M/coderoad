// Verification routes — online verification + revocation list for conductor sync
import { Router } from 'express';
import { queryOne, queryAll } from '../db.js';
import { getPublicKeyJWK } from '../crypto/sign.js';

const router = Router();

// GET /api/verify/public-key — get the public key JWK for client-side verification
// This is fetched once by the conductor app and cached locally
router.get('/public-key', (req, res) => {
  try {
    const jwk = getPublicKeyJWK();
    res.json(jwk);
  } catch (err) {
    console.error('Public key fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// GET /api/verify/revocations — get list of revoked credential IDs
// Conductor app syncs this periodically when online
// ?since=ISO_DATE — only get revocations after this date
router.get('/revocations', (req, res) => {
  try {
    const since = req.query.since;
    let revocations;
    
    if (since) {
      revocations = queryAll(
        `SELECT credential_id, revoked_at FROM credentials 
         WHERE revoked = 1 AND revoked_at > ?
         ORDER BY revoked_at DESC`,
        [since]
      );
    } else {
      revocations = queryAll(
        `SELECT credential_id, revoked_at FROM credentials 
         WHERE revoked = 1
         ORDER BY revoked_at DESC`
      );
    }

    res.json({
      revocations: revocations.map(r => r.credential_id),
      syncedAt: new Date().toISOString(),
      count: revocations.length
    });
  } catch (err) {
    console.error('Revocations fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch revocations' });
  }
});

// GET /api/verify/online/:credentialId — full online verification
// Returns credential status + student details + photo
router.get('/online/:credentialId', (req, res) => {
  try {
    const credential = queryOne(
      `SELECT c.*, a.roll_no, a.route_from, a.route_to, a.course, a.photo_path,
       u.name as student_name, u.email as student_email,
       i.name as institution_name, i.place as institution_place
       FROM credentials c
       JOIN applications a ON c.application_id = a.id
       JOIN users u ON a.student_user_id = u.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       WHERE c.credential_id = ?`,
      [req.params.credentialId]
    );

    if (!credential) {
      return res.status(404).json({ valid: false, reason: 'Credential not found' });
    }

    if (credential.revoked) {
      return res.json({
        valid: false,
        reason: 'REVOKED',
        revokedAt: credential.revoked_at,
        revokeReason: credential.revoke_reason,
        studentName: credential.student_name
      });
    }

    const now = new Date();
    const validTo = new Date(credential.valid_to);
    if (now > validTo) {
      return res.json({
        valid: false,
        reason: 'EXPIRED',
        validTo: credential.valid_to,
        studentName: credential.student_name
      });
    }

    res.json({
      valid: true,
      studentName: credential.student_name,
      rollNo: credential.roll_no,
      institution: credential.institution_name,
      institutionPlace: credential.institution_place,
      course: credential.course,
      route: `${credential.route_from} → ${credential.route_to}`,
      validFrom: credential.valid_from,
      validTo: credential.valid_to,
      credentialId: credential.credential_id,
      photoPath: credential.photo_path
    });
  } catch (err) {
    console.error('Online verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
