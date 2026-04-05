import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/payment-upload
 * Accepts a base64-encoded image and stores it in Supabase Storage.
 * Then updates the registration payment_status to 'pending'.
 *
 * Body: { hackathon_id: string, image_base64: string, file_extension: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { hackathon_id, image_base64, file_extension, transaction_id } = body as {
      hackathon_id: string;
      image_base64: string;
      file_extension: string;
      transaction_id?: string;
    };

    if (!hackathon_id || !image_base64 || !file_extension) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!transaction_id?.trim()) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    // Check registration exists
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, payment_status")
      .eq("hackathon_id", hackathon_id)
      .eq("user_id", user.id)
      .single();

    if (!reg) {
      return NextResponse.json({ error: "Not registered for this hackathon" }, { status: 404 });
    }

    if (reg.payment_status === "verified") {
      return NextResponse.json({ error: "Payment already verified" }, { status: 409 });
    }

    // Use admin client to bypass storage RLS
    const adminClient = createAdminClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Convert base64 to buffer
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const allowed = ["jpg", "jpeg", "png", "pdf", "webp"];
    const ext = file_extension.toLowerCase().replace(".", "");
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG or PDF." }, { status: 400 });
    }

    // Max 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const fileName = `${hackathon_id}/${user.id}_${Date.now()}.${ext}`;
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      pdf: "application/pdf", webp: "image/webp",
    };

    // Upload to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from("payment-screenshots")
      .upload(fileName, buffer, {
        contentType: mimeTypes[ext] || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      // If bucket doesn't exist, return a helpful error
      if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("bucket")) {
        return NextResponse.json({
          error: "Storage bucket 'payment-screenshots' not found. Create it in Supabase Dashboard → Storage.",
          hint: "See SETUP.md for storage bucket setup instructions.",
        }, { status: 503 });
      }
      throw uploadError;
    }

    // Get public URL (or signed URL for private bucket)
    const { data: { publicUrl } } = adminClient.storage
      .from("payment-screenshots")
      .getPublicUrl(fileName);

    // Update registration
    await supabase
      .from("registrations")
      .update({
        payment_screenshot_url: publicUrl || fileName,
        payment_status: "pending",
        transaction_id: transaction_id?.trim() || null,
      })
      .eq("hackathon_id", hackathon_id)
      .eq("user_id", user.id);

    // Notify organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, title")
      .eq("id", hackathon_id)
      .single();

    if (hackathon?.organizer_id) {
      await supabase.from("notifications").insert({
        user_id: hackathon.organizer_id,
        type: "payment_received",
        title: "💰 New Payment Screenshot",
        message: `A participant has uploaded a payment screenshot for ${hackathon.title}. Review and verify in your dashboard.`,
        link: `/dashboard/organizer`,
      });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl || fileName,
      message: "Payment screenshot uploaded. Awaiting organizer verification.",
    });
  } catch (err: unknown) {
    console.error("Payment upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}