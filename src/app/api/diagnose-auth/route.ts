import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Comprehensive auth diagnostic endpoint
 * GET /api/diagnose-auth?secret=YOUR_SETUP_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagnostics: any = {
    env_vars: {
      SUPABASE_URL_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL_value: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
      ANON_KEY_exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ANON_KEY_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
      SERVICE_ROLE_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    auth_tests: {},
  };

  try {
    // Test 1: Can we create a Supabase client?
    const supabase = await createClient();
    diagnostics.auth_tests.client_created = true;

    // Test 2: Try to get current user (should fail if not logged in, but connection works)
    try {
      const { data, error } = await supabase.auth.getUser();
      diagnostics.auth_tests.get_user_endpoint = {
        success: !error,
        error: error?.message,
      };
    } catch (err: any) {
      diagnostics.auth_tests.get_user_endpoint = {
        success: false,
        error: err.message,
      };
    }

    // Test 3: Try to get sessions
    try {
      const { data, error } = await supabase.auth.getSession();
      diagnostics.auth_tests.get_session_endpoint = {
        success: !error,
        session_exists: !!data.session,
        error: error?.message,
      };
    } catch (err: any) {
      diagnostics.auth_tests.get_session_endpoint = {
        success: false,
        error: err.message,
      };
    }

    // Test 4: Check if we can access profiles table
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      diagnostics.auth_tests.profiles_table = {
        accessible: !error,
        error: error?.message,
      };
    } catch (err: any) {
      diagnostics.auth_tests.profiles_table = {
        accessible: false,
        error: err.message,
      };
    }

    return NextResponse.json({
      status: diagnostics.auth_tests.client_created ? "✓ Connected" : "✗ Failed",
      diagnostics,
      recommendations: generateRecommendations(diagnostics),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "✗ Critical Error",
      error: error.message,
      diagnostics,
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recs: string[] = [];

  if (!diagnostics.env_vars.SUPABASE_URL_exists) {
    recs.push("❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment");
  }
  if (!diagnostics.env_vars.ANON_KEY_exists) {
    recs.push("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment");
  }
  if (!diagnostics.env_vars.SERVICE_ROLE_exists) {
    recs.push("❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment");
  }

  const clientCreated = diagnostics.auth_tests.client_created;
  if (!clientCreated) {
    recs.push("❌ Cannot create Supabase client - check environment variables");
  }

  if (
    diagnostics.auth_tests.get_user_endpoint?.error?.includes("404") ||
    diagnostics.auth_tests.get_session_endpoint?.error?.includes("404")
  ) {
    recs.push(
      "❌ Supabase auth endpoints returning 404 - verify Supabase project URL is correct"
    );
  }

  if (recs.length === 0) {
    recs.push("✅ All systems operational!");
  }

  return recs;
}
