import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // Use service client — applicant may not be logged in, RLS would block anon inserts
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const {
      full_name, email, phone, job_title, organization,
      years_experience, expertise, bio, linkedin_url, github_url,
      why_mentor, availability_hours,
    } = body;

    if (!full_name || !email || !phone || !job_title || !organization || !expertise?.length || !bio || !why_mentor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (phone.length !== 11) {
      return NextResponse.json({ error: "Phone number must be exactly 11 digits" }, { status: 400 });
    }

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("mentor_applications")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") return NextResponse.json({ error: "You already have a pending application." }, { status: 409 });
      if (existing.status === "approved") return NextResponse.json({ error: "You are already an approved mentor!" }, { status: 409 });
      // rejected — allow reapplication by updating
    }

    const { error } = await adminClient.from("mentor_applications").upsert({
      full_name, email, phone, job_title, organization,
      years_experience: parseInt(years_experience) || 0,
      expertise, bio, linkedin_url, github_url,
      why_mentor, availability_hours: parseInt(availability_hours) || 2,
      status: "pending",
    }, { onConflict: "email" });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Mentor apply error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Submission failed" }, { status: 500 });
  }
}