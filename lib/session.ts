// ============================================================
// Signed admin session token (edge- AND node-safe)
// ============================================================
// Used by middleware (edge runtime) and route handlers / lib/auth (node).
// No `next/headers` import here so it is safe to import from middleware.
//
// The cookie `super_admin_auth` holds a token: `<payloadB64>.<sigB64>`
// where payload = base64url(JSON {email, role, iat}) and sig = HMAC-SHA256
// of payloadB64 with ADMIN_SESSION_SECRET. verifySessionToken recomputes the
// signature with a constant-time compare.
//
// Backward compatible: while ADMIN_SESSION_SECRET is unset, the legacy literal
// value "true" is still accepted so a deploy before the env var is set does not
// lock the admin out. Once the secret is set and the admin signs in again, the
// legacy value is rejected, closing the cookie-forgery hole.

import type { UserRole } from './auth-types';

const te = new TextEncoder();

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa exists in both edge and node runtimes
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToString(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(data));
  return bytesToB64Url(new Uint8Array(sig));
}

// Constant-time string compare (avoids leaking the signature via timing).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SessionPayload {
  email: string;
  role: UserRole;
  iat: number;
}

export async function signSessionToken(email: string, role: UserRole): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  // No secret configured yet: keep the legacy value so nothing breaks pre-rollout.
  if (!secret) return 'true';
  const payload: SessionPayload = { email, role, iat: Date.now() };
  const payloadB64 = bytesToB64Url(te.encode(JSON.stringify(payload)));
  const sig = await hmac(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// Returns the payload when the token is a valid signed session, or a legacy
// marker when the plain "true" value is still allowed. null = reject.
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | { legacy: true } | null> {
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    // Transition window: accept only the legacy literal while unconfigured.
    return token === 'true' ? { legacy: true } : null;
  }

  const dot = token.indexOf('.');
  if (dot <= 0) return null; // not a signed token (legacy "true" no longer allowed once secret is set)
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payloadB64, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64UrlToString(payloadB64)) as SessionPayload;
    if (!payload || typeof payload.email !== 'string' || typeof payload.role !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}
