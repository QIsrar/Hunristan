import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({
      status: "error",
      message: "SMTP is not configured in .env.local",
      env_check: {
        host: !!SMTP_HOST,
        user: !!SMTP_USER,
        pass: !!SMTP_PASS
      }
    }, { status: 400 });
  }

  try {
    console.log("Starting SMTP test...");
    await sendNotificationEmail({
      to: SMTP_USER, // Send to yourself
      name: "Admin",
      subject: "🧪 SMTP Test Connection",
      body: "If you are reading this, your email system is working perfectly!"
    });

    return NextResponse.json({
      status: "success",
      message: "Email sent successfully! Check your inbox."
    });
  } catch (error: any) {
    console.error("SMTP Test Failed:", error);
    return NextResponse.json({
      status: "failed",
      error_code: error.code,
      error_message: error.message,
      command: error.command,
      full_error: error
    }, { status: 500 });
  }
}
