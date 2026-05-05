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

  try {
    // Quick session check via cookies before calling getSession
    // This avoids lock contention on concurrent auth calls
    const cookieStore = request.cookies;
    const authToken = cookieStore.get('sb-auth-token') || cookieStore.get('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    
    // If no auth token in cookies, user is likely not authenticated
    if (!authToken) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Create client for profile verification if needed
    const supabase = await createClient();
    
    // For protected routes, verify email and profile
    if (isProtectedRoute(pathname)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          const signInUrl = new URL("/auth/signin", request.url);
          signInUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(signInUrl);
        }

        // Check profile and email verification
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("email_verified, email")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        if (!profile.email_verified) {
          const verifyUrl = new URL("/auth/verify-email-prompt", request.url);
          verifyUrl.searchParams.set("email", profile.email);
          return NextResponse.redirect(verifyUrl);
        }
      } catch (sessionError: any) {
        // If it's a lock error, allow through (dashboard will handle it)
        if (sessionError?.message?.includes("Lock broken")) {
          return NextResponse.next();
        }
        throw sessionError;
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // Don't block on middleware errors - let pages handle auth
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
