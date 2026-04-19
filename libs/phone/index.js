// Vapi webhook handler + booking link SMS dispatch
import { sendSms } from "@/libs/reminders";

export async function handleVapiWebhook(supabase, payload) {
  const { call } = payload;
  if (!call?.id) return { error: "no call id" };

  // Find salon by Vapi phone number ID
  const { data: salon } = await supabase.from("salons")
    .select("id, name, slug, twilio_from_number")
    .eq("vapi_phone_number_id", call.phoneNumberId)
    .maybeSingle();

  if (!salon) return { error: "salon not found for phone number" };

  // Extract caller info from transcript/metadata
  const callerPhone = call.customer?.number;
  const callerName = extractCallerName(call.transcript || "");

  // Log the call
  await supabase.from("phone_calls").upsert({
    salon_id: salon.id,
    vapi_call_id: call.id,
    caller_phone: callerPhone,
    caller_name: callerName,
    transcript: call.transcript,
    booking_link_sent: false,
  }, { onConflict: "vapi_call_id" });

  // Send booking link SMS if we have a caller phone
  if (callerPhone) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/booking/${salon.slug}`;
    const greeting = callerName ? `Hi ${callerName}! ` : "Hi! ";
    await sendSms({
      to: callerPhone,
      from: salon.twilio_from_number,
      body: `${greeting}Book your appointment at ${salon.name}: ${bookingUrl}`,
    });
    await supabase.from("phone_calls")
      .update({ booking_link_sent: true })
      .eq("vapi_call_id", call.id);
  }

  return { success: true };
}

function extractCallerName(transcript) {
  // Simple heuristic: look for "my name is X" or "this is X"
  const match = transcript.match(/(?:my name is|this is|i'm|i am)\s+([A-Z][a-z]+)/i);
  return match?.[1] || null;
}

export async function provisionVapiAssistant(supabase, salonId) {
  const { data: salon } = await supabase.from("salons").select("*").eq("id", salonId).single();
  if (!salon) throw new Error("salon not found");

  const res = await fetch("https://api.vapi.ai/assistant", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${salon.name} Receptionist`,
      model: { provider: "openai", model: "gpt-4o-mini" },
      voice: { provider: "11labs", voiceId: "rachel" },
      firstMessage: `Hi, thank you for calling ${salon.name}! How can I help you today?`,
      systemPrompt: buildAssistantPrompt(salon),
      serverUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/phone`,
    }),
  });

  const assistant = await res.json();
  await supabase.from("salons").update({ vapi_assistant_id: assistant.id }).eq("id", salonId);
  return assistant;
}

function buildAssistantPrompt(salon) {
  return `You are a friendly receptionist for ${salon.name}, a hair salon.
Your job is to answer questions about services, hours, and pricing, and collect the caller's name and phone number so we can send them a booking link.
Always be warm and professional. If asked to book an appointment, let them know you'll text them a direct booking link right away.
Do not make up information you don't have. If you don't know something, say you'll have the team follow up.`;
}
