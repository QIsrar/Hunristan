import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/organizer-action
 * Body: { organizerId: string, action: "approve" | "reject", reason?: string }
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { organizerId, action, reason } = body as {
      organizerId: string;
      action: "approve" | "reject";
      reason?: string;
    };

    if (!organizerId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get organizer profile
    const { data: orgProfile } = await supabase
      .from("profiles")
      .select("full_name, email, organization")
      .eq("id", organizerId)
      .single();

    if (!orgProfile) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    // Update organizer status
    const updateData: Record<string, string | null> = {
      organizer_status: action === "approve" ? "approved" : "rejected",
    };
    if (action === "reject" && reason) {
      updateData.rejection_reason = reason;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", organizerId);

    if (updateError) throw updateError;

    // Send in-app notification to organizer
    const notifTitle = action === "approve"
      ? "🎉 Your Organizer Account is Approved!"
      : "❌ Organizer Application Not Approved";

    const notifMessage = action === "approve"
      ? `Welcome to Smart Hunristan! Your account for ${orgProfile.organization || "your organization"} has been approved. You can now create and manage hackathons.`
      : `Your organizer application${reason ? ` was not approved. Reason: ${reason}` : " was not approved at this time."}`;

    await supabase.from("notifications").insert({
      user_id: organizerId,
      type: action === "approve" ? "organizer_approved" : "organizer_rejected",
      title: notifTitle,
      message: notifMessage,
      link: action === "approve" ? "/dashboard/organizer" : "/auth/signup",
    });

    // Fire email in background — do NOT await (avoids 28s timeout)
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      import("@/lib/email").then(m => m.sendOrganizerDecisionEmail({
        to: orgProfile.email,
        name: orgProfile.full_name,
        organization: orgProfile.organization || "",
        action,
        reason: reason || undefined,
      })).catch(e => console.warn("Email notification failed (non-fatal):", e));
    }

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? `${orgProfile.full_name}'s account approved`
        : `${orgProfile.full_name}'s application rejected`,
    });
  } catch (err: unknown) {
    console.error("Organizer action error:", err);
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}