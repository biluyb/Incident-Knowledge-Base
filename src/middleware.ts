import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/', // Dashboard is public (read-only)
  '/search',
  '/groups',
  '/knowledge',
  '/quick-lookup',
  '/api/search',
  '/api/groups',
  '/api/stats',
  '/api/keywords',
];

// Read-only API routes (accessible without auth)
const PUBLIC_API_ROUTES = [
  '/api/search',
  '/api/groups',
  '/api/incidents', // GET only
  '/api/knowledge', // GET only
  '/api/stats',
  '/api/keywords',
];

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true;

  // Check dynamic routes
  if (pathname.startsWith('/groups/')) return true;
  if (pathname.startsWith('/knowledge/') && !pathname.includes('/edit')) return true;
  if (pathname.startsWith('/incidents/') && !pathname.includes('/edit') && !pathname.includes('/new')) return true;
  if (pathname.startsWith('/search')) return true;

  return false;
}

function isPublicApiRoute(pathname: string): boolean {
  // Check if it's a GET request to a public API
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(route)) return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const token = request.cookies.get('kb-session')?.value;
  let session = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      // Invalid or expired token
      session = null;
    }
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    // For read-only API routes, allow GET without auth
    if (pathname.startsWith('/api/') && isPublicApiRoute(pathname)) {
      if (request.method === 'GET') {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Require authentication for protected routes
  if (!session) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const role = session.role as string;

  // Admin-only routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (role !== 'admin' && role !== 'knowledge_manager') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // User management routes (admin only)
  if (pathname.startsWith('/api/users') || pathname.startsWith('/admin/users')) {
    if (role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Audit log routes (admin and knowledge_manager)
  if (pathname.startsWith('/api/audit') || pathname.startsWith('/admin/audit')) {
    if (role !== 'admin' && role !== 'knowledge_manager') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Write operations require auth (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    if (pathname.startsWith('/api/')) {
      // Add user info to headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set('x-user-id', String(session.userId));
      response.headers.set('x-user-role', role);
      response.headers.set('x-user-email', String(session.email));
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
