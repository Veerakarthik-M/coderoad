import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
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

// --- APPLICATIONS TAB ---
function ApplicationsTab({ institutionId }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [alert, setAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/institution/applications');
      setApplications(data.applications || []);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/institution/approve/${id}`, {});
      setAlert({ type: 'success', msg: 'Application approved and forwarded to KSRTC.' });
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id, reason) => {
    setActionLoading(id);
    try {
      await api.post(`/institution/reject/${id}`, { reason });
      setAlert({ type: 'success', msg: 'Application rejected.' });
      setRejectId(null);
      setRejectReason('');
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const pending = applications.filter(a => a.status === 'pending');
  const others = applications.filter(a => a.status !== 'pending');

  return (
    <div>
      {alert && (
        <div className={`alert alert--${alert.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '1rem' }}>
          {alert.msg}
          <button onClick={() => setAlert(null)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading…</div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">No Applications Yet</div>
          <div className="empty-state__desc">Students from your institution who apply will appear here.</div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                Pending Review ({pending.length})
              </div>
              <div style={{ display: 'grid', gap: '0.625rem', marginBottom: '1.5rem' }}>
                {pending.map(app => (
                  <div key={app.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9375rem' }}>{app.student_name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {app.roll_no} · {app.course}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Route: {app.route_from} → {app.route_to}
                          {app.distance_km ? ` · ${app.distance_km} km` : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Applied: {fmtDate(app.created_at)} · {app.student_email}
                        </div>
                        {app.document_path && (
                          <div style={{ marginTop: '0.375rem' }}>
                            <a 
                              href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001'}/uploads/${app.document_path}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn--outline btn--sm"
                              style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            >
                              📎 View ID Card
                            </a>
                          </div>
                        )}
                      </div>
                      {rejectId === app.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '200px' }}>
                          <input
                            className="form-input"
                            placeholder="Reason for rejection"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button className="btn btn--danger btn--sm btn--full" onClick={() => reject(app.id, rejectReason)} disabled={actionLoading === app.id}>
                              {actionLoading === app.id ? <span className="spinner" /> : 'Confirm Reject'}
                            </button>
                            <button className="btn btn--ghost btn--sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn--success btn--sm"
                            onClick={() => approve(app.id)}
                            disabled={actionLoading === app.id}
                            id={`approve-app-${app.id}`}
                          >
                            {actionLoading === app.id ? <span className="spinner" /> : 'Approve'}
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            onClick={() => setRejectId(app.id)}
                            id={`reject-app-${app.id}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                All Applications ({others.length})
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Course</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {others.map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.student_name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.student_email}</span></td>
                        <td>{app.roll_no}</td>
                        <td>{app.course}</td>
                        <td>
                          {app.route_from} → {app.route_to}
                          {app.document_path && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <a 
                                href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001'}/uploads/${app.document_path}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ fontSize: '0.6875rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                              >
                                📎 View ID
                              </a>
                            </div>
                          )}
                        </td>
                        <td>{statusBadge(app.status)}</td>
                        <td>{fmtDate(app.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// --- STUDENTS TAB ---
function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    api.get('/institution/students')
      .then(d => setStudents(d.students || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = async (userId) => {
    setHistoryLoading(true);
    try {
      const data = await api.get(`/institution/student/${userId}/history`);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.course || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input className="search-bar__input" placeholder="Search by name, roll no, course…" value={search} onChange={e => setSearch(e.target.value)} id="students-search" />
        </div>
      </div>

      {loading ? (
        <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <div className="empty-state__title">No Students Found</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table--clickable">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Course</th>
                <th>Route</th>
                <th>Pass Status</th>
                <th>Last Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.user_id} onClick={() => { setSelectedStudent(s); loadHistory(s.user_id); }}>
                  <td>
                    <strong>{s.name}</strong><br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</span>
                  </td>
                  <td>{s.roll_no || '—'}</td>
                  <td>{s.course || '—'}</td>
                  <td>{s.route_from && s.route_to ? `${s.route_from} → ${s.route_to}` : '—'}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{s.last_verified_at ? fmtDateTime(s.last_verified_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget) { setSelectedStudent(null); setHistory(null); } }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '580px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{selectedStudent.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedStudent.email}</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => { setSelectedStudent(null); setHistory(null); }}>✕</button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {[
                  ['Roll No', selectedStudent.roll_no],
                  ['Course', selectedStudent.course],
                  ['Year', selectedStudent.year_of_study || '—'],
                  ['Route', selectedStudent.route_from && selectedStudent.route_to ? `${selectedStudent.route_from} → ${selectedStudent.route_to}` : '—'],
                  ['Pass Status', statusBadge(selectedStudent.status)],
                  ['Credential', selectedStudent.credential_id || '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{l}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                Travel History
              </div>
              {historyLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}><span className="spinner" /></div>
              ) : history?.events?.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.375rem' }}>
                  {history.events.map(ev => (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtDateTime(ev.verified_at)}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          {ev.route_from} → {ev.route_to}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <span className={`badge badge--${ev.verification_mode === 'OFFLINE' ? 'offline' : 'online'}`}>{ev.verification_mode}</span>
                        <span className={`badge badge--${ev.verification_result === 'VALID' ? 'active' : 'rejected'}`}>{ev.verification_result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No verification events recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VERIFICATION LOGS TAB ---
function VerificationLogsTab() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterMode) params.set('mode', filterMode);
      if (filterResult) params.set('result', filterResult);
      const data = await api.get(`/institution/verification-logs?${params}`);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterMode, filterResult]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto' }} value={filterMode} onChange={e => setFilterMode(e.target.value)} id="filter-mode">
          <option value="">All Modes</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterResult} onChange={e => setFilterResult(e.target.value)} id="filter-result">
          <option value="">All Results</option>
          <option value="VALID">Valid</option>
          <option value="INVALID">Invalid</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
        {(filterMode || filterResult) && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setFilterMode(''); setFilterResult(''); }}>Clear filters</button>
        )}
      </div>

      {loading ? (
        <div className="loading-page" style={{ paddingTop: '2rem' }}><span className="spinner" /> Loading…</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📡</div>
          <div className="empty-state__title">No Verification Events</div>
          <div className="empty-state__desc">Events will appear here when conductors scan your students' passes.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
            Showing {events.length} of {total} events
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date / Time</th>
                  <th>Route</th>
                  <th>Conductor</th>
                  <th>Mode</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td><strong>{ev.student_name || '—'}</strong></td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtDateTime(ev.verified_at)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.route_from} → {ev.route_to}</td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.conductor_name || '—'}</td>
                    <td><span className={`badge badge--${ev.verification_mode === 'OFFLINE' ? 'offline' : 'online'}`}>{ev.verification_mode}</span></td>
                    <td><span className={`badge badge--${ev.verification_result === 'VALID' ? 'active' : 'rejected'}`}>{ev.verification_result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function InstitutionDashboard() {
  const [tab, setTab] = useState('applications');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/institution/stats').then(setStats).catch(console.error);
  }, []);

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__eyebrow">Institution Portal</div>
            <h1 className="dashboard-hero__title">{stats?.institution?.name || 'Institution Dashboard'}</h1>
            <p className="dashboard-hero__subtitle">{stats?.institution?.place}, {stats?.institution?.district}</p>
          </div>
        </div>

        {stats && (
          <div className="stats-grid">
            {[
              { label: 'Total Applications', value: stats.total },
              { label: 'Pending Review', value: stats.pending },
              { label: 'Passes Issued', value: stats.issued },
              { label: 'Rejected', value: stats.rejected },
              { label: 'Scans (24h)', value: stats.recentScans },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card__value">{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tab-nav" role="tablist">
          {[
            { id: 'applications', label: 'Applications' + (stats?.pending ? ` (${stats.pending})` : '') },
            { id: 'students', label: 'Students' },
            { id: 'logs', label: 'Verification Logs' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab-nav__item${tab === t.id ? ' tab-nav__item--active' : ''}`}
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
              id={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'students' && <StudentsTab />}
        {tab === 'logs' && <VerificationLogsTab />}
      </div>
    </div>
  );
}
