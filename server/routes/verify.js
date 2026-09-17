// Verification routes — online verification, revocation list, and travel event recording
import { Router } from 'express';
import { queryOne, queryAll, execute, saveDb } from '../db.js';
import { getPublicKeyJWK } from '../crypto/sign.js';
import { authMiddleware, requireRole } from './auth.js';

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
// Returns credential status + student details
router.get('/online/:credentialId', (req, res) => {
  try {
    const credential = queryOne(
      `SELECT c.*, a.roll_no, a.route_from, a.route_to, a.course, a.photo_path,
       a.department, a.year_of_study, a.semester,
       u.name as student_name, u.email as student_email, u.id as student_uid,
       i.name as institution_name, i.place as institution_place, i.id as institution_id
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
      studentUid: credential.student_uid,
      rollNo: credential.roll_no,
      institution: credential.institution_name,
      institutionId: credential.institution_id,
      institutionPlace: credential.institution_place,
      course: credential.course,
      department: credential.department,
      yearOfStudy: credential.year_of_study,
      routeFrom: credential.route_from,
      routeTo: credential.route_to,
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

// POST /api/verify/event — record a single verification/travel event
// Called by conductor when online after scanning
// Auth is optional — conductor token preferred but not strictly required
// so offline events uploaded later don't get blocked
router.post('/event', (req, res) => {
  try {
    const {
      credentialId, studentName, institutionName, institutionId, studentUserId,
      routeFrom, routeTo, passId, conductorId, conductorName,
      verificationMode, verificationResult, verifiedAt, deviceId, notes
    } = req.body;

    if (!credentialId || !verificationMode || !verificationResult || !verifiedAt) {
      return res.status(400).json({ error: 'Missing required fields: credentialId, verificationMode, verificationResult, verifiedAt' });
    }

    const eventId = execute(
      `INSERT INTO verification_events (
        credential_id, student_name, institution_name, institution_id, student_user_id,
        route_from, route_to, pass_id, conductor_id, conductor_name,
        verification_mode, verification_result, verified_at, device_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        credentialId, studentName || null, institutionName || null, institutionId || null, studentUserId || null,
        routeFrom || null, routeTo || null, passId || credentialId, conductorId || null, conductorName || null,
        verificationMode, verificationResult, verifiedAt, deviceId || null, notes || null
      ]
    );

    saveDb();
    res.status(201).json({ id: eventId, message: 'Event recorded' });
  } catch (err) {
    console.error('Record event error:', err);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// POST /api/verify/events/batch — batch upload offline verification events
// Called when conductor comes back online to sync stored events
router.post('/events/batch', (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required and must not be empty' });
    }

    const results = [];
    for (const ev of events) {
      try {
        const eventId = execute(
          `INSERT INTO verification_events (
            credential_id, student_name, institution_name, institution_id, student_user_id,
            route_from, route_to, pass_id, conductor_id, conductor_name,
            verification_mode, verification_result, verified_at, device_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ev.credentialId, ev.studentName || null, ev.institutionName || null,
            ev.institutionId || null, ev.studentUserId || null,
            ev.routeFrom || null, ev.routeTo || null, ev.passId || ev.credentialId,
            ev.conductorId || null, ev.conductorName || null,
            ev.verificationMode || 'OFFLINE', ev.verificationResult,
            ev.verifiedAt, ev.deviceId || null, ev.notes || null
          ]
        );
        results.push({ localId: ev.localId, serverId: eventId, status: 'synced' });
      } catch (e) {
        results.push({ localId: ev.localId, status: 'failed', error: e.message });
      }
    }

    saveDb();
    res.json({ synced: results.filter(r => r.status === 'synced').length, total: events.length, results });
  } catch (err) {
    console.error('Batch event error:', err);
    res.status(500).json({ error: 'Batch upload failed' });
  }
});

export default router;
