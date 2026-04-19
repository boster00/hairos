import { NextResponse } from "next/server";
import { LUXE_PROSPECT_EMAILS } from "@/libs/hairos/luxeProspectEmails";

const IDS = new Set(["confirm", "reminder24h", "winback30", "winback60", "feedback"]);

export async function GET(_req, { params }) {
  if (process.env.HAIR_OS_UI_DEMO !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }
  const { id } = await params;
  if (!id || !IDS.has(id)) {
    return new NextResponse("Invalid id", { status: 400 });
  }
  const mail = LUXE_PROSPECT_EMAILS.find((m) => m.id === id);
  if (!mail) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(mail.html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
