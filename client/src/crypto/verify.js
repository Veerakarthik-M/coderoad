// Offline ECDSA Verification — uses Web Crypto API (no external libraries)
// This runs entirely in the browser with zero network dependency

const PUBLIC_KEY_STORAGE_KEY = 'anavandi_public_key_jwk';
const REVOCATION_STORAGE_KEY = 'anavandi_revocations';
const LAST_SYNC_KEY = 'anavandi_last_sync';

// Default KSRTC Authority Public Key JWK (embedded for 100% zero-config offline verification)
export const DEFAULT_PUBLIC_JWK = {
  kty: 'EC',
  x: 'xu2noMBmQtBGvX6NyuxEln6hQvSHJHBn3ZgopQ8VvnU',
  y: '0DcftgId4lBjhZ70n3dIW62PA41ZiX7iHHdq-LWYBLE',
  crv: 'P-256',
  alg: 'ES256',
  use: 'sig'
};

// Base64url decode helper
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Safely decode UTF-8 JSON payload from base64url
function decodeBase64UrlPayload(base64url) {
  const buffer = base64urlToBuffer(base64url);
  const decoder = new TextDecoder('utf-8');
  return JSON.parse(decoder.decode(buffer));
}

// Convert DER-encoded ECDSA signature to raw r||s format (needed by Web Crypto)
function derToRaw(derSig) {
  const view = new Uint8Array(derSig);
  // DER format: 0x30 [len] 0x02 [r_len] [r...] 0x02 [s_len] [s...]
  let offset = 2; // skip 0x30 and total length
  
  // Read r
  if (view[offset] !== 0x02) throw new Error('Invalid DER signature');
  offset++;
  const rLen = view[offset]; offset++;
  let r = view.slice(offset, offset + rLen);
  offset += rLen;
  
  // Read s  
  if (view[offset] !== 0x02) throw new Error('Invalid DER signature');
  offset++;
  const sLen = view[offset]; offset++;
  let s = view.slice(offset, offset + sLen);
  
  // Remove leading zeros (DER uses them for positive integers)
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  
  // Pad to 32 bytes each
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  
  return raw.buffer;
}

/**
 * Cache the public key JWK in localStorage
 */
export function cachePublicKey(jwk) {
  localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, JSON.stringify(jwk));
}

/**
 * Get cached public key
 */
export function getCachedPublicKey() {
  const data = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (_) {
      // Ignore parse error and fallback to default
    }
  }
  return DEFAULT_PUBLIC_JWK;
}

/**
 * Cache the revocation list in localStorage
 */
export function cacheRevocations(revocations) {
  localStorage.setItem(REVOCATION_STORAGE_KEY, JSON.stringify(revocations));
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

/**
 * Get cached revocations
 */
export function getCachedRevocations() {
  const data = localStorage.getItem(REVOCATION_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Get last sync time
 */
export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

/**
 * Verify a JWS credential entirely offline using Web Crypto API
 * @param {string} jwsToken - The compact JWS string from the QR code
 * @returns {Object} { status: 'VALID'|'TAMPERED'|'EXPIRED'|'REVOKED', payload, verificationTimeMs }
 */
export async function verifyCredentialOffline(jwsToken) {
  const startTime = performance.now();
  
  try {
    // 1. Split JWS into parts
    const parts = (jwsToken || '').trim().split('.');
    if (parts.length !== 3) {
      return result('TAMPERED', null, startTime, 'Invalid credential format');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    // 2. Get cached public key (falls back to default authority key)
    const publicKeyJWK = getCachedPublicKey();
    if (!publicKeyJWK) {
      return result('ERROR', null, startTime, 'No public key available for verification');
    }

    // 3. Import public key using Web Crypto API
    const key = await crypto.subtle.importKey(
      'jwk',
      publicKeyJWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // 4. Prepare data and signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureRaw = base64urlToBuffer(signatureB64);
    
    // Check if signature is DER-encoded or raw
    const sigBytes = new Uint8Array(signatureRaw);
    let signature;
    if (sigBytes[0] === 0x30) {
      // DER-encoded (from jose library), convert to raw r||s
      signature = derToRaw(signatureRaw);
    } else if (signatureRaw.byteLength === 64) {
      // Already raw r||s format
      signature = signatureRaw;
    } else {
      return result('TAMPERED', null, startTime, 'Invalid signature format');
    }

    // 5. Verify signature using Web Crypto
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      data
    );

    if (!valid) {
      return result('TAMPERED', null, startTime, 'Credential signature verification failed (tampered)');
    }

    // 6. Decode payload with UTF-8 support
    const payload = decodeBase64UrlPayload(payloadB64);

    // 7. Check expiry
    if (payload.to) {
      const expiryDate = new Date(payload.to + 'T23:59:59');
      if (new Date() > expiryDate) {
        return result('EXPIRED', payload, startTime, `Expired on ${payload.to}`);
      }
    }

    // 8. Check revocation list (cached)
    const revocations = getCachedRevocations();
    if (payload.cid && revocations.includes(payload.cid)) {
      return result('REVOKED', payload, startTime, 'This credential has been revoked');
    }

    // 9. SUCCESS
    return result('VALID', payload, startTime);

  } catch (err) {
    console.error('Verification error:', err);
    return result('TAMPERED', null, startTime, err.message || 'Verification failed');
  }
}

function result(status, payload, startTime, message) {
  return {
    status,
    payload,
    message,
    verificationTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    verifiedAt: new Date().toISOString(),
    mode: (typeof navigator !== 'undefined' && navigator.onLine) ? 'ONLINE' : 'OFFLINE'
  };
}
