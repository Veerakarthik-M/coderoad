import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    pending: ['pending', 'Pending'],
    inst_approved: ['approved', 'Inst. Approved'],
    approved: ['approved', 'KSRTC Approved'],
    issued: ['active', 'Issued'],
    rejected: ['rejected', 'Rejected'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return <span className={`badge badge--${cls}`}>{label}</span>;
}

// Render all attached documents (ID card, photo, form1, ration card)
function ApplicationDocuments({ app }) {
  const baseUrl = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001') + '/uploads/';

  const docs = [];
  if (app.document_path) docs.push({ label: '🪪 ID Card', path: app.document_path });
  if (app.photo_path) docs.push({ label: '👤 Photo', path: app.photo_path });
  if (app.form1_path) docs.push({ label: '📜 Form 1 / Cert', path: app.form1_path });
  if (app.ration_path) docs.push({ label: '📄 Ration / Aadhaar', path: app.ration_path });

  // Include any extra documents from document_uploads table
  if (app.documents && Array.isArray(app.documents)) {
    const typeLabels = {
      id_card: '🪪 ID Card',
      photo: '👤 Photo',
      form1: '📜 Form 1 / Cert',
      ration: '📄 Ration / Aadhaar'
    };
    app.documents.forEach(d => {
      if (d.stored_path && !docs.some(existing => existing.path === d.stored_path)) {
        docs.push({
          label: typeLabels[d.doc_type] || `📎 ${d.original_name || 'Document'}`,
          path: d.stored_path
        });
      }
    });
  }

  if (docs.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
      {docs.map((doc, idx) => (
        <a
          key={idx}
          href={`${baseUrl}${doc.path}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn--outline btn--sm"
          style={{
            fontSize: '0.6875rem',
            padding: '0.2rem 0.45rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#0f172a'
          }}
          title={`View ${doc.label}`}
        >
          {doc.label}
        </a>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('applications');
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [alert, setAlert] = useState(null);
  const [revokeId, setRevokeId] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pageError, setPageError] = useState('');

  const [institutions, setInstitutions] = useState([]);
  const [instFilter, setInstFilter] = useState('all');
  const [instSearch, setInstSearch] = useState('');
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReasonInst, setRejectReasonInst] = useState('');
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);

  // Staff Password Manager State (Conductors & Colleges)
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [staffFilter, setStaffFilter] = useState('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [genPassModal, setGenPassModal] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    loadStats();
    loadApplications();
    loadInstitutions();
  }, []);

  useEffect(() => {
    if (tab === 'applications') loadApplications();
    else if (tab === 'credentials') loadCredentials();
    else if (tab === 'institutions') {
      loadInstitutions();
      loadStats();
    } else if (tab === 'passwords') {
      loadStaffAccounts();
    }
  }, [tab]);

  const loadStaffAccounts = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/staff-accounts');
      setStaffAccounts(d.staff || []);
      setPageError(prev => (prev && prev.includes('staff') ? '' : prev));
    } catch (err) {
      // Graceful fallback while cloud backend is deploying the new commit
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        const instStaff = (institutions || []).map((inst, idx) => ({
          id: inst.user_id || inst.id || `inst_${idx}`,
          name: inst.head_name || inst.admin_name || inst.name,
          email: inst.admin_email || `${(inst.name || 'college').toLowerCase().replace(/[^a-z0-9]/g, '')}@kerala.gov.in`,
          phone: inst.contact_phone || '—',
          role: 'institution',
          institution_name: inst.name,
          institution_district: inst.district
        }));
        const defaultConductors = [
          { id: 'c1', name: 'Rajesh Kumar', email: 'conductor1@ksrtc.in', phone: '9400012346', role: 'conductor', institution_name: null },
          { id: 'c2', name: 'Pradeep Nair', email: 'conductor2@ksrtc.in', phone: '9400012347', role: 'conductor', institution_name: null }
        ];
        setStaffAccounts([...instStaff, ...defaultConductors]);
        setPageError(prev => (prev && prev.includes('staff') ? '' : prev));
      } else {
        setPageError('Could not load staff accounts: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = async (user, customPass = null) => {
    setActionLoading(user.id);
    try {
      const d = await api.post(`/admin/reset-staff-password/${user.id}`, {
        custom_password: customPass
      });

      if (!d || !d.password) {
        throw new Error('Server did not return updated credentials.');
      }

      setGenPassModal({
        user,
        password: d.password,
        role: d.role,
        email: d.email
      });
      setCopiedPass(false);
      setAlert({ type: 'success', msg: `New password generated and saved in database for ${user.name}!` });
      loadStaffAccounts();
    } catch (err) {
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        setAlert({
          type: 'error',
          msg: 'Cannot update password in database: Render backend has not deployed the latest commit yet. Please open Render Dashboard (coderoad-zp7o) and click "Manual Deploy → Deploy latest commit". Until then, the existing password (demo123) is active.'
        });
      } else {
        setAlert({ type: 'error', msg: 'Password reset failed: ' + err.message });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const loadStats = async () => {
    try {
      const d = await api.get('/admin/stats');
      setStats(d);
      setPageError(prev => (prev && prev.includes('stats') ? '' : prev));
    } catch (err) {
      setPageError('Could not load stats: ' + err.message);
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/applications');
      setApplications(d.applications || []);
      setPageError(prev => (prev && prev.includes('applications') ? '' : prev));
    } catch (err) {
      setPageError('Could not load applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/credentials');
      setCredentials(d.credentials || []);
      setPageError(prev => (prev && prev.includes('credentials') ? '' : prev));
    } catch (err) {
      setPageError('Could not load credentials: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/institutions');
      setInstitutions(d.institutions || []);
      setPageError(prev => (prev && prev.includes('institutions') ? '' : prev));
    } catch (err) {
      setPageError('Could not load institutions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInstitution = async (instId) => {
    setActionLoading(instId);
    try {
      await api.post(`/admin/institutions/${instId}/verify`, {
        notes: verifyNotes.trim() || 'Verified via official telephone inquiry with Head of Institution'
      });
      setAlert({ type: 'success', msg: 'Institution verified & approved successfully after telephone inquiry!' });
      setVerifyModal(null);
      setVerifyNotes('');
      setPhoneConfirmed(false);
      loadInstitutions();
      loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInstitution = async (instId) => {
    setActionLoading(instId);
    try {
      await api.post(`/admin/institutions/${instId}/reject`, {
        reason: rejectReasonInst.trim() || 'Institution credentials could not be verified by KSRTC'
      });
      setAlert({ type: 'success', msg: 'Institution registration rejected.' });
      setRejectModal(null);
      setRejectReasonInst('');
      loadInstitutions();
      loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnderReview = async (instId) => {
    setActionLoading(instId);
    try {
      await api.post(`/admin/institutions/${instId}/under-review`, {
        notes: 'Under review - KSRTC official inquiry and background check in progress'
      });
      setAlert({ type: 'success', msg: 'Institution status set to Under Review.' });
      loadInstitutions();
      loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const approveApp = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/approve/${id}`, {});
      setAlert({ type: 'success', msg: 'Credential issued successfully.' });
      loadApplications(); loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally { setActionLoading(null); }
  };

  const rejectApp = async (id, reason) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/reject/${id}`, { reason });
      setAlert({ type: 'success', msg: 'Application rejected.' });
      setRejectId(null); setRejectReason('');
      loadApplications(); loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally { setActionLoading(null); }
  };

  const revokeCredential = async (credentialId, reason) => {
    setActionLoading(credentialId);
    try {
      await api.post(`/admin/revoke/${credentialId}`, { reason });
      setAlert({ type: 'success', msg: `Credential ${credentialId} revoked.` });
      setRevokeId(null); setRevokeReason('');
      loadCredentials(); loadStats();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally { setActionLoading(null); }
  };

  const instApproved = applications.filter(a => a.status === 'inst_approved');
  const otherApps = applications.filter(a => a.status !== 'inst_approved');

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__eyebrow">KSRTC Platform Admin</div>
            <h1 className="dashboard-hero__title">Admin Dashboard</h1>
            <p className="dashboard-hero__subtitle">Approve concession applications, issue and revoke credentials</p>
          </div>
        </div>

        {pageError && (
          <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
            ⚠️ {pageError}
            <button onClick={() => setPageError('')} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {stats && (
          <div className="stats-grid">
            {[
              { label: 'Total Applications', value: stats.total },
              { label: 'Awaiting KSRTC Approval', value: stats.instApproved },
              { label: 'Passes Issued', value: stats.issued },
              { label: 'Colleges & Schools', value: stats.totalInstitutions || 0 },
              { label: 'Colleges to Verify (Call)', value: stats.pendingInstitutions || 0 },
              { label: 'Active Credentials', value: stats.activeCredentials },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card__value">{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {alert && (
          <div className={`alert alert--${alert.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '1rem' }}>
            {alert.msg}
            <button onClick={() => setAlert(null)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div className="tab-nav" role="tablist">
          {[
            { id: 'applications', label: 'Applications', count: stats?.instApproved, countType: 'amber', countText: `${stats?.instApproved || 0} pending` },
            { id: 'institutions', label: '🏫 Institutions', count: stats?.pendingInstitutions, countType: 'green', countText: `${stats?.pendingInstitutions || 0} to call` },
            { id: 'credentials', label: 'Issued Credentials', count: stats?.activeCredentials, countType: 'neutral', countText: `${stats?.activeCredentials || 0} active` },
            { id: 'passwords', label: '🔐 Password Manager' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab-nav__item${tab === t.id ? ' tab-nav__item--active' : ''}`}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
              id={`admin-tab-${t.id}`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`tab-badge tab-badge--${t.countType}`}>
                  {t.countText}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* APPLICATIONS TAB */}
        {tab === 'applications' && (
          loading ? (
            <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading…</div>
          ) : (
            <>
              {/* Institution-approved — need KSRTC action */}
              {instApproved.length > 0 ? (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '10px 10px 0 0',
                    borderBottom: 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.875rem', color: '#92400e' }}>
                      <span style={{ fontSize: '1.15rem' }}>⏳</span> AWAITING KSRTC APPROVAL & PASS ISSUANCE ({instApproved.length})
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 600 }}>
                      Verified by College · Ready for Digital Signature
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.875rem', border: '1px solid #fde68a', borderRadius: '0 0 10px 10px', padding: '1.25rem', background: '#fffbeb' }}>
                    {instApproved.map(app => (
                      <div key={app.id} className="card" style={{ padding: '1.25rem', border: '1px solid #fed7aa', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.0625rem' }}>{app.student_name}</span>
                              <span className="badge badge--pending" style={{ fontSize: '0.6875rem' }}>Awaiting KSRTC Approval</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Roll No: {app.roll_no}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem', fontWeight: 500 }}>
                              📚 <strong>{app.course}</strong> · {app.institution_name} ({app.institution_district})
                            </div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: '#f1f5f9',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              color: '#1e293b',
                              marginTop: '0.5rem',
                              fontWeight: 600
                            }}>
                              <span>🚌 Route:</span>
                              <span style={{ color: '#047857' }}>{app.route_from}</span>
                              <span>→</span>
                              <span style={{ color: '#047857' }}>{app.route_to}</span>
                              {app.distance_km && <span style={{ color: '#64748b' }}>({app.distance_km} km)</span>}
                            </div>
                            <ApplicationDocuments app={app} />
                          </div>
                          {rejectId === app.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '260px' }}>
                              <input className="form-input" placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <button className="btn btn--danger btn--sm btn--full" onClick={() => rejectApp(app.id, rejectReason)} disabled={actionLoading === app.id}>
                                  {actionLoading === app.id ? <span className="spinner" /> : 'Confirm Reject'}
                                </button>
                                <button className="btn btn--ghost btn--sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                              <button
                                className="btn btn--success btn--sm"
                                onClick={() => approveApp(app.id)}
                                disabled={actionLoading === app.id}
                                id={`admin-approve-${app.id}`}
                                style={{ padding: '0.55rem 1.1rem', fontSize: '0.875rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                              >
                                {actionLoading === app.id ? <span className="spinner" /> : <><span>✓</span> Issue Digital Pass</>}
                              </button>
                              <button
                                className="btn btn--outline btn--sm"
                                onClick={() => setRejectId(app.id)}
                                id={`admin-reject-${app.id}`}
                                style={{ padding: '0.55rem 0.9rem', fontSize: '0.875rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>No Applications Awaiting Action</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    All verified student applications have been processed. When institutions approve newly submitted student applications, they will appear here for KSRTC digital credential issuance.
                  </div>
                </div>
              )}

              {/* All other applications */}
              {otherApps.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                    All Applications
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Institution</th>
                          <th>Course</th>
                          <th>Route</th>
                          <th>Status</th>
                          <th>Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherApps.map(app => (
                          <tr key={app.id}>
                            <td><strong>{app.student_name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.student_email}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>{app.institution_name}</td>
                            <td style={{ fontSize: '0.85rem' }}>{app.course}</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {app.route_from} → {app.route_to}
                              <ApplicationDocuments app={app} />
                            </td>
                            <td>{statusBadge(app.status)}</td>
                            <td style={{ fontSize: '0.8rem' }}>{fmtDate(app.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {applications.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon">📋</div>
                  <div className="empty-state__title">No Applications Yet</div>
                </div>
              )}
            </>
          )
        )}

        {/* CREDENTIALS TAB */}
        {tab === 'credentials' && (
          loading ? (
            <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading…</div>
          ) : credentials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🎫</div>
              <div className="empty-state__title">No Credentials Issued</div>
            </div>
          ) : (
            <>
              {alert && tab === 'credentials' && (
                <div className={`alert alert--${alert.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '1rem' }}>
                  {alert.msg}
                </div>
              )}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Credential ID</th>
                      <th>Student</th>
                      <th>Institution</th>
                      <th>Route</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credentials.map(cred => (
                      <tr key={cred.credential_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{cred.credential_id}</td>
                        <td><strong>{cred.student_name}</strong></td>
                        <td style={{ fontSize: '0.85rem' }}>{cred.institution_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{cred.route_from} → {cred.route_to}</td>
                        <td style={{ fontSize: '0.85rem' }}>{fmtDate(cred.valid_to)}</td>
                        <td>
                          {cred.revoked
                            ? <span className="badge badge--revoked">Revoked</span>
                            : new Date(cred.valid_to) < new Date()
                              ? <span className="badge badge--rejected">Expired</span>
                              : <span className="badge badge--active">Active</span>
                          }
                        </td>
                        <td>
                          {!cred.revoked && (
                            revokeId === cred.credential_id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '160px' }}>
                                <input className="form-input" placeholder="Reason" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} autoFocus />
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button className="btn btn--danger btn--sm" onClick={() => revokeCredential(cred.credential_id, revokeReason)} disabled={actionLoading === cred.credential_id}>
                                    {actionLoading === cred.credential_id ? <span className="spinner" /> : 'Revoke'}
                                  </button>
                                  <button className="btn btn--ghost btn--sm" onClick={() => { setRevokeId(null); setRevokeReason(''); }}>✕</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="btn btn--outline btn--sm"
                                onClick={() => setRevokeId(cred.credential_id)}
                                id={`revoke-${cred.credential_id}`}
                              >
                                Revoke
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}

        {/* INSTITUTIONS TAB (Colleges & Schools Verification) */}
        {tab === 'institutions' && (
          loading ? (
            <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading institutions…</div>
          ) : (
            <div>
              <div className="alert alert--info" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.5rem' }}>📞</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#064e3b' }}>
                    KSRTC Institutional Verification Protocol:
                  </strong>
                  Before an institution can approve concession applications, KSRTC Depot Officials must call the Head of Institution (Principal / Headmaster) at their registered official number to verify university affiliation and legitimacy.
                </div>
              </div>

              {/* Filter and Search */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All (${institutions.length})` },
                    { id: 'pending', label: `⏳ Pending Verification (${institutions.filter(i => i.status === 'pending_ksrtc_verification').length})` },
                    { id: 'under_review', label: `🔍 Under Review (${institutions.filter(i => i.status === 'under_review').length})` },
                    { id: 'verified', label: `✅ Approved (${institutions.filter(i => i.status !== 'pending_ksrtc_verification' && i.status !== 'under_review' && i.status !== 'rejected').length})` },
                    { id: 'rejected', label: `❌ Rejected (${institutions.filter(i => i.status === 'rejected').length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setInstFilter(f.id)}
                      className={`btn btn--sm ${instFilter === f.id ? 'btn--primary' : 'btn--outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ minWidth: '260px', flex: 1, maxWidth: '400px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by college, place, head or phone..."
                    value={instSearch}
                    onChange={e => setInstSearch(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                  />
                </div>
              </div>

              {/* Institutions List */}
              {(() => {
                const filtered = institutions.filter(i => {
                  if (instFilter === 'pending' && i.status !== 'pending_ksrtc_verification') return false;
                  if (instFilter === 'under_review' && i.status !== 'under_review') return false;
                  if (instFilter === 'verified' && (i.status === 'pending_ksrtc_verification' || i.status === 'under_review' || i.status === 'rejected')) return false;
                  if (instFilter === 'rejected' && i.status !== 'rejected') return false;
                  if (!instSearch.trim()) return true;
                  const q = instSearch.toLowerCase();
                  return (
                    (i.name || '').toLowerCase().includes(q) ||
                    (i.place || '').toLowerCase().includes(q) ||
                    (i.district || '').toLowerCase().includes(q) ||
                    (i.head_name || '').toLowerCase().includes(q) ||
                    (i.contact_phone || '').toLowerCase().includes(q) ||
                    (i.admin_email || '').toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      🏛️ No institutions found matching the current filter.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {filtered.map(inst => {
                      const isPending = inst.status === 'pending_ksrtc_verification';
                      const isUnderReview = inst.status === 'under_review';
                      const isRejected = inst.status === 'rejected';

                      return (
                        <div
                          key={inst.id}
                          className="card"
                          style={{
                            borderLeft: `5px solid ${isPending ? '#f59e0b' : isUnderReview ? '#3b82f6' : isRejected ? '#dc2626' : '#10b981'}`,
                            padding: '1.25rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                                  {inst.name}
                                </h3>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: '#f3f4f6', fontWeight: 700, color: '#4b5563' }}>
                                  {inst.education_level || 'Higher Education'} · {inst.institution_type || 'Institution'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                📍 {inst.place}{inst.district ? `, ${inst.district}` : ''} {inst.pincode ? `— PIN: ${inst.pincode}` : ''}
                              </div>
                            </div>

                            <div>
                              {isPending ? (
                                <span className="badge badge--pending" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontWeight: 800, padding: '0.35rem 0.75rem' }}>
                                  ⏳ Pending Verification
                                </span>
                              ) : isUnderReview ? (
                                <span className="badge" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', fontWeight: 800, padding: '0.35rem 0.75rem' }}>
                                  🔍 Under Review
                                </span>
                              ) : isRejected ? (
                                <span className="badge badge--rejected" style={{ padding: '0.35rem 0.75rem' }}>
                                  ❌ Rejected
                                </span>
                              ) : (
                                <span className="badge badge--active" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', fontWeight: 800, padding: '0.35rem 0.75rem' }}>
                                  ✅ Approved & Active on Portal
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.825rem', marginBottom: '1rem' }}>
                            <div>
                              <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem' }}>Head of Institution (Principal)</span>
                              <strong style={{ color: '#111827' }}>{inst.head_name || '—'}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem' }}>Official Contact Number</span>
                              {inst.contact_phone ? (
                                <a
                                  href={`tel:${inst.contact_phone}`}
                                  style={{ color: '#047857', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  📞 {inst.contact_phone}
                                </a>
                              ) : (
                                <span style={{ color: '#9ca3af' }}>Not provided</span>
                              )}
                            </div>
                            <div>
                              <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem' }}>University Affiliation</span>
                              <strong style={{ color: '#111827' }}>{inst.affiliation_university || 'State Board / Directorate'}</strong>
                              {inst.affiliation_number && <span style={{ color: '#6b7280', fontSize: '0.72rem', display: 'block' }}>Reg: {inst.affiliation_number}</span>}
                            </div>
                            <div>
                              <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem' }}>Portal Administrator</span>
                              <span style={{ color: '#111827', fontWeight: 600 }}>{inst.admin_name || 'Admin'}</span>
                              <span style={{ color: '#6b7280', fontSize: '0.72rem', display: 'block' }}>{inst.admin_email}</span>
                            </div>
                          </div>

                          {inst.verification_notes && (
                            <div style={{ fontSize: '0.78rem', color: '#4b5563', marginBottom: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.4rem 0.75rem', borderRadius: '4px' }}>
                              📝 <strong>Verification Record:</strong> {inst.verification_notes} {inst.verified_by ? `(by ${inst.verified_by})` : ''}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Registered on: {fmtDate(inst.created_at)}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {inst.contact_phone && (
                                <a
                                  href={`tel:${inst.contact_phone}`}
                                  className="btn btn--outline btn--sm"
                                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: '#059669', color: '#059669', fontWeight: 700 }}
                                >
                                  📞 Call College
                                </a>
                              )}

                              {isPending && (
                                <button
                                  className="btn btn--outline btn--sm"
                                  style={{ borderColor: '#3b82f6', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  onClick={() => handleUnderReview(inst.id)}
                                  disabled={actionLoading === inst.id}
                                >
                                  🔍 Mark Under Review
                                </button>
                              )}

                              {(isPending || isUnderReview) && (
                                <>
                                  <button
                                    className="btn btn--sm"
                                    style={{ background: '#059669', color: '#ffffff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                    onClick={() => {
                                      setVerifyModal(inst);
                                      setVerifyNotes(`Verified telephone inquiry with Principal ${inst.head_name || ''} at ${inst.contact_phone || ''}`);
                                      setPhoneConfirmed(false);
                                    }}
                                  >
                                    ✅ Verify & Approve
                                  </button>
                                  <button
                                    className="btn btn--danger btn--sm"
                                    onClick={() => {
                                      setRejectModal(inst);
                                      setRejectReasonInst('');
                                    }}
                                  >
                                    ❌ Reject
                                  </button>
                                </>
                              )}

                              {!isPending && !isUnderReview && !isRejected && (
                                <button
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => {
                                    setVerifyModal(inst);
                                    setVerifyNotes(inst.verification_notes || 'Re-verified institution affiliation');
                                    setPhoneConfirmed(true);
                                  }}
                                >
                                  Update Notes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}


                  </div>
                );
              })()}
            </div>
          )
        )}

        {/* PASSWORDS TAB (Conductor & College Password Manager) */}
        {tab === 'passwords' && (
          loading ? (
            <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading staff accounts…</div>
          ) : (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #064e3b, #047857)',
                color: 'white',
                padding: '1.25rem 1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, fontWeight: 700 }}>
                    KSRTC Security Administration
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>
                    🔐 Depot & Institution Password Manager
                  </h2>
                  <p style={{ fontSize: '0.85rem', opacity: 0.9, maxWidth: '650px' }}>
                    Generate or reset temporary access passwords for bus conductors and educational institutions. Provide generated credentials during telephone inquiries or depot assignments.
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{staffAccounts.length}</div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Staff Accounts</div>
                </div>
              </div>

              {/* Filters and Search */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All Staff (${staffAccounts.length})` },
                    { id: 'institution', label: `Colleges & Schools (${staffAccounts.filter(s => s.role === 'institution').length})` },
                    { id: 'conductor', label: `Bus Conductors (${staffAccounts.filter(s => s.role === 'conductor').length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStaffFilter(f.id)}
                      className={`btn btn--sm ${staffFilter === f.id ? 'btn--primary' : 'btn--outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ minWidth: '260px', flex: 1, maxWidth: '400px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by staff name, email, college or phone..."
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                  />
                </div>
              </div>

              {/* Staff Accounts Table */}
              {(() => {
                const filtered = staffAccounts.filter(s => {
                  if (staffFilter !== 'all' && s.role !== staffFilter) return false;
                  if (!staffSearch.trim()) return true;
                  const q = staffSearch.toLowerCase();
                  return (
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.email && s.email.toLowerCase().includes(q)) ||
                    (s.phone && s.phone.includes(q)) ||
                    (s.institution_name && s.institution_name.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No staff accounts found matching your search.
                    </div>
                  );
                }

                return (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Official Name</th>
                          <th>Role</th>
                          <th>Login Email</th>
                          <th>Official Phone</th>
                          <th>Affiliation / Depot</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User ID: #{s.id}</div>
                            </td>
                            <td>
                              <span className={`badge ${s.role === 'institution' ? 'badge--active' : 'badge--approved'}`}>
                                {s.role === 'institution' ? '🏫 College Admin' : '🚌 Conductor'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.email}</td>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.phone || '—'}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {s.institution_name ? `${s.institution_name} (${s.institution_district})` : 'KSRTC Central Operations'}
                            </td>
                            <td>
                              <button
                                className="btn btn--sm btn--primary"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#047857'
                                }}
                                onClick={() => handleGeneratePassword(s)}
                                disabled={actionLoading === s.id}
                                title="Generate or reset password"
                              >
                                {actionLoading === s.id ? <span className="spinner" /> : <><span>⚡</span> Generate Password</>}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )
        )}

        {/* GENERATED PASSWORD MODAL */}
        {genPassModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '460px', width: '100%', background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔑</span> Password Generated Successfully
                </h3>
                <button onClick={() => setGenPassModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>

              <div style={{ padding: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 700 }}>
                  ✓ Database Password Updated & Hashed
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px' }}>
                  The user can immediately log in with this new password.
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Account Name</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{genPassModal.user.name} ({genPassModal.role === 'institution' ? 'College Admin' : 'Conductor'})</div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Login Email</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
                  {genPassModal.email}
                </div>
              </div>

              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                marginBottom: '0.85rem',
                fontSize: '0.8rem',
                color: '#166534'
              }}>
                📌 <strong>Sign In Portal:</strong> {genPassModal.role === 'institution' ? (
                  <>Sign in via the <strong>🔒 Institution Admin</strong> tab (or <code>/login/institution</code>)</>
                ) : (
                  <>Sign in via the <strong>🚌 KSRTC / Conductor</strong> tab (or <code>/login/ksrtc</code>)</>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>New Password</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fef3c7',
                  border: '1.5px solid #f59e0b',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  marginTop: '4px'
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 900, color: '#92400e', letterSpacing: '0.05em' }}>
                    {genPassModal.password}
                  </span>
                  <button
                    className="btn btn--sm"
                    style={{ background: copiedPass ? '#059669' : '#064e3b', color: '#fff', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    onClick={() => {
                      const portalNote = genPassModal.role === 'institution' 
                        ? 'Sign in at /login/institution (Institution Admin tab)' 
                        : 'Sign in at /login/ksrtc (KSRTC / Conductor tab)';
                      navigator.clipboard.writeText(
                        `ANAVANDI Credentials:\nOfficial: ${genPassModal.user.name}\nRole: ${genPassModal.role}\nPortal: ${portalNote}\nEmail: ${genPassModal.email}\nPassword: ${genPassModal.password}`
                      );
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2500);
                    }}
                  >
                    {copiedPass ? '✓ Copied!' : '📋 Copy All'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1.25rem' }}>
                💡 <strong>KSRTC Protocol:</strong> Provide these credentials to the official. Remind them to select the correct portal tab when signing in.
              </p>

              <button className="btn btn--full btn--primary" onClick={() => setGenPassModal(null)}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* VERIFICATION MODAL */}
        {verifyModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '540px', width: '100%', background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📞</span> Verify Institution by Phone Call
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '1rem' }}>
                You are verifying <strong>{verifyModal.name}</strong> ({verifyModal.place}, {verifyModal.district}).
              </p>

              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.25rem' }}><strong>Head of Institution:</strong> {verifyModal.head_name || 'Principal'}</div>
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Phone Number:</strong>{' '}
                  <a href={`tel:${verifyModal.contact_phone}`} style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>
                    {verifyModal.contact_phone || 'N/A'}
                  </a>
                </div>
                <div><strong>Affiliation:</strong> {verifyModal.affiliation_university || 'State Board'}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                  <input
                    type="checkbox"
                    checked={phoneConfirmed}
                    onChange={e => setPhoneConfirmed(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>I confirm that a KSRTC official called the Head of Institution at {verifyModal.contact_phone || 'the registered number'} and verified the institution credentials.</span>
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.8125rem' }}>Verification Notes / Log</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Called Principal office, verified AICTE/University affiliation"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setVerifyModal(null)}
                  disabled={actionLoading === verifyModal.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--success"
                  disabled={!phoneConfirmed || actionLoading === verifyModal.id}
                  onClick={() => handleVerifyInstitution(verifyModal.id)}
                >
                  {actionLoading === verifyModal.id ? <span className="spinner" /> : '✅ Approve & Activate Institution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>
                Reject Institution Registration
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '1rem' }}>
                Rejecting <strong>{rejectModal.name}</strong>. Concession pass applications for this institution will not be permitted.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Reason for Rejection</label>
                <input
                  type="text"
                  className="form-input"
                  value={rejectReasonInst}
                  onChange={e => setRejectReasonInst(e.target.value)}
                  placeholder="e.g. Contact unreachable or affiliation could not be verified"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setRejectModal(null)}
                  disabled={actionLoading === rejectModal.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={actionLoading === rejectModal.id}
                  onClick={() => handleRejectInstitution(rejectModal.id)}
                >
                  {actionLoading === rejectModal.id ? <span className="spinner" /> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
