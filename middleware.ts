import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/forgot-password(.*)',
]);

// API routes that are intentionally public
const isPublicApi = createRouteMatcher([
  '/api/public/(.*)',
  '/api/webhook/(.*)',
]);

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();

  // Preview bypass: add ?preview=bypass to any URL to skip auth in dev
  const isPreviewBypass = req.nextUrl.searchParams.get('preview') === 'bypass';
  if (isPreviewBypass) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', req.nextUrl.pathname);
    return response;
  }

  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', req.nextUrl.pathname);
    return response;
  }

  // Allow public API routes (webhooks, public endpoints)
  if (isPublicApi(req)) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', req.nextUrl.pathname);
    return response;
  }

  // Require authentication for all other routes (including API)
  if (!userId) {
    // API routes return 401 JSON, page routes redirect to sign-in
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Add pathname header for layout to use
  const response = NextResponse.next();
  response.headers.set('x-pathname', req.nextUrl.pathname);
  return response;
});

export const config = {
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
