import { createAdminClient } from "@/lib/supabase/admin";

const LOCAL_USER_ID = process.env.LOCAL_USER_ID ?? "local";

/**
 * Returns the single local user ID.
 * Auto-creates the user row on first call (idempotent).
 */
export async function getLocalUserId(): Promise<string> {
  const supabase = createAdminClient();
  await supabase.from("users").upsert(
    { id: LOCAL_USER_ID },
    { onConflict: "id" }
  );
  return LOCAL_USER_ID;
}

/**
 * Validates the API key from the Authorization header.
 * Used by the ingest endpoint for extension auth.
 */
export function validateApiKey(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7);
  const expected = process.env.API_KEY;
  if (!expected) return true; // No API_KEY set = allow all (local dev)
  return key === expected;
}
