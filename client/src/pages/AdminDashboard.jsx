import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('pending');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [appData, credData, statsData] = await Promise.all([
        api.get('/admin/applications'),
        api.get('/admin/credentials'),
        api.get('/admin/stats')
      ]);
      setApplications(appData.applications);
      setCredentials(credData.credentials);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/approve/${id}`);
      loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    setActionLoading(id);
    try {
      await api.post(`/admin/reject/${id}`, { reason });
      loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (credentialId) => {
    const reason = prompt('Reason for revocation:');
    if (!reason) return;
    setActionLoading(credentialId);
    try {
      await api.post(`/admin/revoke/${credentialId}`, { reason });
      loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div>Loading...</div>;

  const pendingApps = applications.filter(a => a.status === 'inst_approved');

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">KSRTC Admin Dashboard</h1>
          <p className="page-subtitle">Manage student concession applications and credentials</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.instApproved}</div>
              <div className="stat-label">Awaiting Approval</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.activeCredentials}</div>
              <div className="stat-label">Active Passes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.revokedCredentials}</div>
              <div className="stat-label">Revoked</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Applications</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending Approval ({pendingApps.length})
          </button>
          <button className={`tab ${tab === 'credentials' ? 'active' : ''}`} onClick={() => setTab('credentials')}>
            Issued Credentials ({credentials.length})
          </button>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            All Applications
          </button>
        </div>

        {/* Pending Approval */}
        {tab === 'pending' && (
          <div>
            {pendingApps.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <div className="empty-state-title">No Applications Awaiting Approval</div>
                </div>
              </div>
            ) : (
              pendingApps.map(app => (
                <div key={app.id} className="card" style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{app.student_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        Roll: {app.roll_no} · {app.course}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        🏫 {app.institution_name} — {app.institution_place}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        🚌 {app.route_from} → {app.route_to} ({app.distance_km}km)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        ✓ Institution approved
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(app.id)}
                        disabled={actionLoading === app.id}
                      >
                        {actionLoading === app.id ? '...' : '🔏 Issue Credential'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleReject(app.id)}
                        disabled={actionLoading === app.id}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Issued Credentials */}
        {tab === 'credentials' && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Credential ID</th>
                  <th>Student</th>
                  <th>Institution</th>
                  <th>Route</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map(cred => (
                  <tr key={cred.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cred.credential_id}</td>
                    <td style={{ fontWeight: 600 }}>{cred.student_name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{cred.institution_name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{cred.route_from} → {cred.route_to}</td>
                    <td>{cred.valid_to}</td>
                    <td>
                      {cred.revoked ? (
                        <span className="badge badge-revoked">Revoked</span>
                      ) : (
                        <span className="badge badge-approved">Active</span>
                      )}
                    </td>
                    <td>
                      {!cred.revoked && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRevoke(cred.credential_id)}
                          disabled={actionLoading === cred.credential_id}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* All Applications */}
        {tab === 'all' && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Institution</th>
                  <th>Roll No</th>
                  <th>Route</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>#{app.id}</td>
                    <td style={{ fontWeight: 600 }}>{app.student_name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{app.institution_name || '—'}</td>
                    <td>{app.roll_no}</td>
                    <td style={{ fontSize: '0.85rem' }}>{app.route_from} → {app.route_to}</td>
                    <td>
                      <span className={`badge ${
                        app.status === 'issued' ? 'badge-issued' :
                        app.status === 'inst_approved' ? 'badge-approved' :
                        app.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
