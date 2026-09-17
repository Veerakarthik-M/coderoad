import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function PassStatusBadge({ pass }) {
  const now = new Date();
  const validTo = new Date(pass.validTo);
  if (validTo < now) return <span className="badge badge--rejected">EXPIRED</span>;
  return <span className="badge badge--active">ACTIVE</span>;
}

export default function StudentPass() {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRawQR, setShowRawQR] = useState(false);

  useEffect(() => { loadPass(); }, []);

  const loadPass = async () => {
    try {
      const data = await api.get('/student/pass');
      setPass(data.pass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-page"><span className="spinner" /> Loading your pass…</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="container container--narrow">
          <div className="alert alert--error">{error}</div>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/student" className="btn btn--outline">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!pass) {
    return (
      <div className="page">
        <div className="container container--narrow">
          <div className="card">
            <div className="empty-state">
              <div className="empty-state__icon">🎫</div>
              <div className="empty-state__title">No Active Pass</div>
              <div className="empty-state__desc">Your pass has not been issued yet or may have been revoked.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container container--narrow">
        <div className="page-header">
          <div className="page-header__eyebrow">Student Pass</div>
          <h1 className="page-header__title">Digital Concession Pass</h1>
          <p className="page-header__subtitle">Show this QR code to the bus conductor for verification</p>
        </div>

        {/* The Pass Document */}
        <div className="pass-document" id="pass-document">
          <div className="pass-document__header">
            <div>
              <div className="pass-document__org">Kerala State Road Transport Corporation</div>
              <div className="pass-document__title">Student Concession Pass</div>
            </div>
            <div>
              <PassStatusBadge pass={pass} />
            </div>
          </div>

          <div className="pass-document__body">
            <div className="pass-document__name">{pass.studentName}</div>

            <div className="pass-document__fields">
              <div className="pass-document__field">
                <label>Roll No</label>
                <span>{pass.rollNo}</span>
              </div>
              <div className="pass-document__field">
                <label>Course</label>
                <span>{pass.course}</span>
              </div>
              <div className="pass-document__field" style={{ gridColumn: '1 / -1' }}>
                <label>Institution</label>
                <span>{pass.institution}</span>
              </div>
              <div className="pass-document__field">
                <label>Boarding Point</label>
                <span>{pass.routeFrom}</span>
              </div>
              <div className="pass-document__field">
                <label>Destination</label>
                <span>{pass.routeTo}</span>
              </div>
              <div className="pass-document__field">
                <label>Valid From</label>
                <span>{fmtDate(pass.validFrom)}</span>
              </div>
              <div className="pass-document__field">
                <label>Valid Until</label>
                <span style={{ color: 'var(--success)' }}>{fmtDate(pass.validTo)}</span>
              </div>
            </div>

            <div className="pass-document__qr-section">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                Present QR code to conductor
              </p>
              <div className="pass-document__qr-wrapper">
                <QRCodeSVG
                  value={pass.qrData}
                  size={200}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0d1117"
                  includeMargin={false}
                  id="pass-qr-code"
                />
              </div>
              <div className="pass-document__pass-id">{pass.credentialId}</div>
            </div>
          </div>

          <div className="pass-document__footer">
            <div className="pass-document__validity">
              Valid until <strong>{fmtDate(pass.validTo)}</strong>
            </div>
            <div className="pass-document__sig">
              ECDSA P-256<br />Digitally Signed
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card__header">
            <div className="card__title">Security Information</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '0.625rem' }}>
              The QR code contains a <strong style={{ color: 'var(--text)' }}>cryptographically signed credential</strong> (ECDSA P-256). 
              It cannot be forged, copied, or modified — any alteration will immediately fail signature verification.
            </p>
            <p>
              Conductors can verify this pass <strong style={{ color: 'var(--text)' }}>completely offline</strong> using 
              the Web Crypto API on their phone. No internet connection is required for verification.
            </p>
          </div>
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '0.875rem', fontSize: '0.75rem' }}
            onClick={() => setShowRawQR(s => !s)}
            id="toggle-raw-qr"
          >
            {showRawQR ? 'Hide' : 'Show'} raw credential data
          </button>
          {showRawQR && (
            <div style={{
              marginTop: '0.625rem',
              padding: '0.625rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              wordBreak: 'break-all',
              maxHeight: '100px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
            }}>
              {pass.qrData}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link to="/student" className="btn btn--outline" id="back-to-dashboard">
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
