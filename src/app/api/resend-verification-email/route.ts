import { createClient } from "@/lib/supabase/server";
import { sendEmailVerification } from "@/lib/email";
import { randomBytes } from "node:crypto";

console.log("[resend-verification-email] Module loaded");

export async function POST(req: Request) {
  console.log("[POST] Handler called");
  try {
    console.log("[POST] Parsing request body...");
    const body = await req.json();
    const { email } = body;

    console.log("=== RESEND VERIFICATION EMAIL ===");
    console.log("Request body:", { email });

    if (!email || typeof email !== "string") {
      console.log("Invalid email:", email);
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

    // Use service role for privileged operations
    const supabase = await createClient({ admin: true });
    console.log("Service role client created");

    // Step 1: Try to get user by email from profiles
    let profile = null;
    let userId = null;
    
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email_verified")
      .eq("email", email.toLowerCase())
      .single();

    if (profileData) {
      console.log("Profile found in database");
      profile = profileData;
      userId = profileData.id;
    }

    // Step 2: If not found in profiles, try auth.users and create profile if needed
    if (!profile) {
      console.log("Profile not found, checking auth.users for email:", email);
      
      // Query auth.users directly via Supabase
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Auth lookup error:", authError);
        return Response.json(
          { error: "Email not found in our system" },
          { status: 404 }
        );
      }

      const authUser = authUsers?.users.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!authUser) {
        return Response.json(
          { error: "Email not found in our system" },
          { status: 404 }
        );
      }

      userId = authUser.id;

      // Try to get or create profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email_verified")
        .eq("id", userId)
        .single();

      if (existingProfile) {
        profile = existingProfile;
      } else {
        // Profile doesn't exist, create it
        const fullName = authUser.user_metadata?.full_name || 
                        authUser.email?.split("@")[0] || 
                        "User";
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: authUser.email || email,
            full_name: fullName,
            role: authUser.user_metadata?.role || "participant",
            organizer_status: authUser.user_metadata?.role === "organizer" ? "pending" : "approved",
          });

        if (insertError) {
          console.error("Failed to create profile:", insertError);
          // Continue anyway - just use basic info
          profile = {
            id: userId,
            full_name: fullName,
            email_verified: false,
          };
        } else {
          profile = {
            id: userId,
            full_name: fullName,
            email_verified: false,
          };
        }
      }
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

    console.log("Generated verification token:", token);

    // Delete existing tokens first
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId);

    // Store the new token
    const { error: dbError, data: inserted } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
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

    console.log("Token stored successfully in database");

    // Send verification email
    try {
      console.log("Attempting to send verification email to:", email);
      console.log("Email function about to be called...");
      const emailResult = await sendEmailVerification({
        to: email,
        name: profile.full_name,
        token,
      });
      console.log("Verification email sent successfully:", emailResult?.messageId || "sent");
    } catch (emailError) {
      console.error("=== EMAIL SENDING ERROR ===");
      console.error("Error object:", emailError);
      console.error("Error message:", emailError instanceof Error ? emailError.message : String(emailError));
      console.error("Error stack:", emailError instanceof Error ? emailError.stack : "No stack");
      console.error("SMTP config check:", {
        SMTP_HOST: process.env.SMTP_HOST ? "✓" : "✗",
        SMTP_USER: process.env.SMTP_USER ? "✓" : "✗",
        SMTP_PASS: process.env.SMTP_PASS ? "✓" : "✗",
        SMTP_PORT: process.env.SMTP_PORT ? "✓" : "✗",
      });
      
      // Delete the token if email send fails
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("token", token);

      return Response.json(
        { 
          error: emailError instanceof Error ? emailError.message : "Failed to send verification email",
          type: emailError instanceof Error ? emailError.constructor.name : typeof emailError,
        },
        { status: 500 }
      );
    }

    return Response.json({ 
      success: true,
      message: "Verification email sent successfully"
    });
  } catch (error) {
    console.error("=== UNHANDLED ERROR in resend-verification-email ===");
    console.error("Error:", error);
    console.error("Type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Message:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "No stack");
    
    // Make sure we always return valid JSON
    const errorMsg = error instanceof Error ? error.message : String(error);
    return Response.json(
      { 
        error: errorMsg,
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    );
  }
}
