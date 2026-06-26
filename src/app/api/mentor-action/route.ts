import { NextRequest, NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/email";
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

    if (action === "approve") {
      // The Postgres trigger automatically creates the mentor profile
      // We just need to send them an email notification
      await sendNotificationEmail({
        to: app.email,
        name: app.full_name,
        subject: "🎉 You've been approved as a Mentor on Smart Hunristan!",
        body: "Congratulations! Your mentor application has been reviewed and approved by our admin team. You can now log into your account to access your new Mentor Dashboard, manage your profile, and start helping participants."
      }).catch(console.error); // Do not fail the request if email fails
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