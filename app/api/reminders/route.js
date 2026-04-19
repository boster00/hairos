import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/service";
import { processReminders } from "@/libs/reminders";

// Called by cron every 5 minutes
export async function POST(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const results = await processReminders(supabase);
  return NextResponse.json(results);
}
