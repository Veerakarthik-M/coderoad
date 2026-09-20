import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_STEPS = ['pending', 'inst_approved', 'approved', 'issued'];
const STATUS_LABELS = ['Applied', 'Institution Verified', 'KSRTC Approved', 'Pass Issued'];

function StatusPipeline({ status }) {
  const currentStep = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, margin: '1rem 0', overflowX: 'auto', paddingBottom: '0.25rem' }}>
      {STATUS_LABELS.map((label, i) => {
        const isCompleted = i < currentStep || status === 'issued';
        const isActive = i === currentStep && status !== 'issued';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            {/* Step */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.8rem',
                background: isCompleted ? '#059669' : isActive ? '#064e3b' : '#e5e7eb',
                color: isCompleted || isActive ? '#fff' : '#9ca3af',
                boxShadow: isActive ? '0 0 0 3px rgba(6,78,59,0.2)' : 'none',
                transition: 'all 0.2s',
              }}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <div style={{
                fontSize: '0.65rem', fontWeight: isActive ? 700 : 600,
                textAlign: 'center', marginTop: '0.375rem', lineHeight: 1.3,
                color: isCompleted ? '#059669' : isActive ? '#064e3b' : '#9ca3af',
                maxWidth: 72, wordBreak: 'break-word',
              }}>
                {label}
              </div>
            </div>
            {/* Connector line */}
            {i < STATUS_LABELS.length - 1 && (
              <div style={{
                height: 3, flex: 1, marginTop: 14, minWidth: 12,
                background: isCompleted ? '#059669' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
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
                <Link to="/student/pass" className="btn btn--success btn--lg" id="view-pass-btn" style={{ marginBottom: '1.5rem' }}>
                  View Digital Pass & QR Code
                </Link>
                
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '0.875rem' }}>📋 Pass Usage Rules</div>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>✅ <strong>Unlimited Rides:</strong> Use multiple times per day.</li>
                    <li>✅ <strong>Weekends:</strong> Valid on Saturdays, Sundays, & holidays.</li>
                    <li>❌ <strong>Valid Services:</strong> NOT valid on Super Fast Express, AC, or Volvo. Only Ordinary & Fast Passenger.</li>
                    <li>❌ <strong>Route Strict:</strong> Only valid exactly on {app.route_from} ↔ {app.route_to}.</li>
                  </ul>
                </div>
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
              <div className="app-detail-grid" style={{ fontSize: '0.875rem' }}>
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
