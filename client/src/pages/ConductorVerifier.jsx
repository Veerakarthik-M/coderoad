import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { api } from '../api';
import {
  verifyCredentialOffline,
  cachePublicKey,
  getCachedPublicKey,
  cacheRevocations,
  getCachedRevocations,
  getLastSyncTime,
} from '../crypto/verify';

// --- Offline event queue stored in localStorage ---
const QUEUE_KEY = 'anavandi_offline_queue';

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function addToQueue(event) {
  const q = getQueue();
  q.push({ ...event, localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  saveQueue(q);
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

// Built-in verified sample tokens for instant testing & evaluation (online & offline)
const SAMPLE_TOKENS = {
  valid: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJBTlYtMjAyNi0wMDAwMDEiLCJzaWQiOiIyMUNTMDQ1IiwibmFtZSI6IkthcnRoaWsgTSBWIiwiaW5zdCI6IkFtcml0YSBWaXNod2EgVmlkeWFwZWV0aGFtIiwiaW5zdElkIjoxLCJ1aWQiOjcsInJvdXRlIjoiRXR0aW1hZGFpIHRvIENvaW1iYXRvcmUgQnVzIFN0YW5kIiwiZnJvbV9zdG9wIjoiRXR0aW1hZGFpIiwidG9fc3RvcCI6IkNvaW1iYXRvcmUgQnVzIFN0YW5kIiwia20iOjE4LCJ0eXBlIjoiU3R1ZGVudCBDb25jZXNzaW9uIiwiZnJvbSI6IjIwMjYtMDQtMDEiLCJ0byI6IjIwMjctMDMtMzEiLCJpc3MiOiJLU1JUQy1BTkFWQU5ESSIsImlhdCI6MTc4OTg2MzAyMH0.WQ2uvQLOKXMWcKw4zH4hxMwLVsDaqgbves8DlAtbrUAm3afjt5hKJkFtjIHhcnfNXYtULPRV3ZzkCpMsNAWlLA',
  expired: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJBTlYtMjAyNC0wMDk5ODgiLCJzaWQiOiIyMENTMDEyIiwibmFtZSI6IlJhaHVsIFZhcm1hIChTYW1wbGUgRXhwaXJlZCkiLCJpbnN0IjoiR292ZXJubWVudCBFbmdpbmVlcmluZyBDb2xsZWdlLCBUaHJpc3N1ciIsImluc3RJZCI6MiwidWlkIjo5OSwicm91dGUiOiJUaHJpc3N1ciBUb3duIHRvIEdFQyBUaHJpc3N1ciIsImZyb21fc3RvcCI6IlRocmlzc3VyIFRvd24iLCJ0b19zdG9wIjoiR0VDIFRocmlzc3VyIiwia20iOjQsInR5cGUiOiJTdHVkZW50IENvbmNlc3Npb24iLCJmcm9tIjoiMjAyNC0wMS0wMSIsInRvIjoiMjAyNC0xMi0zMSIsImlzcyI6IktTUlRDLUFOQVZBTkRJIiwiaWF0IjoxNzA0MDY3MjAwfQ.gXyuVNnBblAy17d7ia12xe-7OEwc4NFo0wdPsfxzECfv2VjgtASmf5e05-LQFPXzESRPQ-TmKze_Y-J5uaY7GA',
  tampered: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJBTlYtMjAyNi0wMDAwMDEiLCJzaWQiOiIyMUNTMDQ1IiwibmFtZSI6IkhhY2tlciBGYWtlIFN0dWRlbnQiLCJpbnN0IjoiQW1yaXRhIFZpc2h3YSBWaWR5YXBlZXRoYW0iLCJpbnN0SWQiOjEsInVpZCI6Nywicm91dGUiOiJFdHRpbWFkYWkgdG8gQ29pbWJhdG9yZSBCdXMgU3RhbmQiLCJmcm9tX3N0b3AiOiJFdHRpbWFkYWkiLCJ0b19zdG9wIjoiQ29pbWJhdG9yZSBCdXMgU3RhbmQiLCJrbSI6MTgsInR5cGUiOiJTdHVkZW50IENvbmNlc3Npb24iLCJmcm9tIjoiMjAyNi0wNC0wMSIsInRvIjoiMjAyNy0wMy0zMSIsImlzcyI6IktTUlRDLUFOQVZBTkRJIiwiaWF0IjoxNzg5ODYzMDIwfQ.WQ2uvQLOKXMWcKw4zH4hxMwLVsDaqgbves8DlAtbrUAm3afjt5hKJkFtjIHhcnfNXYtULPRV3ZzkCpMsNAWlLA'
};

// Web Audio synthesizer for tactile conductor feedback
function playVerificationSound(status) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (status === 'VALID') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (_) {}
}

// --- Network Status Hook ---
function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  return online;
}

// --- Status Result Display ---
function VerificationResultCard({ result, onScanAgain }) {
  const statusConfig = {
    VALID: { emoji: '✅', label: 'PASS VALID', cls: 'valid' },
    TAMPERED: { emoji: '🚫', label: 'TAMPERED / INVALID', cls: 'invalid' },
    EXPIRED: { emoji: '⏰', label: 'PASS EXPIRED', cls: 'expired' },
    REVOKED: { emoji: '❌', label: 'PASS REVOKED', cls: 'invalid' },
    ERROR: { emoji: '⚠️', label: 'ERROR', cls: 'invalid' },
  };
  const { emoji, label, cls } = statusConfig[result.status] || statusConfig.ERROR;
  const p = result.payload;

  return (
    <div className={`verification-result verification-result--${cls}`}>
      <div className="verification-result__icon">{emoji}</div>
      <div className={`verification-result__status verification-result__status--${cls}`}>{label}</div>

      {p && (
        <div className="verification-result__fields">
          {[
            ['Student', p.name],
            ['Roll No', p.sid],
            ['Institution', p.inst],
            ['Route', p.route],
            ['Valid Until', p.to],
            ['Pass ID', p.cid],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="verification-result__row">
              <span className="verification-result__label">{label}</span>
              <span className="verification-result__value">{value}</span>
            </div>
          ))}
        </div>
      )}

      {result.message && !p && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
          {result.message}
        </div>
      )}

      <div className="verification-result__mode">
        <span>{result.verifiedAt ? fmtDateTime(result.verifiedAt) : ''}</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <span className={`badge badge--${result.mode === 'OFFLINE' ? 'offline' : 'online'}`}>{result.mode}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{result.verificationTimeMs}ms</span>
        </div>
      </div>

      <button
        className="btn btn--outline btn--full"
        style={{ marginTop: '0.875rem' }}
        onClick={onScanAgain}
        id="scan-again-btn"
      >
        Scan Next Pass
      </button>
    </div>
  );
}

// --- Sync Queue Panel ---
function SyncQueuePanel({ queue, online, onSync, syncing }) {
  if (queue.length === 0) return null;

  return (
    <div className="sync-queue">
      <div className="sync-queue__header">
        <span>
          📤 Pending Sync
          <span style={{
            marginLeft: '0.375rem',
            background: 'var(--warning)',
            color: '#fff',
            borderRadius: 'var(--radius-full)',
            padding: '0.05rem 0.4rem',
            fontSize: '0.7rem',
            fontWeight: 800,
          }}>{queue.length}</span>
        </span>
        {online && (
          <button
            className="btn btn--primary btn--sm"
            onClick={onSync}
            disabled={syncing}
            id="sync-now-btn"
          >
            {syncing ? <><span className="spinner" /> Syncing…</> : 'Sync Now'}
          </button>
        )}
      </div>
      {queue.slice(0, 5).map(ev => (
        <div key={ev.localId} className="sync-queue__item">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {ev.studentName || ev.credentialId} · {fmtDateTime(ev.verifiedAt)}
          </span>
          <span className="badge badge--offline">OFFLINE</span>
        </div>
      ))}
      {queue.length > 5 && (
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          +{queue.length - 5} more events pending
        </div>
      )}
      {!online && (
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          Will sync automatically when back online
        </div>
      )}
    </div>
  );
}

// --- QR Scanner Component using html5-qrcode ---
function QRScannerView({ onScan, onCancel, onError }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if running on HTTPS or localhost — camera requires secure context
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      const msg = 'Camera access requires a secure (HTTPS) connection. Please access this page via HTTPS or ask your administrator.';
      setCamError(msg);
      if (onError) onError(msg);
      return;
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Your browser does not support camera access. Please use Chrome or Safari on a modern device.';
      setCamError(msg);
      if (onError) onError(msg);
      return;
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        showTorchButtonIfSupported: true,
      },
      false
    );

    scanner.render(
      (decodedText) => { onScan(decodedText); scanner.clear().catch(() => {}); },
      (error) => {
        // Detect permission denied
        if (error && (error.includes('Permission') || error.includes('NotAllowed') || error.includes('denied'))) {
          const msg = 'Camera permission was denied. Please allow camera access in your browser settings and reload.';
          setCamError(msg);
          if (onError) onError(msg);
        }
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  if (camError) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📵</div>
        <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Camera Not Available</div>
        <p style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '1.25rem', lineHeight: 1.6 }}>{camError}</p>
        <button className="btn btn--primary btn--full" onClick={onCancel} id="cancel-scan-btn">
          Switch to Manual Token & Test Pass Mode
        </button>
      </div>
    );
  }

  return (
    <div>
      <div id="qr-reader" ref={containerRef} style={{ width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }} />
      <button
        className="btn btn--outline btn--full"
        style={{ marginTop: '0.75rem' }}
        onClick={onCancel}
        id="cancel-scan-btn"
      >
        Cancel
      </button>
    </div>
  );
}

// --- Main Conductor App ---
export default function ConductorVerifier({ onLogout }) {
  const navigate = useNavigate();
  const user = api.getUser();
  const online = useNetworkStatus();

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      api.logout();
    }
    navigate('/login/ksrtc');
  };

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [queue, setQueue] = useState(getQueue);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [scanHistory, setScanHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const syncAttempted = useRef(false);

  // Redirect to login if not logged in or not a conductor
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'conductor') {
      navigate('/');
    }
  }, [user, navigate]);

  // Sync when online: fetch public key + revocation list
  useEffect(() => {
    if (online && !syncAttempted.current) {
      syncAttempted.current = true;
      syncPublicData();
    }
  }, [online]);

  // Auto-sync offline queue when we come back online
  useEffect(() => {
    if (online && queue.length > 0) {
      syncOfflineQueue();
    }
  }, [online]);

  const syncPublicData = async () => {
    try {
      const [jwk, revData] = await Promise.all([
        api.get('/verify/public-key'),
        api.get('/verify/revocations'),
      ]);
      cachePublicKey(jwk);
      cacheRevocations(revData.revocations || []);
      setLastSync(new Date().toISOString());
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Sync failed:', err.message);
      setSyncStatus('failed');
    }
  };

  const syncOfflineQueue = async () => {
    const q = getQueue();
    if (q.length === 0) return;
    setSyncing(true);
    try {
      const res = await api.post('/verify/events/batch', { events: q });
      const failed = (res.results || []).filter(r => r.status === 'failed').map(r => r.localId);
      const newQ = q.filter(ev => failed.includes(ev.localId));
      saveQueue(newQ);
      setQueue(newQ);
      setSyncStatus(`synced ${res.synced || q.length} events`);
    } catch (err) {
      console.warn('Batch sync failed:', err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleScan = useCallback(async (qrData) => {
    if (!qrData) return;
    setScanning(false);

    const verifyResult = await verifyCredentialOffline(qrData);
    setResult(verifyResult);
    playVerificationSound(verifyResult.status);

    // Build event object
    const event = {
      credentialId: verifyResult.payload?.cid || 'UNKNOWN',
      studentName: verifyResult.payload?.name || null,
      institutionName: verifyResult.payload?.inst || null,
      institutionId: verifyResult.payload?.instId || null,
      studentUserId: verifyResult.payload?.uid || null,
      routeFrom: verifyResult.payload?.from_stop || verifyResult.payload?.route?.split(' → ')[0] || null,
      routeTo: verifyResult.payload?.to_stop || verifyResult.payload?.route?.split(' → ')[1] || null,
      passId: verifyResult.payload?.cid || null,
      conductorId: user?.id || null,
      conductorName: user?.name || null,
      verificationMode: online ? 'ONLINE' : 'OFFLINE',
      verificationResult: verifyResult.status === 'VALID' ? 'VALID' :
                          verifyResult.status === 'EXPIRED' ? 'EXPIRED' :
                          verifyResult.status === 'REVOKED' ? 'REVOKED' : 'INVALID',
      verifiedAt: verifyResult.verifiedAt,
      deviceId: 'WEB-CONDUCTOR',
    };

    // Add to scan history
    setScanHistory(prev => [{ ...event, mode: online ? 'ONLINE' : 'OFFLINE', status: verifyResult.status }, ...prev.slice(0, 9)]);

    if (online) {
      // Post directly
      try {
        await api.post('/verify/event', event);
      } catch {
        // If online post fails, fallback to queue
        addToQueue(event);
        setQueue(getQueue());
      }
    } else {
      // Queue for later
      addToQueue(event);
      setQueue(getQueue());
    }
  }, [online, user]);

  const handleScanReset = () => {
    setResult(null);
    setCameraError(null);
    setManualToken('');
    setScanning(false);
  };

  const hasPublicKey = !!getCachedPublicKey();

  if (!user || user.role !== 'conductor') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🚌 🔒</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.5rem' }}>
            Conductor Verification Terminal
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            This terminal is restricted to authorized KSRTC bus conductors for offline and online digital student concession pass QR verification.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', justifyContent: 'center', background: '#064e3b', padding: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}
            onClick={() => navigate('/login/ksrtc')}
          >
            Sign In with Conductor ID
          </button>
          <button
            type="button"
            className="btn btn--outline"
            style={{ width: '100%', justifyContent: 'center', padding: '0.625rem' }}
            onClick={() => navigate('/')}
          >
            Return to Public Portal
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="conductor-app">
      {/* Header */}
      <div className="conductor-header">
        <div>
          <div className="conductor-header__brand">🚌 ANAVANDI Conductor</div>
          <div className="conductor-header__meta">{user.name} · KSRTC</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Sync indicator */}
          {lastSync && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              Synced<br />{fmtDateTime(lastSync)}
            </div>
          )}
          <div className={`network-status network-status--${online ? 'online' : 'offline'}`}>
            <div className={`network-dot network-dot--${online ? 'online' : 'offline'}`} />
            {online ? 'Online' : 'Offline'}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn--outline"
            id="conductor-logout-btn"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Sign Out / Exit"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      <div className="conductor-body">
        {/* Offline verification ready indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '0.45rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#065f46',
          fontWeight: 600
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🛡️</span> ECDSA P-256 Authority Verification Key Active
          </span>
          <span className="badge badge--active" style={{ fontSize: '0.65rem' }}>100% Offline Ready</span>
        </div>

        {/* Offline queue */}
        <SyncQueuePanel
          queue={queue}
          online={online}
          onSync={syncOfflineQueue}
          syncing={syncing}
        />

        {/* Scanner / Result */}
        {result ? (
          <VerificationResultCard result={result} onScanAgain={handleScanReset} />
        ) : scanning ? (
          <QRScannerView
            onScan={handleScan}
            onCancel={() => setScanning(false)}
            onError={(err) => setCameraError(err)}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '1.75rem 1.5rem' }}>
            <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>📷</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
              Scan Student Concession Pass
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Scan QR code on a student's phone or physical pass. Runs 100% offline via Web Crypto.
            </p>
            <button
              className="btn btn--primary btn--lg btn--full"
              onClick={() => { setCameraError(null); setScanning(true); }}
              id="start-scan-btn"
              style={{ fontWeight: 700, padding: '0.8rem' }}
            >
              📷 Open Camera Scanner
            </button>

            {/* Offline Test Suite & Manual Token Verification */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <span>⚡</span> Offline Verification Test Suite
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Test cryptographic ECDSA verification instantly (simulates real scannable QR tokens):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 0.25rem' }}
                  onClick={() => handleScan(SAMPLE_TOKENS.valid)}
                  title="Test valid issued pass for Karthik M V"
                >
                  🟢 Valid Pass
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 0.25rem' }}
                  onClick={() => handleScan(SAMPLE_TOKENS.expired)}
                  title="Test expired student pass (expired 2024)"
                >
                  ⏰ Expired Pass
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 0.25rem' }}
                  onClick={() => handleScan(SAMPLE_TOKENS.tampered)}
                  title="Test tampered student pass with forged data"
                >
                  🚫 Tampered Pass
                </button>
              </div>

              {/* Manual JWS / Token Input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                  placeholder="Paste student pass JWS token here…"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!manualToken.trim()}
                  onClick={() => {
                    handleScan(manualToken.trim());
                    setManualToken('');
                  }}
                  style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                >
                  Verify Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && !scanning && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Recent Scans
            </div>
            <div className="scan-history">
              {scanHistory.map((s, i) => (
                <div key={i} className="scan-history__item">
                  <span className="scan-history__status">
                    {s.status === 'VALID' ? '✅' : s.status === 'EXPIRED' ? '⏰' : '❌'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="scan-history__name">{s.studentName || s.credentialId || 'Unknown'}</div>
                    <div className="scan-history__meta">
                      {s.routeFrom && s.routeTo ? `${s.routeFrom} → ${s.routeTo} · ` : ''}
                      {fmtTime(s.verifiedAt)}
                    </div>
                  </div>
                  <span className={`badge badge--${s.mode === 'OFFLINE' ? 'offline' : 'online'}`}>{s.mode}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Sync Button */}
        {online && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={syncPublicData}
            style={{ textAlign: 'center', color: 'var(--text-muted)' }}
            id="manual-sync-btn"
          >
            ↻ Refresh Key & Revocation List
          </button>
        )}
      </div>
    </div>
  );
}
