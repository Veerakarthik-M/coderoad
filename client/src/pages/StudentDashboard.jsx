import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function StudentDashboard() {
  const [app, setApp] = useState(null);
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = api.getUser();

  useEffect(() => {
    loadApplication();
  }, []);

  const loadApplication = async () => {
    try {
      const data = await api.get('/student/application');
      setApp(data.application);
      setCredential(data.credential);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-page"><div className="spinner"></div>Loading...</div>;
  }

  const statusSteps = ['pending', 'inst_approved', 'approved', 'issued'];
  const statusLabels = ['Applied', 'Institution\nVerified', 'KSRTC\nApproved', 'Pass\nIssued'];
  const currentStep = app ? statusSteps.indexOf(app.status) : -1;
  const isRejected = app?.status === 'rejected';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="page-header">
          <h1 className="page-title">Welcome, {user?.name} 👋</h1>
          <p className="page-subtitle">Student Concession Application Dashboard</p>
        </div>

        {!app && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No Application Found</div>
            <div className="empty-state-description">
              You haven't submitted a concession application yet.
            </div>
            <Link to="/register/student" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Apply Now
            </Link>
          </div>
        )}

        {app && (
          <>
            {/* Status Pipeline */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-title">Application Status</div>
                {isRejected ? (
                  <span className="badge badge-rejected">Rejected</span>
                ) : (
                  <span className={`badge badge-${app.status === 'issued' ? 'issued' : app.status === 'inst_approved' ? 'approved' : 'pending'}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {!isRejected && (
                <div className="pipeline">
                  {statusLabels.map((label, i) => (
                    <div key={i} style={{ display: 'contents' }}>
                      <div className="pipeline-step">
                        <div className={`pipeline-dot ${
                          i < currentStep ? 'completed' :
                          i === currentStep ? (app.status === 'issued' ? 'completed' : 'active') : ''
                        }`}>
                          {i < currentStep || (i === currentStep && app.status === 'issued') ? '✓' : i + 1}
                        </div>
                        <div className="pipeline-label">{label}</div>
                      </div>
                      {i < statusLabels.length - 1 && (
                        <div className={`pipeline-line ${i < currentStep ? 'completed' : ''}`}></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isRejected && (
                <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                  ⚠️ Your application was rejected. Reason: {app.rejection_reason || 'Not specified'}
                </div>
              )}
            </div>

            {/* Application Details */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-title">Application Details</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  ID: #{app.id}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                {[
                  ['Roll No', app.roll_no],
                  ['Course', app.course],
                  ['Institution', app.institution_name],
                  ['District', app.institution_district || app.district],
                  ['Route', `${app.route_from} → ${app.route_to}`],
                  ['Distance', `${app.distance_km} km`],
                  ['Academic Year', app.academic_year],
                  ['Applied', new Date(app.created_at).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* View Pass Button */}
            {app.status === 'issued' && credential && (
              <div style={{ textAlign: 'center' }}>
                <Link to="/student/pass" className="btn btn-success btn-lg">
                  📱 View Digital Pass & QR Code
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
