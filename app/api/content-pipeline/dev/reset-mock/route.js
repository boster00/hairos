import { NextResponse } from "next/server";
import { __resetDevMockStore } from "@/libs/content-pipeline/devMockStore";

/**
 * Clears in-memory pipeline mock (CJGEO_DEV_FAKE_AUTH only). Secured with CRON_SECRET.
 */
export async function POST(request) {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CRON_SECRET || process.env.VT_CRON_SECRET;
  if (!expected || cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  __resetDevMockStore();
  return NextResponse.json({ success: true, reset: true });
}
