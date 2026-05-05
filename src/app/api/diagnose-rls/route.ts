import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check RLS policies and database state
 * GET /api/diagnose-rls?secret=YOUR_SETUP_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  
  // Simple auth check
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient({ admin: true });
  const diagnostics: any = {};

  try {
    // Test 1: Check if profiles table exists
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "profiles");
    
    diagnostics.profiles_table_exists = !tableError && tables && tables.length > 0;

    // Test 2: Try to INSERT a test profile as service_role
    const testUserId = "00000000-0000-0000-0000-000000000001";
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: testUserId,
        email: "test-rls-diagnostic@example.com",
        full_name: "Test User",
        role: "participant",
        organizer_status: "approved",
      });

    if (insertError) {
      diagnostics.insert_error = {
        code: insertError.code,
        message: insertError.message,
        hint: (insertError as any).hint,
      };
      diagnostics.insert_works = false;
    } else {
      diagnostics.insert_works = true;
      // Clean up
      await supabase.from("profiles").delete().eq("id", testUserId);
    }

    // Test 3: Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .rpc("get_rls_policies", { table_name: "profiles" })
      .catch(() => ({ data: null, error: "RPC not available" }));

    diagnostics.rls_policies = policies || "Could not fetch (need custom RPC)";

    // Test 4: List all RLS policy names (using raw query)
    diagnostics.rls_check_sql = `
      SELECT policyname, qual FROM pg_policies 
      WHERE tablename = 'profiles' 
      LIMIT 5;
    `;

    return NextResponse.json({
      status: diagnostics.insert_works ? "✓ RLS Working" : "✗ RLS Blocking Inserts",
      diagnostics,
      next_steps: !diagnostics.insert_works
        ? "1. Go to Supabase SQL Editor\n2. Run: DROP POLICY IF EXISTS profiles_insert_own ON profiles; CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR auth.jwt()->>'role' = 'service_role');\n3. Retry this endpoint"
        : "All RLS policies working correctly!",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
