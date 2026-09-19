// Credential Signer — ECDSA P-256 JWS
// Signs a credential payload into a compact JWS token
// The JWS token is what gets embedded into the QR code

import { importPKCS8, CompactSign } from 'jose';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_FALLBACK_PRIVATE_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgAtqb3r08E3TQJFEU
nbNGFTTUt4Vaf+8rpeNHDdKx3iahRANCAATG7aegwGZC0Ea9fo3K7ESWfqFC9Ick
cGfdmCilDxW+ddA3H7YCHeJQY4We9J93SFutjwONWYl+4hx3avi1mASx
-----END PRIVATE KEY-----`;

const DEFAULT_PUBLIC_JWK = {
  kty: 'EC',
  x: 'xu2noMBmQtBGvX6NyuxEln6hQvSHJHBn3ZgopQ8VvnU',
  y: '0DcftgId4lBjhZ70n3dIW62PA41ZiX7iHHdq-LWYBLE',
  crv: 'P-256',
  alg: 'ES256',
  use: 'sig'
};

let privateKey = null;

async function getPrivateKey() {
  if (!privateKey) {
    let pem = process.env.PRIVATE_KEY_PEM;
    if (!pem) {
      try {
        pem = readFileSync(join(__dirname, '../keys/private.pem'), 'utf8');
      } catch (err) {
        console.warn('Could not read private.pem from disk, using fallback ECDSA key:', err.message);
      }
    }
    if (!pem) {
      pem = DEFAULT_FALLBACK_PRIVATE_PEM;
    }
    privateKey = await importPKCS8(pem, 'ES256');
  }
  return privateKey;
}

/**
 * Sign a credential payload → compact JWS string
 * @param {Object} payload - The credential data (name, roll, institution, validity, etc.)
 * @returns {string} Compact JWS string (header.payload.signature)
 */
export async function signCredential(payload) {
  const key = await getPrivateKey();
  
  const encoder = new TextEncoder();
  const jws = await new CompactSign(encoder.encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .sign(key);
  
  return jws;
}

/**
 * Get the public key JWK (for sending to client)
 */
export function getPublicKeyJWK() {
  try {
    const jwk = readFileSync(join(__dirname, '..', 'keys', 'public.jwk.json'), 'utf-8');
    return JSON.parse(jwk);
  } catch (_) {
    return DEFAULT_PUBLIC_JWK;
  }
}
