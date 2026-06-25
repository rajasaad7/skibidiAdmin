import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Legacy scrypt password hashing for the affiliates table. The partner-facing
// portal (separate app) logs in via a bcrypt hash set in Postgres through the
// set_affiliate_password RPC; this scrypt column is kept in sync for back-compat.
// Only hashPassword is used by the admin affiliate-management API.

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}
