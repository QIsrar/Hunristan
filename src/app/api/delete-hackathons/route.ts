import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { hackathonId } = await req.json();
    if (!hackathonId) return NextResponse.json({ error: "Missing hackathonId" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("id, organizer_id, is_approved, status")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (hackathon.organizer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (hackathon.is_approved) return NextResponse.json({ error: "Cannot delete an approved hackathon" }, { status: 403 });

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: problems } = await admin.from("problems").select("id").eq("hackathon_id", hackathonId);
    if (problems && problems.length > 0) {
      await admin.from("test_cases").delete().in("problem_id", problems.map((p: any) => p.id));
      await admin.from("problems").delete().eq("hackathon_id", hackathonId);
    }
    await admin.from("registrations").delete().eq("hackathon_id", hackathonId);
    const { error } = await admin.from("hackathons").delete().eq("id", hackathonId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}