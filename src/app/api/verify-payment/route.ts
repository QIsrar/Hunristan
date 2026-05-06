import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSC } from "@supabase/supabase-js";
import { verifyBearerToken } from "@/lib/supabase/verifyToken";

const sc = () => createSC(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyBearerToken(`Bearer ${accessToken}`);
    if (!decoded || !decoded.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = decoded.sub;

    const admin = sc();
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { registration_id, action, hackathon_id } = await req.json();
    if (!["verify","reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    // Check organizer owns this hackathon
    const { data: hack } = await sc().from("hackathons").select("organizer_id,title").eq("id", hackathon_id).single();
    const { data: adminProf } = await sc().from("profiles").select("role").eq("id", user.id).single();
    if (hack?.organizer_id !== user.id && adminProf?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newStatus = action === "verify" ? "verified" : "rejected";
    const { data: reg, error } = await sc().from("registrations")
      .update({ payment_status: newStatus })
      .eq("id", registration_id)
      .select("user_id")
      .single();
    if (error) throw error;

    // Notify participant
    await sc().from("notifications").insert({
      user_id: reg.user_id,
      type: action === "verify" ? "payment_verified" : "payment_rejected",
      title: action === "verify" ? "✅ Payment Verified!" : "❌ Payment Rejected",
      message: action === "verify"
        ? `Your payment for ${hack?.title} has been verified. You can now enter the arena!`
        : `Your payment screenshot for ${hack?.title} was rejected. Please upload a valid screenshot.`,
      link: `/hackathons/${hackathon_id}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}