import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return Response.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient({ admin: true });

    // Find and validate the reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id")
      .eq("token", token)
      .single();

    if (tokenError || !resetToken) {
      return Response.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const { data: tokenData } = await supabase
      .from("password_reset_tokens")
      .select("expires_at")
      .eq("token", token)
      .single();

    if (tokenData && new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabase
        .from("password_reset_tokens")
        .delete()
        .eq("token", token);

      return Response.json(
        { error: "Reset token has expired" },
        { status: 400 }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return Response.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    // Delete the used token
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("token", token);

    return Response.json({ 
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Verify password reset error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
