import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getEmailTemplate, listEmailTemplateSummaries } from "@/libs/hairos/emailTemplates";

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const tpl = getEmailTemplate(id);
    if (!tpl) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ data: tpl });
  }
  return NextResponse.json({ data: listEmailTemplateSummaries() });
}
