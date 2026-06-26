import { createClient } from "@/lib/supabase/client";

/**
 * Safe getUser with retry — handles AbortError: Lock broken by another request
 * Use this everywhere instead of supabase.auth.getUser() directly
 */
export async function safeGetUser() {
  const supabase = createClient();
  const delays = [0, 300, 900];

  for (const delay of delays) {
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      continue;
    }
  }

  return null;
}