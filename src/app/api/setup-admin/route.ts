import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/setup-admin
 * One-time route to create the default platform admin.
 * Protected by SETUP_SECRET env var.
 * Disables itself once an admin already exists.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/setup-admin \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"your_SETUP_SECRET"}'
 */
export async function POST(request: NextRequest) {
  const SETUP_SECRET = process.env.SETUP_SECRET;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set in environment" },
      { status: 500 }
    );
  }

  if (!SETUP_SECRET) {
    return NextResponse.json(
      { error: "SETUP_SECRET not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    if (body.secret !== SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    // Use service-role client (bypasses RLS)
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if admin already exists — endpoint is single-use
    const { data: existingAdmins, count } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (count && count > 0 && existingAdmins && existingAdmins.length > 0) {
      // Admin exists, but ensure email_verified is true
      const adminId = existingAdmins[0].id;
      await adminClient
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", adminId);
      
      return NextResponse.json(
        { message: "Admin already exists. Email verification ensured.", email_verified: true },
        { status: 200 }
      );
    }

    // Create auth user via Admin API
    const { data: userData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: "qisrar951@gmail.com",
        password: "admiN@123",
        email_confirm: true,
        user_metadata: {
          full_name: "Platform Admin",
          role: "admin",
        },
      });

    if (createError) {
      // If user already exists in auth, update profile and return success
      if (createError.message.includes("already registered") || createError.code === "email_exists") {
        console.log("Admin user already exists in auth, ensuring email verified...");
        try {
          const { data: existingUser } =
            await adminClient.auth.admin.listUsers();
          const match = existingUser?.users.find(
            (u) => u.email === "qisrar951@gmail.com"
          );
          if (match) {
            // Update profile to ensure admin role and email_verified
            await adminClient
              .from("profiles")
              .update({ 
                role: "admin", 
                organizer_status: "approved",
                email_verified: true 
              })
              .eq("id", match.id);
          }
        } catch (listErr) {
          console.warn("Could not list users:", listErr);
        }
        // Return success regardless - user exists and we've tried to update profile
        return NextResponse.json({
          success: true,
          message: "Admin account confirmed",
          email: "qisrar951@gmail.com",
          email_verified: true,
        });
      }
      throw createError;
    }

    // Ensure profile has admin role (trigger may have created it as participant)
    if (userData.user) {
      await adminClient
        .from("profiles")
        .update({
          role: "admin",
          organizer_status: "approved",
          email_verified: true,
        })
        .eq("id", userData.user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      email: "qisrar951@gmail.com",
      note: "Change password after first login!",
    });
  } catch (err: unknown) {
    console.error("Setup admin error:", err);
    const message = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Disable GET to prevent accidental exposure
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
