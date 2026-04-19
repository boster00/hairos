/**
 * Salon integrations (Google Calendar OAuth, etc.) — real Supabase only.
 */

const GOOGLE_SERVICE = "google";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} salonId
 */
export async function getGoogleIntegration(supabase, salonId) {
  const { data, error } = await supabase
    .from("integrations")
    .select("id, access_token, refresh_token, email, scopes, updated_at")
    .eq("salon_id", salonId)
    .eq("service", GOOGLE_SERVICE)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data, error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   salonId: string;
 *   accessToken?: string | null;
 *   refreshToken: string;
 *   email?: string | null;
 *   scopes?: string | null;
 * }} row
 */
export async function upsertGoogleIntegration(supabase, { salonId, accessToken, refreshToken, email, scopes }) {
  const payload = {
    salon_id: salonId,
    service: GOOGLE_SERVICE,
    access_token: accessToken ?? null,
    refresh_token: refreshToken,
    email: email ?? null,
    scopes: scopes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("integrations")
    .upsert(payload, { onConflict: "salon_id,service" })
    .select()
    .single();
  return { data, error };
}

/**
 * Refresh token for Calendar API: integrations row first, else legacy salons column.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} salonId
 */
export async function getGoogleCalendarRefreshTokenForSalon(supabase, salonId) {
  const { data: row } = await supabase
    .from("integrations")
    .select("refresh_token")
    .eq("salon_id", salonId)
    .eq("service", GOOGLE_SERVICE)
    .maybeSingle();
  if (row?.refresh_token) return row.refresh_token;
  const { data: salon } = await supabase.from("salons").select("google_oauth_refresh_token").eq("id", salonId).maybeSingle();
  return salon?.google_oauth_refresh_token || null;
}
