import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/forgot-password(.*)',
  '/api/(.*)', // API routes are public (they handle their own auth if needed)
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

  // Require authentication for all other routes
  if (!userId) {
    // Redirect to sign-in if not authenticated
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
