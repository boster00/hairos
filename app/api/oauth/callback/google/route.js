import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { readSalon } from "@/libs/salon";
import { isDemoHairContext, mergeDemoSalon } from "@/libs/hairos/demoStore";

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "development" ? `http://localhost:${process.env.PORT || 3004}` : "")
  );
}

export async function GET(req) {
  const origin = siteOrigin();
  if (!origin) return NextResponse.json({ error: "SITE_URL required" }, { status: 500 });
  const redirectUri = `${origin.replace(/\/$/, "")}/api/oauth/callback/google`;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error");
  if (err) return NextResponse.redirect(`${origin}/settings?google=error&message=${encodeURIComponent(err)}`);
  if (!code) return NextResponse.redirect(`${origin}/settings?google=error&message=no_code`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings?google=error&message=missing_client`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.refresh_token) {
    return NextResponse.redirect(
      `${origin}/settings?google=error&message=${encodeURIComponent(tokenJson.error || "token_exchange_failed")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  const fakeUser = process.env.CJGEO_DEV_FAKE_AUTH === "1" && isDemoHairContext();
  const user = sessionUser || (fakeUser ? { id: "00000000-0000-0000-0000-000000000001" } : null);
  if (!user) return NextResponse.redirect(`${origin}/signin?next=/settings`);

  if (isDemoHairContext()) {
    mergeDemoSalon({ google_oauth_refresh_token: tokenJson.refresh_token });
    return NextResponse.redirect(`${origin}/settings?google=connected`);
  }

  const { data: salon } = await readSalon(supabase, { ownerId: user.id });
  if (!salon) return NextResponse.redirect(`${origin}/onboarding?google=no_salon`);

  await supabase
    .from("salons")
    .update({
      google_oauth_refresh_token: tokenJson.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", salon.id);

  return NextResponse.redirect(`${origin}/settings?google=connected`);
}
