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

    // Use service role for privileged operations
    const supabaseServiceRole = await createClient({ admin: true });

    // Check if user exists, or create profile if trigger hasn't fired yet
    let userCheck = null;
    const { data: userCheckData } = await supabaseServiceRole
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userCheckData) {
      userCheck = userCheckData;
    } else {
      // Profile doesn't exist yet, create it (trigger might not have fired)
      console.log("Profile not found for userId, creating:", userId);
      
      const { error: insertError } = await supabaseServiceRole
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          role: "participant", // Default to participant
          organizer_status: "approved",
        });

      if (insertError && insertError.code !== "23505") { // Ignore duplicate key errors
        console.error("Failed to create profile:", insertError);
        return Response.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }
    }

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this user
    await supabaseServiceRole
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId);

    // Store the token in database
    const { error: dbError } = await supabaseServiceRole
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
      await supabaseServiceRole
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
