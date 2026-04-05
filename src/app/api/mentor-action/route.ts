import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const sc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { applicationId, action, reason } = await req.json();

    const { data: app } = await sc().from("mentor_applications").select("*").eq("id", applicationId).single();
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    await sc().from("mentor_applications").update({
      status: action === "approve" ? "approved" : "rejected",
      admin_note: reason || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", applicationId);

    // If approved, add to public mentors table so they appear on /mentors page
    if (action === "approve") {
      await sc().from("mentors").upsert({
        name: app.full_name,
        bio: app.bio,
        expertise: app.expertise,
        linkedin_url: app.linkedin_url,
        github_url: app.github_url,
        is_active: true,
      }, { onConflict: "name" });
    }

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? `${app.full_name} approved and added to the mentors listing.`
        : `${app.full_name}'s application rejected.`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}