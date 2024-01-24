import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const middleware = (req: NextRequest) => {
  const authenticatedOnly = ['/', '/view'];
  const unAuthenticatedOnly = ['/login'];
  if (authenticatedOnly.includes(req.nextUrl.pathname) && !req.cookies.get('user')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (unAuthenticatedOnly.includes(req.nextUrl.pathname) && req.cookies.get('user')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
};
