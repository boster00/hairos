import { NextResponse } from "next/server";
import { getLastGoogleCalendarHtmlLink } from "@/libs/hairos/demoStore";

/** Dev/demo only: last created Google Calendar event link (for prospect screenshots). */
export async function GET() {
  const url = process.env.HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL || (process.env.HAIR_OS_UI_DEMO === "1" ? getLastGoogleCalendarHtmlLink() : null);
  if (!url) return NextResponse.json({ url: null });
  return NextResponse.json({ url });
}
