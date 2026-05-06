import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyBearerToken } from "@/lib/supabase/verifyToken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, type } = body || {};
    const authHeader = req.headers.get("authorization") || "";
    const decoded = verifyBearerToken(authHeader);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const adminId = decoded.sub;

    const supabase = await createClient({ admin: true });

    // Ensure caller is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", adminId).maybeSingle();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Insert announcement
    const { error: annErr } = await supabase.from("announcements").insert({ admin_id: adminId, title, content, type: type || "info", is_active: true });
    if (annErr) return NextResponse.json({ error: annErr.message }, { status: 500 });

    // Create per-user notifications (non-banned users)
    const { data: users } = await supabase.from("profiles").select("id").neq("is_banned", true);
    if (users && users.length) {
      const inserts = users.map((u: any) => ({ user_id: u.id, type: "announcement", title: title || "Announcement", message: content || "", link: null }));
      await supabase.from("notifications").insert(inserts);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("post-announcement error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
