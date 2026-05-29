import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) return NextResponse.next();

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const isValid = validateSession(sessionToken);

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');
  const isLocalApi = request.nextUrl.pathname.startsWith('/api/local');

  if (!isValid && !isLoginPage && !isApiAuth && !isLocalApi) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isValid && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
