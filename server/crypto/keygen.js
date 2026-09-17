// ECDSA P-256 Key Pair Generator
// Run once: node crypto/keygen.js
// Generates private.pem and public.pem in the keys/ directory
// Also exports public key as JWK for the client-side verifier

import { generateKeyPair, exportJWK, exportPKCS8, exportSPKI } from 'jose';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, '..', 'keys');

async function generateKeys() {
  console.log('🔐 Generating ECDSA P-256 key pair...\n');

  const { publicKey, privateKey } = await generateKeyPair('ES256');

  // Export as PEM for server-side use
  const privatePem = await exportPKCS8(privateKey);
  const publicPem = await exportSPKI(publicKey);

  // Export public key as JWK for client-side Web Crypto API verification
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  // Write files
  mkdirSync(keysDir, { recursive: true });
  writeFileSync(join(keysDir, 'private.pem'), privatePem);
  writeFileSync(join(keysDir, 'public.pem'), publicPem);
  writeFileSync(join(keysDir, 'public.jwk.json'), JSON.stringify(publicJwk, null, 2));

  console.log('✅ Keys generated successfully!\n');
  console.log('   Private key: keys/private.pem (keep secret!)');
  console.log('   Public key:  keys/public.pem');
  console.log('   Public JWK:  keys/public.jwk.json (bundle into client)\n');
  console.log('Public JWK (embed in conductor verifier):');
  console.log(JSON.stringify(publicJwk, null, 2));
}

generateKeys().catch(console.error);
