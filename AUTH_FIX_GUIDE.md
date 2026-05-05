# Auth System Fix - Setup Instructions

## Problem
Users are getting **500 errors** when trying to sign up via Supabase auth endpoint with error: `"Database error saving new user"`. Sign-in shows "Welcome back" but dashboard doesn't render.

## Root Cause
The database trigger (`handle_new_user`) that creates user profiles when new users sign up may not be firing correctly or is failing silently. This causes:
1. Signup to fail with 500 error from Supabase
2. Signin to show welcome message but then redirect (email not verified, no profile)

## Solution

### Step 1: Apply SQL Migration (REQUIRED)
1. Go to your Supabase dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor** → **+ New Query**
3. Copy and paste the content of `supabase/fix-auth-trigger.sql`
4. Click **Run** button
5. Wait for execution to complete (should see "Success")

### Step 2: Verify the Fix
1. In your terminal, run the RLS diagnostic:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/diagnose-rls?secret=admiN@123" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

2. Check the output:
   - If `"insert_works": true` → ✅ Success! Proceed to Step 3
   - If `"insert_works": false` → ❌ RLS still blocking, need manual fix

### Step 3: Test the Flow
1. Navigate to: http://localhost:3000/auth/signup
2. Sign up as a **participant** with test credentials
3. You should see "Check Your Email!" confirmation page (not an error)
4. Check your inbox for verification link
5. Click the link to verify email
6. Navigate to: http://localhost:3000/auth/signin
7. Sign in with the same credentials
8. You should be redirected to the **participant dashboard**

## Troubleshooting

**Still getting 500 error on signup?**
1. Check browser console (F12 → Console tab) for detailed error
2. Check server logs (`npm run dev` terminal)
3. Run: `Invoke-WebRequest -Uri "http://localhost:3000/api/diagnose-rls?secret=admiN@123" | Select-Object -ExpandProperty Content`
4. If RLS policies are still blocking, contact Supabase support or manually run:
```sql
-- In Supabase SQL Editor
CREATE POLICY "profiles_insert_trigger" ON profiles FOR INSERT 
  WITH CHECK (true) 
  USING (true);
```

**Signin shows "Welcome back" but no dashboard?**
1. Check if email verification is set correctly
2. Run this in Supabase SQL Editor:
```sql
SELECT id, email, email_verified, role FROM profiles 
WHERE email = 'your-test-email@example.com';
```
3. If `email_verified` is false, click "resend" on the signin page or verify via email link

## Files Changed
- `src/lib/supabase/client.ts` - Fixed browser client initialization  
- `src/app/auth/signup/SignUpForm.tsx` - Added better error logging
- `src/app/api/ensure-profile/route.ts` - Improved profile creation fallback
- `supabase/fix-auth-trigger.sql` - Database trigger fix (needs manual execution)

## For Production (Vercel)
After fixing locally and testing successfully:
1. Commit changes: `git add -A && git commit -m "Auth system fixes"`
2. Push to main: `git push origin main`
3. Vercel will auto-deploy
4. Run the SQL migration on your production Supabase database
5. Test production signup/signin at your Vercel URL
