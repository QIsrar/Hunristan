# Deploying Smart Hunristan to Vercel

This guide explains how to deploy Smart Hunristan to Vercel.

## Prerequisites

1. **GitHub Account** - Project must be on GitHub
2. **Vercel Account** - Sign up at https://vercel.com
3. **Supabase Project** - Already set up (cloud-based, works with Vercel)
4. **Email Provider** - Gmail SMTP or other SMTP service

---

## Step 1: Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add -A
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

## Step 2: Connect to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your GitHub repo `QIsrar/Hunristan`
4. Click **Import**

---

## Step 3: Set Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

### Required

| Variable | Value | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Supabase → Settings → API → service_role secret |
| `SETUP_SECRET` | Any random string | `change-this-to-random-string` |

### Optional (Email - Gmail recommended)

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your 16-char App Password* |
| `EMAIL_FROM` | `Smart Hunristan <noreply@smarthunristan.com>` |

**Gmail App Password Setup:**
1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** and **Windows Computer**
3. Google generates a 16-character password
4. Use this as `SMTP_PASS`

### Optional (AI Code Grading)

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Get from https://makersuite.google.com/app/apikey |
| `CUSTOM_AI_GRADER_URL` | (only if using custom AI model) |

### App URLs

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-vercel-domain.vercel.app` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Your admin email |

---

## Step 4: Deploy

1. After setting environment variables, click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, you'll get a unique URL like `https://hunristan.vercel.app`

---

## Step 5: Post-Deployment Setup

### Create Admin Account

After deployment, run this to create the admin account (replace with your domain):

**PowerShell:**
```powershell
$body = @{secret="YOUR_SETUP_SECRET"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://your-vercel-domain.vercel.app/api/setup-admin" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
```

**Bash/Terminal:**
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SETUP_SECRET"}'
```

Expected response:
```json
{"success":true,"message":"Admin account created successfully","email":"qisrar951@gmail.com"}
```

### Update Supabase Settings

In your Supabase project → **Authentication** → **URL Configuration**:

Add your Vercel URL as an authorized redirect URL:
- `https://your-vercel-domain.vercel.app`
- `https://your-vercel-domain.vercel.app/auth/callback`

---

## Step 6: Create Database Tables

Run this SQL in Supabase → **SQL Editor** to ensure all tables exist:

```sql
-- Password Reset Tokens (if not already created)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "password_reset_tokens_all" ON password_reset_tokens FOR ALL USING (true) WITH CHECK (true);
```

Or simply re-run all tables from `supabase/schema.sql`.

---

## Step 7: Verify Deployment

1. Visit your Vercel URL
2. Try signing up with a test account
3. Login with admin credentials
4. Test forgot password functionality

---

## Troubleshooting

### Build Fails

Check Vercel Deployment Logs:
1. Vercel Dashboard → **Deployments**
2. Click failed deployment
3. Scroll down to see build errors

### Environment Variables Not Set

Redeploy after adding variables:
1. Go to **Deployments**
2. Click the latest failed build
3. Click **Redeploy** at the top

### Database Connection Error

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Check Supabase project is not paused

### Email Not Sending

- Verify SMTP credentials in Vercel environment
- Check email is going to spam folder
- Test with Gmail first (most reliable)

---

## Custom Domain (Optional)

1. Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration steps
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Redeploy

---

## Continuous Deployment

Every time you push to `main` branch:
- Vercel automatically deploys
- Build status visible in Vercel Dashboard
- Production URL updates automatically

---

## Support

For issues:
- Check Vercel Deployment Logs
- Verify all environment variables
- Review Supabase project settings
- Check email provider configuration

Good luck! 🚀
