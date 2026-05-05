import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, fullName, role } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    console.log("ensure-profile called for:", { userId, email });

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error: Service role key not set" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("NEXT_PUBLIC_SUPABASE_URL is not configured");
      return NextResponse.json(
        { error: "Server configuration error: Supabase URL not set" },
        { status: 500 }
      );
    }

    // Use service role for privileged operations
    let supabase;
    try {
      supabase = await createClient({ admin: true });
      console.log("Service role client created successfully");
    } catch (clientErr) {
      console.error("Failed to create service role client:", clientErr);
      return NextResponse.json(
        { error: "Failed to initialize database client: " + (clientErr instanceof Error ? clientErr.message : "Unknown error") },
        { status: 500 }
      );
    }

    // Check if profile exists
    const { data: existingProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Profile fetch error details:", {
        code: fetchErr.code,
        message: fetchErr.message,
        details: (fetchErr as any).details,
      });
      // PGRST116 = no rows found (expected), continue
      // Other errors might be real issues, but let's try to continue anyway
      if (fetchErr.code !== "PGRST116") {
        console.warn("Unexpected fetch error, continuing:", fetchErr.message);
      }
    }

    // If profile exists, return it
    if (existingProfile) {
      console.log("Profile already exists for user:", userId);
      const { data: profile, error: selectErr } = await supabase
        .from("profiles")
        .select("email, role, organizer_status, is_banned, full_name, rejection_reason, email_verified")
        .eq("id", userId)
        .maybeSingle();
      
      if (selectErr) {
        console.error("Error fetching full profile:", selectErr);
        return NextResponse.json(
          { error: "Failed to fetch profile details: " + selectErr.message },
          { status: 500 }
        );
      }

      if (!profile) {
        console.warn("Profile exists (id found) but full data query returned nothing");
        return NextResponse.json(
          { error: "Profile data incomplete" },
          { status: 500 }
        );
      }

      return NextResponse.json({ profile, created: false });
    }

    // Profile doesn't exist, create it
    console.log("Creating profile for user:", userId);

    const profileData = {
      id: userId,
      email,
      full_name: fullName || email.split("@")[0] || "User",
      role: role || "participant",
      organizer_status: role === "organizer" ? "pending" : "approved",
    };

    console.log("Inserting profile with data:", profileData);

    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("email, role, organizer_status, is_banned, full_name, rejection_reason, email_verified")
      .maybeSingle();

    if (insertErr) {
      console.error("Profile insert error:", {
        code: insertErr.code,
        message: insertErr.message,
        details: (insertErr as any).details,
      });
      
      // For foreign key violations, wait a moment and try fetching
      // The trigger might still be creating the profile
      if (insertErr.code === "23503") {
        console.log("Foreign key constraint - waiting for trigger...");
        await new Promise(r => setTimeout(r, 500));
        
        const { data: triggeredProfile } = await supabase
          .from("profiles")
          .select("email, role, organizer_status, is_banned, full_name, rejection_reason, email_verified")
          .eq("id", userId)
          .maybeSingle();
        
        if (triggeredProfile) {
          console.log("Trigger created profile successfully");
          return NextResponse.json({ profile: triggeredProfile, created: false });
        }
      }
      
      // Try to fetch again - profile might have been created by trigger
      console.log("Attempting fallback fetch after insert error...");
      const { data: fallbackProfile } = await supabase
        .from("profiles")
        .select("email, role, organizer_status, is_banned, full_name, rejection_reason, email_verified")
        .eq("id", userId)
        .maybeSingle();
      
      if (fallbackProfile) {
        console.log("Fallback fetch succeeded");
        return NextResponse.json({ profile: fallbackProfile, created: false });
      }

      console.error("All profile creation attempts failed");
      return NextResponse.json(
        { error: "Failed to create profile: " + insertErr.message },
        { status: 500 }
      );
    }

    if (!newProfile) {
      console.warn("Insert succeeded but returned no data, retrying fetch...");
      // Try fetching again
      const { data: retryProfile } = await supabase
        .from("profiles")
        .select("email, role, organizer_status, is_banned, full_name, rejection_reason, email_verified")
        .eq("id", userId)
        .maybeSingle();
      
      if (retryProfile) {
        console.log("Retry fetch succeeded");
        return NextResponse.json({ profile: retryProfile, created: true });
      }

      console.error("Retry fetch also returned no data");
      return NextResponse.json(
        { error: "Profile creation returned no data" },
        { status: 500 }
      );
    }

    console.log("Profile created successfully");
    return NextResponse.json({ profile: newProfile, created: true });
  } catch (error) {
    console.error("ensure-profile error:", error);
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
