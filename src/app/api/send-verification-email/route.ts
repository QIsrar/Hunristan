import { createClient } from "@/lib/supabase/server";
import { sendEmailVerification } from "@/lib/email";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const { userId, email, fullName } = await req.json();

    // Validate inputs
    if (!userId || !email || !fullName) {
      return Response.json(
        { error: "Missing required fields: userId, email, fullName" },
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

    // Check if user exists
    const { data: userCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!userCheck) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this user
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId);

    // Store the token in database
    const { error: dbError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database error storing token:", dbError);
      return Response.json(
        { error: "Failed to generate verification token" },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      await sendEmailVerification({
        to: email,
        name: fullName,
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

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return Response.json(
      { error: "Unexpected error occurred while sending verification email" },
      { status: 500 }
    );
  }
}
