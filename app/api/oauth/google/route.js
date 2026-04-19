import { NextResponse } from "next/server";

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "development" ? `http://localhost:${process.env.PORT || 3004}` : "")
  );
}

export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }
  const origin = siteOrigin();
  if (!origin) return NextResponse.json({ error: "SITE_URL required for OAuth" }, { status: 500 });

  const redirectUri = `${origin.replace(/\/$/, "")}/api/oauth/callback/google`;
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") || "hairos";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email", "openid"].join(" "),
  );
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
