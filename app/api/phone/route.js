import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/service";
import { handleVapiWebhook } from "@/libs/phone";

// Vapi webhook — no auth header, validated by payload shape
export async function POST(req) {
  const body = await req.json();
  // Vapi sends a "message" wrapper with type "end-of-call-report"
  if (body.message?.type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const supabase = await createClient();
  const result = await handleVapiWebhook(supabase, { call: body.message.call });
  return NextResponse.json(result);
}
