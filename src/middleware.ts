import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/about",
  "/hackathons",
  "/mentors",
  "/projects",
  "/api",  // ← Changed from "/api/" to "/api" (no trailing slash)
];

// Routes that require email verification
const PROTECTED_ROUTES = [
  "/dashboard",
  "/arena",
  "/practice",
  "/profile",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith("*")) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected routes are validated in the page components with safeGetUser().
  // Keep middleware passive so client-side auth state stored in localStorage
  // does not get blocked before the dashboard can load.
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
