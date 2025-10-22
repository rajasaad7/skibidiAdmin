import { cookies } from 'next/headers';

export async function checkAuth() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('super_admin_auth')?.value === 'true';
  return isAuthenticated;
}

export async function setAuth() {
  const cookieStore = await cookies();
  cookieStore.set('super_admin_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

export async function clearAuth() {
  const cookieStore = await cookies();
  cookieStore.delete('super_admin_auth');
}
