import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get('user_role')?.value as 'super_admin' | 'colleague' | undefined;
  const isAuthenticated = request.cookies.get('super_admin_auth')?.value === 'true';

  const path = request.nextUrl.pathname;

  // Allow access to login page and api routes for everyone
  if (path === '/login' || path.startsWith('/api/') || path === '/') {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Define colleague-allowed pages
  const colleagueAllowedPages = ['/domains', '/activity', '/contacts'];

  // If user is colleague, check if they're trying to access unauthorized page
  if (userRole === 'colleague') {
    const isAllowed = colleagueAllowedPages.some(allowedPath => path.startsWith(allowedPath));

    if (!isAllowed) {
      // Redirect to domains page (their default landing page)
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
