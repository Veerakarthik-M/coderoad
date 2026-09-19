// Credential Signer — ECDSA P-256 JWS
// Signs a credential payload into a compact JWS token
// The JWS token is what gets embedded into the QR code

import { importPKCS8, CompactSign } from 'jose';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let privateKey = null;

async function getPrivateKey() {
  if (!privateKey) {
    const pem = process.env.PRIVATE_KEY_PEM;
    if (!pem) {
      throw new Error('FATAL: PRIVATE_KEY_PEM environment variable is not set');
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
  const jwk = readFileSync(join(__dirname, '..', 'keys', 'public.jwk.json'), 'utf-8');
  return JSON.parse(jwk);
}
