# Smart Hunristan — Setup Guide

## Prerequisites
- Node.js 18+
- A free Supabase account (supabase.com)

---

## Step 1: Supabase Project

1. Go to https://supabase.com → New Project
2. Choose a name, region, and strong DB password
3. Wait for project to initialize (~2 min)

---

## Step 2: Run the Database Schema

1. In Supabase dashboard → **SQL Editor** → **New Query**
2. Copy everything from `supabase/schema.sql`
3. Paste and click **Run** (takes ~10 seconds)
4. You should see "Success. No rows returned."

---

## Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role secret key |
| `GEMINI_API_KEY` | https://makersuite.google.com/app/apikey |
| `SETUP_SECRET` | Any random string you choose |

**Minimum required** (others are optional):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SETUP_SECRET=my-secret-123
```

---

## Step 4: Install & Run

```bash
npm install
npm run dev
```

Visit: http://localhost:3000

---

## Step 5: Create Admin Account

**Default credentials:**
- Email: `qisrar951@gmail.com`
- Password: `admiN@123`

**Method A — Automatic (Recommended):**

```bash
curl -X POST http://localhost:3000/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SETUP_SECRET_FROM_ENV"}'
```

Expected response:
```json
{"success":true,"email":"qisrar951@gmail.com","message":"Admin account created"}
```

**Method B — Manual:**

1. Sign up at http://localhost:3000/auth/signup as a Participant using `qisrar951@gmail.com`
2. Go to Supabase → SQL Editor → run:
```sql
UPDATE profiles
SET role = 'admin', organizer_status = 'approved'
WHERE email = 'qisrar951@gmail.com';
```

---

## Step 6: Supabase Storage (for payment screenshots & avatars)

In Supabase Dashboard → **Storage** → **New bucket**:

| Bucket name | Public? |
|---|---|
| `payment-screenshots` | ❌ Private |
| `avatars` | ✅ Public |

Then in SQL Editor, add storage policies:

```sql
-- Allow authenticated users to upload to payment-screenshots
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES
  ('payment-screenshots-upload', 'payment-screenshots', 'INSERT', 
   '(auth.role() = ''authenticated'')'),
  ('payment-screenshots-select', 'payment-screenshots', 'SELECT',
   '(auth.role() = ''authenticated'')');

-- Allow authenticated users to upload avatars  
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES
  ('avatars-upload', 'avatars', 'INSERT', '(auth.role() = ''authenticated'')'),
  ('avatars-public', 'avatars', 'SELECT', 'true');
```

*Note: Payment uploads will show a helpful error if bucket is missing — platform works without it.*

---

## Step 7: Enable Supabase Realtime (Optional but Recommended)

In Supabase Dashboard → **Database** → **Replication**:

Enable replication for these tables:
- `leaderboard`
- `notifications`
- `discussion_messages`

This enables instant leaderboard updates and live notifications.

---

## Step 8: Configure Email (Optional)

For organizer approval emails, add Gmail SMTP to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-16-char-app-password  # Gmail → Security → App Passwords
EMAIL_FROM=Smart Hunristan <noreply@yourdomain.com>
```

The platform works without email — in-app notifications are always used.

---

## Step 9: Configure Supabase Auth

In Supabase Dashboard → **Authentication** → **Settings**:

1. **Site URL**: `http://localhost:3000` (change for production)
2. **Redirect URLs**: Add `http://localhost:3000/auth/reset-password`
3. **Email Confirmation**: Recommended to disable for development

---

## Role Summary

| Role | How to get it | Access |
|---|---|---|
| **Participant** | Sign up → Instant | Compete, practice, profile |
| **Organizer** | Sign up → Admin approval required | Create hackathons, manage events |
| **Admin** | Created via `/api/setup-admin` | Full platform control |

---

## How Organizer Approval Works

1. Organizer signs up at `/auth/signup` → selects "Organizer" → fills form
2. Account is created with `organizer_status = 'pending'`
3. Admin sees a red badge on the **Organizers** tab in admin dashboard
4. Admin reviews application (name, org, website, reason for organizing)
5. Admin clicks **Approve** or **Reject** (with optional reason)
6. Organizer receives in-app notification + optional email
7. If approved: organizer can sign in and access dashboard
8. If rejected: organizer sees rejection reason at sign-in

---

## AI Grading Setup

**Free option (Gemini):**
```env
GEMINI_API_KEY=your-key-from-makersuite
```

**Your own model:**
```env
CUSTOM_AI_GRADER_URL=https://your-model.com/api/grade
CUSTOM_AI_GRADER_KEY=your-secret
```

Your model receives:
```json
{
  "code": "...",
  "language": "python",
  "problemTitle": "Two Sum",
  "verdict": "accepted",
  "testCasesPassed": 5,
  "testCasesTotal": 5,
  "executionTimeMs": 142
}
```

Your model should return:
```json
{
  "aiScore": 85,
  "feedback": "Excellent solution...",
  "codeQuality": 8,
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "suggestions": ["Add type hints", "..."],
  "plagiarismFlag": false
}
```

---

## Production Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Set all environment variables in Vercel dashboard.

Update in Supabase Auth settings:
- Site URL: `https://your-app.vercel.app`
- Redirect URL: `https://your-app.vercel.app/auth/reset-password`

---

## Security Notes

- Change admin password after first login
- Use a strong `SETUP_SECRET` — delete it from env after setup
- `SUPABASE_SERVICE_ROLE_KEY` is never exposed to browser
- All grading happens server-side (test case answers never sent to client)
- Copy/paste, DevTools, and tab-switching are detected during active competitions

---

## Troubleshooting

**"relation does not exist" errors:**
→ Run `supabase/schema.sql` in SQL Editor

**Admin login fails:**
→ Run `/api/setup-admin` endpoint first

**"Bucket not found" on payment upload:**
→ Create storage buckets in Supabase Dashboard → Storage

**Build errors:**
→ Run `npm run type-check` to see TypeScript errors
→ Ensure all env variables are set in `.env.local`

**Realtime not working:**
→ Enable replication for tables in Supabase Dashboard → Database → Replication
→ Falls back to 30-second polling automatically
