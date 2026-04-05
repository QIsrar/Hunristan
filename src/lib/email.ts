/**
 * Email helper using Nodemailer + Gmail SMTP
 * Only used for optional notifications (organizer approval etc.)
 * Falls back gracefully if not configured.
 */

interface OrganizerDecisionEmailOptions {
  to: string;
  name: string;
  organization: string;
  action: "approve" | "reject";
  reason?: string;
}

export async function sendOrganizerDecisionEmail(opts: OrganizerDecisionEmailOptions) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, NEXT_PUBLIC_APP_URL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log("SMTP not configured — skipping email");
    return;
  }

  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const appUrl = NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const from = EMAIL_FROM || `Smart Hunristan <${SMTP_USER}>`;

  const subject = opts.action === "approve"
    ? "✅ Your Organizer Account Has Been Approved — Smart Hunristan"
    : "❌ Organizer Application Update — Smart Hunristan";

  const html = opts.action === "approve"
    ? `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #060910; color: #f1f5f9; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #00e5ff22, #7c3aed22); padding: 40px 32px; text-align: center; border-bottom: 1px solid #1f2937;">
        <div style="font-size: 42px; margin-bottom: 8px;">⚡</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #00e5ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Smart Hunristan</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #10b981; margin-top: 0;">🎉 You're Approved!</h2>
        <p style="color: #9ca3af; line-height: 1.6;">Hi <strong style="color: #f1f5f9;">${opts.name}</strong>,</p>
        <p style="color: #9ca3af; line-height: 1.6;">Your organizer account for <strong style="color: #f1f5f9;">${opts.organization}</strong> has been reviewed and approved by our admin team.</p>
        <p style="color: #9ca3af; line-height: 1.6;">You can now sign in and start creating hackathons!</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/auth/signin" style="background: linear-gradient(135deg, #00e5ff, #0099b3); color: #060910; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">
            Go to Dashboard →
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you have questions, reply to this email or contact support@smarthunristan.com</p>
      </div>
    </div>
    `
    : `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #060910; color: #f1f5f9; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ef444422, #f59e0b22); padding: 40px 32px; text-align: center; border-bottom: 1px solid #1f2937;">
        <div style="font-size: 42px; margin-bottom: 8px;">⚡</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Smart Hunristan</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #f59e0b; margin-top: 0;">Application Update</h2>
        <p style="color: #9ca3af; line-height: 1.6;">Hi <strong style="color: #f1f5f9;">${opts.name}</strong>,</p>
        <p style="color: #9ca3af; line-height: 1.6;">Thank you for your interest in becoming an organizer on Smart Hunristan. After reviewing your application for <strong style="color: #f1f5f9;">${opts.organization}</strong>, we are unable to approve it at this time.</p>
        ${opts.reason ? `<div style="background: #1f2937; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0;"><p style="color: #d1d5db; margin: 0; font-size: 14px;"><strong>Reason:</strong> ${opts.reason}</p></div>` : ""}
        <p style="color: #9ca3af; line-height: 1.6;">You are welcome to reapply with additional information or reach out to support if you have questions.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Contact support@smarthunristan.com for assistance.</p>
      </div>
    </div>
    `;

  await transporter.sendMail({ from, to: opts.to, subject, html });
}

export async function sendNotificationEmail(opts: {
  to: string;
  name: string;
  subject: string;
  body: string;
}) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM || `Smart Hunristan <${SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: `<div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #060910; color: #f1f5f9; border-radius: 8px;"><p>Hi ${opts.name},</p><p style="line-height: 1.6; color: #9ca3af;">${opts.body}</p><p style="color: #6b7280; font-size: 12px;">— Smart Hunristan Team</p></div>`,
  });
}
