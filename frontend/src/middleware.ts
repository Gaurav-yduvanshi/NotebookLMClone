import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require authentication
const PUBLIC = ['/', '/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and Next.js internals
  if (PUBLIC.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Check for session cookie (set by Express Passport / connect-mongo)
  const session = request.cookies.get('connect.sid')
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/notes/:path*'],
}
