import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSC } from "@supabase/supabase-js";

const sc = () => createSC(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to register" }, { status: 401 });

    const { hackathon_id } = await req.json();
    if (!hackathon_id) return NextResponse.json({ error: "Hackathon ID required" }, { status: 400 });

    // Check profile role
    const { data: profile } = await sc().from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "organizer" || profile?.role === "admin") {
      return NextResponse.json({ error: "Organizers and admins cannot participate" }, { status: 403 });
    }

    // Get hackathon
    const { data: hack } = await sc().from("hackathons")
      .select("id,status,max_participants,participant_count,registration_fee,title")
      .eq("id", hackathon_id).single();

    if (!hack) return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    if (!["active","upcoming"].includes(hack.status)) {
      return NextResponse.json({ error: "This hackathon is no longer accepting registrations" }, { status: 400 });
    }

    // Check max participants cap
    if (hack.max_participants && hack.participant_count >= hack.max_participants) {
      return NextResponse.json({ error: "This hackathon is full" }, { status: 400 });
    }

    // Check already registered
    const { data: existing } = await sc().from("registrations")
      .select("id").eq("hackathon_id", hackathon_id).eq("user_id", user.id).maybeSingle();
    if (existing) return NextResponse.json({ error: "You are already registered" }, { status: 409 });

    // Register (trigger handles participant_count increment)
    const { error } = await sc().from("registrations").insert({
      hackathon_id,
      user_id: user.id,
      payment_status: hack.registration_fee > 0 ? "pending" : "not_required",
    });
    if (error) throw error;

    // Send notification to participant
    await sc().from("notifications").insert({
      user_id: user.id,
      type: "registration_confirmed",
      title: "Registration Confirmed!",
      message: `You're registered for ${hack.title}. ${hack.registration_fee > 0 ? "Payment required before you can compete." : "Good luck!"}`,
      link: `/hackathons/${hackathon_id}`,
    });

    return NextResponse.json({
      success: true,
      requires_payment: hack.registration_fee > 0,
      message: hack.registration_fee > 0
        ? "Registered! Upload payment screenshot to unlock competition access."
        : "Registered! Good luck 🎉",
    });
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Registration failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Unregister
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hackathon_id } = await req.json();

    // Only allow unregistration from upcoming hackathons
    const { data: hack } = await sc().from("hackathons").select("status").eq("id", hackathon_id).single();
    if (hack?.status === "active") {
      return NextResponse.json({ error: "Cannot unregister from an active hackathon" }, { status: 400 });
    }

    const { error } = await sc().from("registrations")
      .delete().eq("hackathon_id", hackathon_id).eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}