/**
 * Google Calendar — create event using refresh token (server-side).
 * Uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from env.
 */

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) {
    return { error: "missing_google_oauth_config_or_token" };
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { error: j.error || j.error_description || "token_refresh_failed" };
  return { access_token: j.access_token };
}

/**
 * @param {object} opts
 * @param {string} opts.refreshToken
 * @param {string} [opts.calendarId] default primary
 * @param {string} opts.summary
 * @param {string} opts.description
 * @param {string} opts.startIso RFC3339
 * @param {string} opts.endIso RFC3339
 */
export async function createCalendarEvent(opts) {
  const { access_token, error } = await refreshAccessToken(opts.refreshToken);
  if (error) return { error };

  const calendarId = encodeURIComponent(opts.calendarId || "primary");
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: opts.summary,
      description: opts.description || "",
      start: { dateTime: opts.startIso, timeZone: opts.timeZone || "America/Los_Angeles" },
      end: { dateTime: opts.endIso, timeZone: opts.timeZone || "America/Los_Angeles" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error?.message || "calendar_insert_failed", details: data };
  return { data };
}
