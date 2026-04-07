import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return Response.json(
        { error: "Valid token is required" },
        { status: 400 }
      );
    }

    if (token.length < 10) {
      return Response.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the verification token with expiration check
    const { data: tokenData, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("user_id, expires_at, created_at")
      .eq("token", token)
      .single();

    if (tokenError) {
      console.error("Token lookup error:", tokenError);
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    if (!tokenData) {
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired token
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("token", token);

      return Response.json(
        { error: "Token has expired. Please request a new verification email." },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, email_verified")
      .eq("id", tokenData.user_id)
      .single();

    if (userError || !user) {
      console.error("User lookup error:", userError);
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update profile to mark email as verified
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", tokenData.user_id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return Response.json(
        { error: "Failed to verify email" },
        { status: 500 }
      );
    }

    // Delete the token after successful use
    const { error: deleteError } = await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("token", token);

    if (deleteError) {
      console.error("Token deletion error (non-fatal):", deleteError);
      // Don't fail the response for token cleanup error
    }

    return Response.json({ 
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return Response.json(
      { error: "An unexpected error occurred while verifying email" },
      { status: 500 }
    );
  }
}
