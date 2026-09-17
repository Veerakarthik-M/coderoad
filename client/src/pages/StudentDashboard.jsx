import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_STEPS = ['pending', 'inst_approved', 'approved', 'issued'];
const STATUS_LABELS = ['Applied', 'Institution\nVerified', 'KSRTC\nApproved', 'Pass\nIssued'];

function StatusPipeline({ status }) {
  const currentStep = STATUS_STEPS.indexOf(status);
  return (
    <div className="pipeline" role="list" aria-label="Application status">
      {STATUS_LABELS.map((label, i) => {
        const isCompleted = i < currentStep || (i === currentStep && status === 'issued');
        const isActive = i === currentStep && status !== 'issued';
        return (
          <div key={i} style={{ display: 'contents' }}>
            <div className="pipeline__step" role="listitem">
              <div className={`pipeline__dot${isCompleted ? ' pipeline__dot--completed' : isActive ? ' pipeline__dot--active' : ''}`}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <div className={`pipeline__label${isCompleted ? ' pipeline__label--completed' : isActive ? ' pipeline__label--active' : ''}`}>
                {label}
              </div>
            </div>
            {i < STATUS_LABELS.length - 1 && (
              <div className={`pipeline__line${isCompleted ? ' pipeline__line--completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StudentDashboard() {
  const [app, setApp] = useState(null);
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = api.getUser();

  useEffect(() => { loadApplication(); }, []);

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
    return <div className="loading-page"><span className="spinner" /> Loading your dashboard…</div>;
  }

  const isRejected = app?.status === 'rejected';

  return (
    <div className="page">
      <div className="container container--narrow">
        <div className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__eyebrow">Student Portal</div>
            <h1 className="dashboard-hero__title">Welcome, {user?.name}</h1>
            <p className="dashboard-hero__subtitle">Student Concession Application Dashboard</p>
          </div>
        </div>

        {/* No application yet */}
        {!app && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">No Application Found</div>
              <div className="empty-state__desc">You have not submitted a concession application yet.</div>
              <Link to="/register/student" className="btn btn--primary" style={{ marginTop: '1rem' }}>
                Apply for Concession Pass
              </Link>
            </div>
          </div>
        )}

        {app && (
          <>
            {/* Application Status */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card__header">
                <div className="card__title">Application Status</div>
                {isRejected ? (
                  <span className="badge badge--rejected">Rejected</span>
                ) : (
                  <span className={`badge badge--${app.status === 'issued' ? 'active' : app.status === 'inst_approved' ? 'approved' : 'pending'}`}>
                    {app.status === 'issued' ? 'Pass Issued' :
                     app.status === 'inst_approved' ? 'Institution Approved' :
                     app.status === 'pending' ? 'Pending Review' : app.status}
                  </span>
                )}
              </div>

              {!isRejected && <StatusPipeline status={app.status} />}

              {isRejected && (
                <div className="alert alert--error" style={{ marginTop: '0.75rem' }}>
                  Your application was rejected.{' '}
                  {app.rejection_reason && <><strong>Reason:</strong> {app.rejection_reason}</>}
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link to="/register/student" className="btn btn--sm btn--outline">Re-apply</Link>
                  </div>
                </div>
              )}

              {app.status === 'pending' && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', margin: '0.75rem 0 0' }}>
                  Your application is pending review by your institution.
                </p>
              )}
              {app.status === 'inst_approved' && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.75rem 0 0' }}>
                  Your institution has approved your application. Awaiting final KSRTC approval and pass issuance.
                </p>
              )}
            </div>

            {/* View Pass */}
            {app.status === 'issued' && credential && (
              <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎫</div>
                <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text)' }}>
                  Your Digital Pass is Ready
                </div>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Show the QR code to the conductor for bus boarding.
                </p>
                <Link to="/student/pass" className="btn btn--success btn--lg" id="view-pass-btn">
                  View Digital Pass & QR Code
                </Link>
              </div>
            )}

            {/* Application Details */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">Application Details</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  #{app.id}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                {[
                  ['Roll No', app.roll_no],
                  ['Course', app.course],
                  ['Institution', app.institution_name],
                  ['District', app.institution_district || app.district],
                  ['Route', `${app.route_from} → ${app.route_to}`],
                  ['Distance', app.distance_km ? `${app.distance_km} km` : '—'],
                  ['Academic Year', app.academic_year],
                  ['Applied On', new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {label}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
