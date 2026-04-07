import { createClient } from "@/lib/supabase/server";
import { sendEmailVerification } from "@/lib/email";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

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

    const supabase = await createClient();

    // Get user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email_verified")
      .eq("email", email)
      .single();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return Response.json(
        { error: "Email not found in our system" },
        { status: 404 }
      );
    }

    if (!profile) {
      return Response.json(
        { error: "Email not found in our system" },
        { status: 404 }
      );
    }

    if (profile.email_verified) {
      return Response.json(
        { error: "This email is already verified. You can sign in directly." },
        { status: 400 }
      );
    }

    // Generate a new token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete existing tokens first, then insert new one
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", profile.id);

    // Store the new token
    const { error: dbError, data: inserted } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select();

    if (dbError || !inserted || inserted.length === 0) {
      console.error("Database error storing token:", dbError);
      return Response.json(
        { error: "Failed to generate verification token. Please try again." },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      await sendEmailVerification({
        to: email,
        name: profile.full_name,
        token,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Delete the token if email send fails
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("token", token);

      return Response.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return Response.json({ 
      success: true,
      message: "Verification email sent successfully"
    });
  } catch (error) {
    console.error("Error in resend-verification-email:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
