import { createClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await createClient({ admin: true });

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      // Don't reveal if email exists (security)
      return Response.json({ 
        success: true,
        message: "If an account exists, we've sent a password reset link"
      });
    }

    // Generate reset token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token
    const { error: dbError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database error storing reset token:", dbError);
      return Response.json(
        { error: "Failed to generate reset link. Please try again." },
        { status: 500 }
      );
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        to: email,
        name: profile.full_name || "User",
        token,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Delete the token if email send fails
      await supabase
        .from("password_reset_tokens")
        .delete()
        .eq("token", token);

      return Response.json(
        { 
          error: emailError instanceof Error ? emailError.message : "Failed to send reset email",
        },
        { status: 500 }
      );
    }

    return Response.json({ 
      success: true,
      message: "Password reset link sent successfully"
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
