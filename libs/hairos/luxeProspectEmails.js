/**
 * Branded transactional HTML for Luxe Studio by Maya prospect sequence (Resend).
 * Warm gold (#c9a227) + dark charcoal (#1a1a1a). Inline styles for email clients.
 */

const BRAND = {
  gold: "#c9a227",
  charcoal: "#1a1a1a",
  cream: "#faf8f3",
  muted: "#5c5c5c",
};

function shell({ title, bodyHtml }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4dc;">
<tr><td style="background:${BRAND.charcoal};padding:20px 24px;text-align:center;">
<div style="color:${BRAND.gold};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Luxe Studio</div>
<div style="color:#ffffff;font-size:22px;font-weight:600;margin-top:6px;">by Maya</div>
</td></tr>
<tr><td style="padding:28px 24px 32px;">
<h1 style="margin:0 0 16px;font-size:20px;color:${BRAND.charcoal};font-weight:600;">${title}</h1>
${bodyHtml}
<p style="margin:28px 0 0;font-size:12px;color:${BRAND.muted};line-height:1.5;">Maya Johnson · Luxe Studio by Maya<br/>Los Angeles, CA</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export const LUXE_PROSPECT_EMAILS = [
  {
    id: "confirm",
    subject: "Sarah, your Brazilian Blowout is confirmed — Fri May 2 at 2:00 PM",
    html: shell({
      title: "You're all set, Sarah",
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.charcoal};">Hi Sarah,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.muted};">Thank you for booking with <strong style="color:${BRAND.charcoal};">Luxe Studio by Maya</strong>. Here are your appointment details:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border-radius:8px;margin:16px 0;">
<tr><td style="padding:16px 18px;">
<p style="margin:0;font-size:15px;color:${BRAND.charcoal};"><strong>Service</strong> · Brazilian Blowout</p>
<p style="margin:8px 0 0;font-size:15px;color:${BRAND.charcoal};"><strong>Stylist</strong> · Maya Johnson</p>
<p style="margin:8px 0 0;font-size:15px;color:${BRAND.charcoal};"><strong>Date &amp; time</strong> · Friday, May 2 · 2:00 PM</p>
</td></tr></table>
<p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.muted};">Need to reschedule? Reply to this email or text us — we&apos;ll take care of you.</p>`,
    }),
  },
  {
    id: "reminder24h",
    subject: "Tomorrow: Brazilian Blowout at Luxe Studio (2:00 PM)",
    html: shell({
      title: "See you tomorrow, Sarah",
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.charcoal};">Hi Sarah,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.muted};">Friendly reminder: your <strong style="color:${BRAND.charcoal};">Brazilian Blowout</strong> with Maya is <strong style="color:${BRAND.charcoal};">tomorrow, Friday May 2 at 2:00 PM</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.muted};">Arrive with clean, dry hair for best results. Street parking is usually available on the block behind the studio.</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.muted};">— Maya</p>`,
    }),
  },
  {
    id: "winback30",
    subject: "We miss you, Sarah — your hair misses us too",
    html: shell({
      title: "It&apos;s been a minute",
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.charcoal};">Hi Sarah,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.muted};">We haven&apos;t seen you at <strong style="color:${BRAND.charcoal};">Luxe Studio by Maya</strong> in a little while — and we&apos;d love to have you back in the chair.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.muted};">If your schedule has been hectic, we get it. When you&apos;re ready for gloss, tone, or a fresh shape, book a visit and we&apos;ll make it easy.</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.muted};">Warmly,<br/>Maya</p>`,
    }),
  },
  {
    id: "winback60",
    subject: "Sarah, come back with COMEBACK10",
    html: shell({
      title: "We saved something for you",
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.charcoal};">Hi Sarah,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.muted};">We&apos;d truly love to see you again at Luxe Studio. Use the code below on your next visit.</p>
<div style="text-align:center;margin:24px 0;padding:20px;border:2px dashed ${BRAND.gold};border-radius:10px;background:${BRAND.cream};">
<p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};letter-spacing:0.12em;text-transform:uppercase;">Your comeback code</p>
<p style="margin:0;font-size:28px;font-weight:700;color:${BRAND.charcoal};letter-spacing:0.08em;">COMEBACK10</p>
<p style="margin:10px 0 0;font-size:14px;color:${BRAND.muted};">Present at checkout · one use per guest</p>
</div>
<p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.muted};">Book online or reply to this email — Maya</p>`,
    }),
  },
  {
    id: "feedback",
    subject: "How was your visit, Sarah? (30 seconds)",
    html: shell({
      title: "We&apos;d love your feedback",
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.charcoal};">Hi Sarah,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.muted};">Thank you for trusting <strong style="color:${BRAND.charcoal};">Luxe Studio by Maya</strong> with your hair. How did we do?</p>
<p style="margin:0 0 12px;font-size:14px;color:${BRAND.charcoal};">Tap a star (just for fun in this email — reply with a number 1–5 if you prefer):</p>
<p style="margin:0 0 20px;font-size:26px;letter-spacing:6px;">★ ★ ★ ★ ★</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.muted};">If you have a moment, a Google review helps other guests find us:</p>
<p style="margin:0;"><a href="https://www.google.com/search?q=Luxe+Studio+by+Maya+reviews" style="display:inline-block;padding:14px 24px;background:${BRAND.charcoal};color:${BRAND.gold};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Leave a Google review</a></p>
<p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted};">With gratitude,<br/>Maya Johnson</p>`,
    }),
  },
];
