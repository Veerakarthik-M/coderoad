import { Link } from 'react-router-dom';

export default function Landing({ user }) {
  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            🚌 ANAVANDI Hackathon 2026 — SC-01
          </div>
          <h1 className="hero-title">
            Tamper-Proof Student<br />
            <span className="hero-title-highlight">Concession Pass</span>
          </h1>
          <p className="hero-description">
            Cryptographically signed digital concession credentials for Kerala's public transport.
            Verified offline, in under 5 seconds, without typing.
          </p>
          <div className="hero-actions">
            {!user && (
              <>
                <Link to="/register/student" className="btn btn-primary btn-lg">
                  🎓 Student Registration
                </Link>
                <Link to="/register/institution" className="btn btn-outline btn-lg">
                  🏫 Institution Registration
                </Link>
              </>
            )}
            {user && user.role === 'student' && (
              <Link to="/student" className="btn btn-primary btn-lg">
                Go to Dashboard →
              </Link>
            )}
            {user && user.role === 'institution' && (
              <Link to="/institution" className="btn btn-primary btn-lg">
                Review Applications →
              </Link>
            )}
            {user && user.role === 'admin' && (
              <Link to="/admin" className="btn btn-primary btn-lg">
                Admin Dashboard →
              </Link>
            )}
            <Link to="/conductor" className="btn btn-success btn-lg">
              🔍 Conductor Verifier
            </Link>
          </div>

          <div className="hero-features">
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <div className="feature-title">Cryptographically Signed</div>
              <div className="feature-description">
                Each pass contains an ECDSA P-256 digital signature. Impossible to forge, copy, or alter without detection.
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✈️</div>
              <div className="feature-title">Offline Verification</div>
              <div className="feature-description">
                Conductors verify passes with zero internet. The cryptographic check runs entirely on the phone using Web Crypto API.
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Under 5 Seconds</div>
              <div className="feature-description">
                Scan QR → verify signature → show result. No typing, no server calls. Target: under 2 seconds.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="page">
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Student Applies', desc: 'Fill in personal, institution, and route details. Upload enrollment proof.', icon: '📝' },
              { step: '02', title: 'Institution Verifies', desc: 'College/school admin reviews and approves the student\'s application.', icon: '✅' },
              { step: '03', title: 'KSRTC Issues Credential', desc: 'The system digitally signs the credential with ECDSA P-256. A QR code is generated.', icon: '🔏' },
              { step: '04', title: 'Conductor Scans QR', desc: 'Point the phone camera at the student\'s QR. Verification happens locally — no internet needed.', icon: '📱' },
            ].map((item) => (
              <div key={item.step} className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  minWidth: '48px', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Step {item.step}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo credentials */}
          <div className="card" style={{ marginTop: '3rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>🔑 Demo Accounts</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              All accounts use password: <code style={{ color: 'var(--color-primary)', background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>demo123</code>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', textAlign: 'left' }}>
              {[
                { role: 'Student', email: 'karthik@student.com', icon: '🎓' },
                { role: 'Institution', email: 'admin@amrita.edu', icon: '🏫' },
                { role: 'KSRTC Admin', email: 'admin@ksrtc.com', icon: '🏛️' },
                { role: 'Conductor', email: 'conductor@ksrtc.com', icon: '🚌' },
              ].map(acc => (
                <div key={acc.role} style={{ padding: '0.75rem', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700 }}>{acc.icon} {acc.role}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{acc.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
