import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Get admin user from auth
    const { data: users } = await adminClient.auth.admin.listUsers();
    const adminUser = users?.users.find((u) => u.email === "qisrar951@gmail.com");

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found in auth" }, { status: 404 });
    }

    // Get admin profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", adminUser.id)
      .single();

    return NextResponse.json({
      auth_user: {
        id: adminUser.id,
        email: adminUser.email,
        email_confirmed_at: adminUser.email_confirmed_at,
      },
      profile,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error checking admin" },
      { status: 500 }
    );
  }
}
