import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/verify-email-prompt",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/about",
  "/api/",
];

// Routes that require email verification
const PROTECTED_ROUTES = [
  "/dashboard",
  "/arena",
  "/practice",
  "/profile",
  "/hackathons",
  "/projects",
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

  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not authenticated - redirect to signin
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // User is authenticated - check email verification for protected routes
    if (isProtectedRoute(pathname)) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("email_verified, email")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      if (!profile.email_verified) {
        // Email not verified - redirect to verification prompt
        const verifyUrl = new URL("/auth/verify-email-prompt", request.url);
        verifyUrl.searchParams.set("email", profile.email);
        return NextResponse.redirect(verifyUrl);
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
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
