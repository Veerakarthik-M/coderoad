import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  verifyCredentialOffline, 
  cachePublicKey, 
  getCachedPublicKey, 
  cacheRevocations, 
  getCachedRevocations,
  getLastSyncTime 
} from '../crypto/verify';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ConductorVerifier() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [hasPublicKey, setHasPublicKey] = useState(!!getCachedPublicKey());
  const [syncing, setSyncing] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && !hasPublicKey) {
      syncData();
    }
  }, [isOnline]);

  // Initial sync
  useEffect(() => {
    if (isOnline) {
      syncData();
    }
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const syncData = async () => {
    setSyncing(true);
    try {
      // Fetch public key
      const res = await fetch(`${API_BASE}/verify/public-key`);
      const jwk = await res.json();
      cachePublicKey(jwk);
      setHasPublicKey(true);

      // Fetch revocation list
      const revRes = await fetch(`${API_BASE}/verify/revocations`);
      const revData = await revRes.json();
      cacheRevocations(revData.revocations);
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const startScanner = async () => {
    setScannerError('');
    setResult(null);
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // QR code detected — stop scanner and verify
          await scanner.stop();
          scannerInstanceRef.current = null;
          setScanning(false);
          handleScan(decodedText);
        },
        () => {} // ignore scan errors
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Scanner start error:', err);
      setScannerError(
        err.toString().includes('Permission') 
          ? 'Camera permission denied. Please allow camera access.'
          : 'Could not start camera. Make sure no other app is using it.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      scannerInstanceRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (qrData) => {
    const verification = await verifyCredentialOffline(qrData);
    setResult(verification);

    // Add to history
    setHistory(prev => [{
      ...verification,
      id: Date.now(),
      name: verification.payload?.name || 'Unknown',
    }, ...prev].slice(0, 20));
  };

  // Demo: test with a tampered QR
  const testTampered = async () => {
    setResult(null);
    // Create a fake JWS with garbage signature
    const fakeJws = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJBTlYtMjAyNi0wMDAwMDEiLCJuYW1lIjoiRmFrZSBVc2VyIiwidG8iOiIyMDI3LTAzLTMxIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const verification = await verifyCredentialOffline(fakeJws);
    setResult(verification);
    setHistory(prev => [{
      ...verification,
      id: Date.now(),
      name: 'Tampered Test',
    }, ...prev].slice(0, 20));
  };

  // Demo: test with an expired credential
  const testExpired = async () => {
    setResult(null);
    // Manually create an expired but correctly formatted token for demo
    // In practice this would come from scanning an old QR
    const fakeJws = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJBTlYtMjAyNS0wMDAwMDEiLCJuYW1lIjoiRXhwaXJlZCBVc2VyIiwidG8iOiIyMDI1LTAxLTAxIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const verification = await verifyCredentialOffline(fakeJws);
    setResult(verification);
    setHistory(prev => [{
      ...verification,
      id: Date.now(),
      name: 'Expired Test',
    }, ...prev].slice(0, 20));
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem 1.5rem',
        background: 'rgba(10, 15, 28, 0.95)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔒 KSRTC Concession Verifier
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Offline-First Cryptographic Verification
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={syncData} 
            className="btn btn-ghost btn-sm"
            disabled={!isOnline || syncing}
          >
            {syncing ? '⟳' : '🔄'} Sync
          </button>
          <a href="/" className="btn btn-ghost btn-sm">← Back</a>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1rem 1.5rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        
        {/* Status Bar */}
        <div className="scanner-status" style={{ marginBottom: '1rem' }}>
          <div className="network-indicator">
            <div className={`network-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span style={{ color: isOnline ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {hasPublicKey ? '🔑 Key cached' : '⚠️ No key'} · Sync: {formatTime(lastSync)}
          </div>
        </div>

        {!hasPublicKey && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            ⚠️ Public key not cached. Connect to internet and tap Sync to enable offline verification.
          </div>
        )}

        {/* Scanner or Result */}
        {!result ? (
          <div>
            <div className="scanner-viewfinder" style={{ marginBottom: '1rem' }}>
              <div id="qr-reader" style={{ width: '100%' }}></div>
              {!scanning && (
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '1rem',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '3rem' }}>📷</div>
                  <div>Tap to start scanning</div>
                </div>
              )}
              {scanning && (
                <div className="scanner-overlay">
                  <div className="scanner-line"></div>
                </div>
              )}
            </div>

            {scannerError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {scannerError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!scanning ? (
                <button 
                  onClick={startScanner} 
                  className="btn btn-primary btn-lg btn-full"
                  disabled={!hasPublicKey}
                >
                  📷 Start Scanning
                </button>
              ) : (
                <button onClick={stopScanner} className="btn btn-danger btn-lg btn-full">
                  ⏹ Stop Scanner
                </button>
              )}
            </div>

            {/* Demo Buttons */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>
                Demo Tests
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={testTampered} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                  🔴 Test Tampered
                </button>
                <button onClick={testExpired} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                  🟡 Test Expired
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Verification Result */}
            <div className={`verification-result ${
              result.status === 'VALID' ? 'valid' : 
              result.status === 'EXPIRED' ? 'expired' : 'invalid'
            }`}>
              <div className="verification-icon">
                {result.status === 'VALID' ? '✅' : 
                 result.status === 'EXPIRED' ? '⏰' :
                 result.status === 'REVOKED' ? '🚫' : '❌'}
              </div>
              <div className="verification-status" style={{ 
                color: result.status === 'VALID' ? 'var(--color-success)' : 
                       result.status === 'EXPIRED' ? 'var(--color-warning)' : 'var(--color-danger)'
              }}>
                {result.status === 'VALID' ? '✓ VALID PASS' :
                 result.status === 'EXPIRED' ? '✕ EXPIRED' :
                 result.status === 'REVOKED' ? '✕ REVOKED' : '✕ INVALID'}
              </div>

              {result.payload && (
                <div className="verification-details">
                  <div className="verification-row">
                    <span className="verification-label">Name</span>
                    <span className="verification-value">{result.payload.name}</span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Roll No</span>
                    <span className="verification-value">{result.payload.sid}</span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Institution</span>
                    <span className="verification-value">{result.payload.inst}</span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Route</span>
                    <span className="verification-value">{result.payload.route}</span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Type</span>
                    <span className="verification-value">{result.payload.type}</span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Valid Until</span>
                    <span className="verification-value" style={{
                      color: result.status === 'EXPIRED' ? 'var(--color-danger)' : 'var(--color-success)'
                    }}>
                      {result.payload.to}
                    </span>
                  </div>
                  <div className="verification-row">
                    <span className="verification-label">Credential</span>
                    <span className="verification-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {result.payload.cid}
                    </span>
                  </div>
                </div>
              )}

              {result.message && !result.payload && (
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                  {result.message}
                </div>
              )}

              <div className="verification-time">
                Verified: <span>{result.mode}</span> · Time: <span>{result.verificationTimeMs}ms</span>
                {result.verificationTimeMs && (
                  <span> ({(result.verificationTimeMs / 1000).toFixed(2)}s)</span>
                )}
              </div>
            </div>

            <button 
              onClick={() => { setResult(null); }} 
              className="btn btn-primary btn-lg btn-full" 
              style={{ marginTop: '1.5rem' }}
            >
              📷 Scan Next
            </button>
          </div>
        )}

        {/* Scan History */}
        {history.length > 0 && !result && (
          <div className="scan-history" style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.75rem' }}>
              Recent Verifications
            </div>
            {history.map(item => (
              <div key={item.id} className="scan-history-item">
                <span className="scan-history-icon">
                  {item.status === 'VALID' ? '✅' : 
                   item.status === 'EXPIRED' ? '⏰' : '❌'}
                </span>
                <div className="scan-history-info">
                  <div className="scan-history-name">{item.name}</div>
                  <div className="scan-history-meta">
                    {item.status} · {item.mode} · {item.verificationTimeMs}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
