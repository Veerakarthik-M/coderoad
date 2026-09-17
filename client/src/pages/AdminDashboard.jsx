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

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (tab === 'applications') loadApplications();
    else if (tab === 'credentials') loadCredentials();
  }, [tab]);

  const loadStats = async () => {
    try { const d = await api.get('/admin/stats'); setStats(d); } catch {}
  };

  const loadApplications = async () => {
    setLoading(true);
    try { const d = await api.get('/admin/applications'); setApplications(d.applications || []); } catch {}
    finally { setLoading(false); }
  };

  const loadCredentials = async () => {
    setLoading(true);
    try { const d = await api.get('/admin/credentials'); setCredentials(d.credentials || []); } catch {}
    finally { setLoading(false); }
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
        <div className="page-header">
          <div className="page-header__eyebrow">KSRTC Platform Admin</div>
          <h1 className="page-header__title">Admin Dashboard</h1>
          <p className="page-header__subtitle">Approve concession applications, issue and revoke credentials</p>
        </div>

        {stats && (
          <div className="stats-grid">
            {[
              { label: 'Total Applications', value: stats.total },
              { label: 'Awaiting KSRTC Approval', value: stats.instApproved },
              { label: 'Passes Issued', value: stats.issued },
              { label: 'Active Credentials', value: stats.activeCredentials },
              { label: 'Revoked', value: stats.revokedCredentials },
              { label: 'Rejected', value: stats.rejected },
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
            { id: 'applications', label: 'Applications' + (stats?.instApproved ? ` (${stats.instApproved} pending)` : '') },
            { id: 'credentials', label: 'Issued Credentials' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab-nav__item${tab === t.id ? ' tab-nav__item--active' : ''}`}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
              id={`admin-tab-${t.id}`}
            >
              {t.label}
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
              {instApproved.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--warning)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>⏳</span> Awaiting KSRTC Action ({instApproved.length})
                  </div>
                  <div style={{ display: 'grid', gap: '0.625rem', marginBottom: '1.5rem' }}>
                    {instApproved.map(app => (
                      <div key={app.id} className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9375rem' }}>{app.student_name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              {app.roll_no} · {app.course}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {app.institution_name} — {app.institution_district}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Route: {app.route_from} → {app.route_to}
                              {app.distance_km ? ` · ${app.distance_km} km` : ''}
                            </div>
                          </div>
                          {rejectId === app.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '200px' }}>
                              <input className="form-input" placeholder="Reason for rejection" value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                <button className="btn btn--danger btn--sm btn--full" onClick={() => rejectApp(app.id, rejectReason)} disabled={actionLoading === app.id}>
                                  {actionLoading === app.id ? <span className="spinner" /> : 'Confirm Reject'}
                                </button>
                                <button className="btn btn--ghost btn--sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn--success btn--sm"
                                onClick={() => approveApp(app.id)}
                                disabled={actionLoading === app.id}
                                id={`admin-approve-${app.id}`}
                              >
                                {actionLoading === app.id ? <span className="spinner" /> : 'Issue Pass'}
                              </button>
                              <button className="btn btn--outline btn--sm" onClick={() => setRejectId(app.id)} id={`admin-reject-${app.id}`}>Reject</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
                            <td style={{ fontSize: '0.85rem' }}>{app.route_from} → {app.route_to}</td>
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
      </div>
    </div>
  );
}
