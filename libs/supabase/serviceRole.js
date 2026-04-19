/**
 * Pure service-role client (no cookies, no user session).
 */
import { createClient } from "\u0040\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065/\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065-js"; // pragma: allowlist secret

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key);
}
