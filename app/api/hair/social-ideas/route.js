import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import OpenAI from "openai";

const FALLBACK_IDEAS = [
  "Before/after glass hair ✨ Transformation Tuesday: Brazilian gloss + face-framing layers. Book the same look — link in bio.",
  "Trending now: honey-caramel balayage on brunettes. Save this for your next visit + ask for the “Maya melt” blend technique.",
  "Spring promo: $25 off first-time keratin express when you book this week. Tag a friend who needs frizz control — both get a perk.",
];

export async function POST() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ data: { ideas: FALLBACK_IDEAS, source: "fallback" } });
  }

  const salonName = ctx.salon?.name || "Luxe Studio by Maya";
  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.HAIR_OS_SOCIAL_IDEAS_MODEL || process.env.AI_MODEL_STANDARD;
    if (!model) {
      return NextResponse.json({ data: { ideas: FALLBACK_IDEAS, source: "fallback_no_model" } });
    }
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You write short social captions for professional hair stylists (Instagram/TikTok). Return ONLY valid JSON: {\"ideas\":[\"...\",\"...\",\"...\"]} with exactly 3 strings. Each idea 1-3 sentences, authentic voice: transformations, trending styles, product recs, booking CTAs. No hashtags spam. No lorem ipsum.",
        },
        {
          role: "user",
          content: `Salon: ${salonName}. Generate 3 distinct post ideas for this week.`,
        },
      ],
      temperature: 0.85,
      max_tokens: 500,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    let ideas = FALLBACK_IDEAS;
    try {
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      if (Array.isArray(parsed.ideas) && parsed.ideas.length >= 3) {
        ideas = parsed.ideas.slice(0, 3).map((s) => String(s).trim()).filter(Boolean);
      } else if (Array.isArray(parsed) && parsed.length >= 3) {
        ideas = parsed.slice(0, 3).map((s) => String(s).trim());
      }
    } catch {
      ideas = FALLBACK_IDEAS;
    }
    if (ideas.length < 3) ideas = FALLBACK_IDEAS;
    return NextResponse.json({ data: { ideas, source: "openai" } });
  } catch (e) {
    console.error("[social-ideas]", e);
    return NextResponse.json({ data: { ideas: FALLBACK_IDEAS, source: "fallback_error" } });
  }
}
