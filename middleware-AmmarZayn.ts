// Clerk v5 Middleware
// Note: This file is an alternative middleware - the main one is middleware.ts

import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  publicRoutes: ['/'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};


