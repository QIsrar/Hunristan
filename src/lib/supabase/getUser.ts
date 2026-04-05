import { createClient } from "@/lib/supabase/client";

/**
 * Safe getUser with retry — handles AbortError: Lock broken by another request
 * Use this everywhere instead of supabase.auth.getUser() directly
 */
export async function safeGetUser() {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    // AbortError on fast navigation — wait and retry once
    await new Promise(r => setTimeout(r, 300));
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }
}