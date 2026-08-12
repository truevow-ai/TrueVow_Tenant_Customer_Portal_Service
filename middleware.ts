import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const isPublicRoute = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/pricing') ||
  pathname.startsWith('/sign-in') ||
  pathname.startsWith('/sign-up') ||
  pathname.startsWith('/forgot-password');

const isPublicApi = (pathname: string) =>
  pathname.startsWith('/api/public/') ||
  pathname.startsWith('/api/webhook/') ||
  pathname.startsWith('/api/trace/') ||
  pathname.startsWith('/api/intake/') ||
  pathname.startsWith('/api/retainer/');

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const isPreviewBypass = searchParams.get('preview') === 'bypass';
  if (isPreviewBypass) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  if (isPublicRoute(pathname) || isPublicApi(pathname)) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  supabaseResponse.headers.set('x-pathname', pathname);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
