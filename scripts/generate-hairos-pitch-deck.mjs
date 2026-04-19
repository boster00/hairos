/**
 * HairOS personal pitch deck — 10 slides, pptxgenjs.
 * Output: /tmp/hairos-pitch-deck.pptx (or PITCH_OUT env)
 */
import fs from "fs";
import path from "path";
import pptxgen from "pptxgenjs";

const COLORS = {
  charcoal: "1C1C1C",
  gold: "C9A84C",
  cream: "FAF7F2",
  white: "FFFFFF",
};

const OUT = process.env.PITCH_OUT || path.join("/tmp", "hairos-pitch-deck.pptx");

// Curated Unsplash URLs (hotlink in deck — opens when presenter is online; acceptable for pitch)
const IMG = {
  salonWarm:
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80&auto=format&fit=crop",
  stylistPhone:
    "https://images.unsplash.com/photo-1522337660859-02fbef661470?w=1920&q=80&auto=format&fit=crop",
  phoneNotif:
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80&auto=format&fit=crop",
  instagramPhone:
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80&auto=format&fit=crop",
  devices:
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=80&auto=format&fit=crop",
  transformation:
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1920&q=80&auto=format&fit=crop",
};

function slideTitle(pptx, title, subtitle, bgPathOrUrl, opts = {}) {
  const slide = pptx.addSlide({ masterName: opts.master });
  slide.background = { path: bgPathOrUrl };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: COLORS.charcoal, transparency: 55 },
    line: { color: COLORS.charcoal, transparency: 100 },
  });
  slide.addText(title, {
    x: 0.5,
    y: 2.2,
    w: 9,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: COLORS.white,
    fontFace: "Georgia",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 1,
      fontSize: 18,
      color: COLORS.cream,
      fontFace: "Arial",
    });
  }
  return slide;
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "HairOS";
  pptx.title = "HairOS — Personal pitch";

  pptx.defineSlideMaster({
    title: "MASTER_LIGHT",
    background: { color: COLORS.cream },
    objects: [],
  });

  // Slide 1
  slideTitle(
    pptx,
    "More time behind the chair.",
    "HairOS handles the business so you can focus on the craft.",
    IMG.salonWarm,
  );

  // Slide 2
  const s2 = pptx.addSlide();
  s2.background = { path: IMG.stylistPhone };
  s2.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: COLORS.charcoal, transparency: 50 },
    line: { transparency: 100 },
  });
  s2.addText("You did not get into this to write reminder texts.", {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLORS.white,
    fontFace: "Georgia",
  });
  const stats = [
    { num: "$16,500/yr", sub: "lost to no-shows on average" },
    { num: "3–5 hrs/wk", sub: "on booking, follow-ups, and social" },
    { num: "40%", sub: "of new guests never rebook without follow-up" },
  ];
  stats.forEach((st, i) => {
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 0.5 + i * 3.1,
      y: 1.8,
      w: 2.85,
      h: 2.8,
      fill: { color: COLORS.white, transparency: 15 },
      line: { color: COLORS.gold, pt: 1 },
    });
    s2.addText(st.num, {
      x: 0.55 + i * 3.1,
      y: 2.1,
      w: 2.75,
      h: 0.9,
      fontSize: 22,
      bold: true,
      color: COLORS.gold,
      align: "center",
    });
    s2.addText(st.sub, {
      x: 0.55 + i * 3.1,
      y: 3.1,
      w: 2.75,
      h: 1.4,
      fontSize: 13,
      color: COLORS.cream,
      align: "center",
      fontFace: "Arial",
    });
  });

  // Slide 3
  const s3 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s3.addText("One app. Everything runs itself.", {
    x: 0.6,
    y: 0.45,
    w: 8.8,
    h: 0.9,
    fontSize: 32,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  const features = [
    { icon: "📅", label: "Smart Booking" },
    { icon: "📞", label: "AI Receptionist" },
    { icon: "💬", label: "Auto Reminders" },
    { icon: "📱", label: "Social on Autopilot" },
    { icon: "📧", label: "Email Campaigns" },
  ];
  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    s3.addText(`${f.icon}  ${f.label}`, {
      x: 0.8 + col * 3.1,
      y: 1.8 + row * 1.4,
      w: 2.9,
      h: 1.1,
      fontSize: 18,
      color: COLORS.charcoal,
      fontFace: "Arial",
    });
  });
  s3.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 5.1,
    w: "100%",
    h: 0.25,
    fill: { color: COLORS.gold },
    line: { transparency: 100 },
  });

  // Slide 4
  const s4 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s4.addText("Guests book themselves — or just call.", {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontSize: 30,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  s4.addText(
    [
      {
        text: "Mobile booking page\n",
        options: { breakLine: true, fontSize: 14, bold: true, color: COLORS.charcoal },
      },
      {
        text: "Your services, your availability, real-time slots. Guests tap and book.\n\n[Placeholder: phone mockup — clean frame, booking UI]\n\n",
        options: { fontSize: 13, color: "333333" },
      },
    ],
    { x: 0.5, y: 1.3, w: 4.4, h: 3.8, valign: "top" },
  );
  s4.addText(
    [
      { text: "AI phone receptionist\n", options: { breakLine: true, fontSize: 14, bold: true, color: COLORS.charcoal } },
      {
        text: "Answers calls 24/7, collects guest info, sends a booking link by text. Fewer missed calls — less income walking out the door.\n\n",
        options: { fontSize: 13, color: "333333" },
      },
      { text: "“No more DMs asking are you free Friday?”", options: { italic: true, fontSize: 12, color: COLORS.gold } },
    ],
    { x: 5.1, y: 1.3, w: 4.4, h: 3.8, valign: "top" },
  );
  s4.addImage({ path: IMG.phoneNotif, x: 0.5, y: 4.2, w: 2.2, h: 1.4, rounding: true });

  // Slide 5
  const s5 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s5.addText("Confirmations and reminders — automatic.", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.75,
    fontSize: 30,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  s5.addText(
    "Booking confirmed  →  24h before: text + email  →  2h before: final nudge  →  No-show? Auto follow-up to rebook",
    {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 0.7,
      fontSize: 15,
      color: COLORS.charcoal,
      fontFace: "Arial",
    },
  );
  s5.addText("Salons using automated reminders see 70% fewer no-shows.", {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: COLORS.gold,
  });
  s5.addImage({ path: IMG.phoneNotif, x: 6.2, y: 2, w: 3.2, h: 2.1, rounding: true });

  // Slide 6
  const s6 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s6.addText("When guests go quiet, HairOS reaches out.", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.75,
    fontSize: 28,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  const cards = [
    { t: "Day 30", b: "We miss you! Ready for a refresh? + Book Now" },
    { t: "Day 60", b: "It has been a while. $10 off your next visit. + COMEBACK10" },
    { t: "After visit", b: "How did we do? ★★★★★ + Google review link" },
  ];
  cards.forEach((c, i) => {
    s6.addShape(pptx.ShapeType.roundRect, {
      x: 0.5 + i * 3.05,
      y: 1.25,
      w: 2.85,
      h: 2.6,
      fill: { color: COLORS.white },
      line: { color: COLORS.gold, pt: 1 },
    });
    s6.addText(c.t, {
      x: 0.55 + i * 3.05,
      y: 1.4,
      w: 2.75,
      h: 0.45,
      fontSize: 16,
      bold: true,
      color: COLORS.charcoal,
    });
    s6.addText(c.b, {
      x: 0.55 + i * 3.05,
      y: 1.95,
      w: 2.75,
      h: 1.8,
      fontSize: 12,
      color: "444444",
    });
  });
  s6.addImage({ path: IMG.phoneNotif, x: 3.2, y: 4.1, w: 3.4, h: 1.5, rounding: true });

  // Slide 7
  const s7 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s7.addText("Post like a pro. In seconds. Without thinking about it.", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.85,
    fontSize: 26,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  s7.addText(
    "Describe the look → AI writes the caption → pick Instagram or TikTok → schedule.\n\n“Get AI post ideas” — one tap, three on-brand lines for color corrections, lived-in balayage, and transformation content.",
    { x: 0.5, y: 1.2, w: 4.5, h: 2.5, fontSize: 12, color: "333333" },
  );
  s7.addText(
    "Post 1: “She came in asking for a change. She left feeling like herself again. ✂️ Balayage + toner + blowout. Book the link in bio. #balayage #hairtransformation #behindthechair”\n\nPost 2: “Slow week? We texted our waitlist and filled a chair in 20 minutes. That is the craft — and systems that protect it. #hairstylist #salonlife”",
    { x: 5.1, y: 1.2, w: 4.4, h: 3.2, fontSize: 11, color: "333333" },
  );
  s7.addImage({ path: IMG.instagramPhone, x: 0.5, y: 3.6, w: 2.4, h: 1.6, rounding: true });

  // Slide 8
  const s8 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s8.addText("Works with the tools you already have.", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.75,
    fontSize: 28,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  const logos = [
    "Google Calendar",
    "Instagram",
    "TikTok",
    "Squarespace",
    "Facebook",
    "SMS / Text",
  ];
  logos.forEach((L, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    s8.addText(L, {
      x: 0.7 + col * 3,
      y: 1.4 + row * 1.1,
      w: 2.8,
      h: 0.85,
      fontSize: 16,
      bold: true,
      color: COLORS.charcoal,
      align: "center",
      shape: pptx.ShapeType.roundRect,
      fill: { color: COLORS.white },
      line: { color: COLORS.gold },
    });
  });
  s8.addText(
    "Squarespace: automate guest messages from your site with AI-assisted drafting — set up in minutes.",
    { x: 0.5, y: 3.6, w: 9, h: 0.6, fontSize: 12, color: "555555", italic: true },
  );
  s8.addImage({ path: IMG.devices, x: 1.5, y: 4.2, w: 7, h: 1.35, rounding: true });

  // Slide 9
  const s9 = pptx.addSlide({ masterName: "MASTER_LIGHT" });
  s9.addText("Designed for mobile. Because that is where you work.", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.75,
    fontSize: 26,
    bold: true,
    color: COLORS.charcoal,
    fontFace: "Georgia",
  });
  const panels = [
    "A) Booking — what your guests see",
    "B) Dashboard — your morning snapshot",
    "C) Social — post in 30 seconds",
    "D) Email — engagement on autopilot",
  ];
  panels.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s9.addText(p, {
      x: 0.55 + col * 4.55,
      y: 1.2 + row * 2.05,
      w: 4.35,
      h: 1.85,
      fontSize: 13,
      color: COLORS.charcoal,
      fill: { color: COLORS.white },
      line: { color: COLORS.gold },
      align: "center",
      valign: "middle",
    });
  });
  s9.addText("All screens at 390px width — no desktop required.", {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.45,
    fontSize: 11,
    color: COLORS.gold,
    italic: true,
  });

  // Slide 10
  slideTitle(
    pptx,
    "10 minutes. You will know if it fits.",
    "No pressure — just a quick look at what your business could feel like when the admin handles itself.\n\nBook a quick walkthrough →\n\nBuilt for stylists who are serious about the craft — and serious about their time.",
    IMG.transformation,
  );

  await pptx.writeFile({ fileName: OUT });
  console.log("Wrote", OUT, fs.statSync(OUT).size, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
