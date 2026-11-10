import { cookies } from 'next/headers';
import type { UserRole } from './auth-types';
import { signSessionToken, verifySessionToken } from './session';

export type { UserRole };

export async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_auth')?.value;
  const session = await verifySessionToken(token);
  return session !== null;
}

export async function getAdminEmail() {
  const cookieStore = await cookies();
  return cookieStore.get('super_admin_email')?.value || 'admin@linkwatcher.io';
}

export async function getUserRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value as UserRole;
  return role || 'super_admin';
}

export async function setAuth(email: string, role: UserRole = 'super_admin') {
  const cookieStore = await cookies();
  const token = await signSessionToken(email, role);
  cookieStore.set('super_admin_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  cookieStore.set('super_admin_email', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  cookieStore.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

export async function clearAuth() {
  const cookieStore = await cookies();
  cookieStore.delete('super_admin_auth');
  cookieStore.delete('super_admin_email');
  cookieStore.delete('user_role');
}

export function getAllowedPages(role: UserRole): string[] {
  if (role === 'super_admin') {
    return ['/dashboard', '/activity', '/users', '/affiliates', '/domains', '/orders', '/payouts', '/kyc-check', '/indexer', '/contacts', '/moderation-requests', '/bugs'];
  }
  if (role === 'colleague') {
    return ['/domains', '/activity', '/contacts'];
  }
  return [];
}
