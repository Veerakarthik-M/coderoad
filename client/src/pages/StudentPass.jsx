import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';

export default function StudentPass() {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPass();
  }, []);

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

  if (loading) return <div className="loading-page"><div className="spinner"></div>Loading pass...</div>;
  if (error) return <div className="page"><div className="container"><div className="alert alert-error">⚠️ {error}</div></div></div>;
  if (!pass) return <div className="page"><div className="container"><div className="empty-state"><div className="empty-state-icon">🎫</div><div className="empty-state-title">No Active Pass</div></div></div></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 className="page-title">Your Digital Pass</h1>
          <p className="page-subtitle">Show this QR code to the conductor for verification</p>
        </div>

        <div className="pass-card">
          <div className="pass-card-header">
            <div className="pass-card-org">Kerala State Road Transport Corporation</div>
            <div className="pass-card-title">Student Concession Pass</div>
          </div>

          <div className="pass-card-body">
            <div className="pass-card-name">{pass.studentName}</div>
            <dl className="pass-card-info">
              <dt>Roll No</dt>
              <dd>{pass.rollNo}</dd>
              <dt>Institution</dt>
              <dd>{pass.institution}</dd>
              <dt>Course</dt>
              <dd>{pass.course}</dd>
              <dt>Route</dt>
              <dd>{pass.routeFrom} → {pass.routeTo}</dd>
              <dt>Distance</dt>
              <dd>{pass.distanceKm} km</dd>
              <dt>Valid From</dt>
              <dd>{new Date(pass.validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
              <dt>Valid Until</dt>
              <dd style={{ color: 'var(--color-success)' }}>
                {new Date(pass.validTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </dl>
          </div>

          <div className="pass-card-qr">
            <QRCodeSVG
              value={pass.qrData}
              size={240}
              level="M"
              bgColor="#ffffff"
              fgColor="#0a0f1c"
              includeMargin={false}
            />
          </div>

          <div className="pass-card-footer">
            <div className="pass-card-credential">{pass.credentialId}</div>
            <div className="pass-card-validity">
              ✓ Digitally Signed · ECDSA P-256
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">🔐 Security Details</div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              This QR code contains a <strong>cryptographically signed credential</strong> (JWS/ECDSA P-256).
              It cannot be forged, copied, or altered — any modification will immediately
              fail signature verification.
            </p>
            <p>
              Conductors can verify this pass <strong>completely offline</strong> using
              only their phone's built-in Web Crypto API. No internet, no server call,
              no typing required.
            </p>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', maxHeight: '80px', overflow: 'hidden' }}>
            {pass.qrData.substring(0, 200)}...
          </div>
        </div>
      </div>
    </div>
  );
}
