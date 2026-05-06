import { createClient } from "@/lib/supabase/client";

let inFlightUserRequest: Promise<any> | null = null;

/**
 * Safe getUser with exponential backoff retry
 * Handles AbortError: Lock broken by another request with 'steal' option
 * Use this everywhere instead of supabase.auth.getUser() directly
 */
export async function safeGetUser(maxRetries = 5) {
  if (inFlightUserRequest) return inFlightUserRequest;

  const supabase = createClient();
  let lastError: any = null;

  inFlightUserRequest = (async () => {
    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const { data } = await supabase.auth.getUser();
          return data.user;
        } catch (error: any) {
          lastError = error;

          // If it's a lock error, retry with exponential backoff
          if (error?.message?.includes("Lock broken") || error?.name === "AbortError") {
            const backoffMs = Math.min(100 * Math.pow(2, attempt), 2000);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }

          // For other errors, fail immediately
          return null;
        }
      }

      console.error("Failed to get user after retries:", lastError?.message);
      return null;
    } finally {
      inFlightUserRequest = null;
    }
  })();

  return inFlightUserRequest;
}