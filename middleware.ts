import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

// API paths that must stay reachable WITHOUT a session.
// Everything else under /api/* now requires a valid admin session, so no admin
// endpoint (paid-API routes included) can be driven anonymously.
const PUBLIC_API_PATHS = new Set<string>([
  '/api/auth/login',
  '/api/auth/logout',
]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('super_admin_auth')?.value;
  const session = await verifySessionToken(token);
  const isAuthenticated = session !== null;
  const userRole =
    session && 'role' in session
      ? session.role
      : (request.cookies.get('user_role')?.value as 'super_admin' | 'colleague' | undefined);

  // ── API routes ──
  if (path.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.has(path)) return NextResponse.next();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow the login page and the root for everyone.
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Colleague-allowed pages
  const colleagueAllowedPages = ['/domains', '/activity', '/contacts'];
  if (userRole === 'colleague') {
    const isAllowed = colleagueAllowedPages.some((allowedPath) => path.startsWith(allowedPath));
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/domains', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ],
};
