import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getEmailTemplate, listEmailTemplateSummaries } from "@/libs/hairos/emailTemplates";

export async function GET(req) {
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  const fakeAuth = process.env.CJGEO_DEV_FAKE_AUTH === "1";
  const demo = process.env.HAIR_OS_UI_DEMO === "1";
  const user =
    sessionUser ||
    (fakeAuth && demo
      ? {
          id: "00000000-0000-0000-0000-000000000001",
          email: "dev-fake-auth@local.invalid",
        }
      : null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const tpl = getEmailTemplate(id);
    if (!tpl) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ data: tpl });
  }
  return NextResponse.json({ data: listEmailTemplateSummaries() });
}
