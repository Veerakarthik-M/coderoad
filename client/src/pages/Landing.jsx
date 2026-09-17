import { Link } from 'react-router-dom';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Student Registers',
    desc: 'Complete personal, college, and travel details in a guided step-by-step form.',
  },
  {
    step: '02',
    title: 'Institution Verifies',
    desc: 'College administrator reviews and approves the student\'s eligibility and enrollment.',
  },
  {
    step: '03',
    title: 'Pass Issued',
    desc: 'KSRTC digitally signs the credential using ECDSA P-256. A QR code is generated.',
  },
  {
    step: '04',
    title: 'Conductor Scans',
    desc: 'The conductor scans the student\'s QR. Verified online or offline — under 2 seconds.',
  },
  {
    step: '05',
    title: 'Event Recorded',
    desc: 'Each verified scan creates a travel record. Offline events sync automatically when internet returns.',
  },
  {
    step: '06',
    title: 'Institution Reviews',
    desc: 'Authorized administrators view their students\' pass status and verification history.',
  },
];

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'karthik@student.com', desc: 'Has an active issued pass' },
  { role: 'Institution Admin', email: 'admin@amrita.edu', desc: 'Amrita Vishwa Vidyapeetham' },
  { role: 'KSRTC Admin', email: 'admin@ksrtc.com', desc: 'Platform administrator' },
  { role: 'Conductor', email: 'conductor@ksrtc.com', desc: 'Bus conductor scanner' },
];

export default function Landing({ user }) {
  return (
    <main>
      {/* Hero */}
      <section className="landing-hero">
        <div className="container">
          <div className="landing-hero__eyebrow">
            <span>Kerala KSRTC</span>
            <span>·</span>
            <span>SC-01</span>
          </div>
          <h1 className="landing-hero__title">
            Digital Student Bus Concession Pass for Kerala
          </h1>
          <p className="landing-hero__desc">
            ANAVANDI digitises student bus pass applications, institutional approval, and conductor 
            verification — including areas with no internet connectivity. Every pass is cryptographically 
            signed and verifiable offline.
          </p>
          <div className="landing-hero__actions">
            {!user && (
              <>
                <Link to="/register/student" className="btn btn--primary btn--lg" id="hero-student-register">
                  Apply for Concession Pass
                </Link>
                <Link to="/login" className="btn btn--outline btn--lg" id="hero-login">
                  Sign In
                </Link>
              </>
            )}
            {user?.role === 'student' && (
              <Link to="/student" className="btn btn--primary btn--lg">Go to Dashboard</Link>
            )}
            {user?.role === 'institution' && (
              <Link to="/institution" className="btn btn--primary btn--lg">Institution Dashboard</Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn btn--primary btn--lg">Admin Dashboard</Link>
            )}
            {user?.role === 'conductor' && (
              <Link to="/conductor" className="btn btn--success btn--lg">Open Scanner</Link>
            )}
            <Link to="/conductor" className="btn btn--outline btn--lg" id="hero-conductor">
              Conductor Scanner
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-workflow">
        <div className="container">
          <h2>How It Works</h2>
          <p style={{ marginTop: '0.375rem', marginBottom: 0 }}>
            End-to-end workflow from student registration to verified travel event.
          </p>
          <div className="workflow-steps">
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.step} className="workflow-step">
                <div className="workflow-step__number">Step {s.step}</div>
                <div className="workflow-step__title">{s.title}</div>
                <p className="workflow-step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key features — brief, factual */}
      <section style={{ padding: '2.5rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2>Technical Architecture</h2>
          <p style={{ marginTop: '0.375rem', marginBottom: '1.5rem' }}>
            Built for reliability in low-connectivity environments.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.875rem' }}>
            {[
              {
                title: 'ECDSA P-256 Signatures',
                desc: 'Every pass credential is signed with Elliptic Curve Digital Signature Algorithm. Tamper-proof — any modification invalidates the signature.',
              },
              {
                title: 'Offline-First Verification',
                desc: 'Conductors verify QR codes entirely offline using Web Crypto API. No network call required. Public key and revocation list are cached locally.',
              },
              {
                title: 'Automatic Synchronisation',
                desc: 'Offline scan events are queued locally and uploaded automatically when the conductor\'s device reconnects to the internet.',
              },
              {
                title: 'Multi-Institution Architecture',
                desc: 'Each institution sees only its own students\' data. Role-based access control enforced on both backend and frontend.',
              },
            ].map((f) => (
              <div key={f.title} className="card">
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  {f.title}
                </div>
                <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="landing-demo-accounts">
        <div className="container">
          <h2>Demo Accounts</h2>
          <p style={{ marginTop: '0.375rem', marginBottom: 0 }}>
            All demo accounts use the password{' '}
            <code>demo123</code>. Data resets on server restart.
          </p>
          <div className="demo-accounts-grid">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.role} className="demo-account">
                <div className="demo-account__role">{acc.role}</div>
                <div className="demo-account__email">{acc.email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {acc.desc}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            ⚠️ Demo mode: Data stored in an in-memory SQLite database.
            Production deployment requires a persistent database.
          </p>
        </div>
      </section>
    </main>
  );
}
