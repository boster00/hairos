/**
 * HairOS transactional email HTML templates (placeholders: {{...}}).
 */

export const HAIROS_EMAIL_TEMPLATES = {
  booking_confirmation: {
    id: "booking_confirmation",
    name: "Booking confirmation",
    description: "Sent when a client books through the public booking page.",
    subject: "You're booked at {{salon_name}}",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;background:#f8fafc;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <tr><td>
        <h1 style="margin:0 0 8px;font-size:22px;">You're booked</h1>
        <p style="margin:0 0 16px;color:#475569;">Hi {{client_name}},</p>
        <p style="margin:0 0 16px;">Your appointment at <strong>{{salon_name}}</strong> is confirmed.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>When:</strong> {{appointment_when}}</p>
          <p style="margin:0 0 8px;"><strong>Service:</strong> {{service_name}}</p>
          <p style="margin:0;"><strong>Stylist:</strong> {{staff_name}}</p>
        </div>
        <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Need to reschedule? Reply to this email or call {{salon_phone}}.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  },
  reminder_24h: {
    id: "reminder_24h",
    name: "24-hour reminder",
    description: "Reminder the day before the appointment.",
    subject: "Tomorrow: {{service_name}} at {{salon_name}}",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;padding:24px;">
  <h2 style="margin:0 0 12px;">See you tomorrow</h2>
  <p style="margin:0 0 12px;">Hi {{client_name}},</p>
  <p style="margin:0 0 12px;">This is a friendly reminder about your <strong>{{service_name}}</strong> at <strong>{{salon_name}}</strong> on <strong>{{appointment_when}}</strong>.</p>
  <p style="margin:0;color:#64748b;font-size:14px;">{{salon_address}}</p>
</body></html>`,
  },
  newsletter_wrapper: {
    id: "newsletter_wrapper",
    name: "Newsletter shell",
    description: "Wraps campaign HTML with salon header/footer.",
    subject: "{{campaign_subject}}",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#111827;color:#fff;padding:20px 24px;">
        <div style="font-size:18px;font-weight:700;">{{salon_name}}</div>
        <div style="font-size:13px;opacity:.85;">{{salon_tagline}}</div>
      </td></tr>
      <tr><td style="padding:24px;">{{campaign_body_html}}</td></tr>
      <tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
        {{salon_address}} · <a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  },
};

export function listEmailTemplateSummaries() {
  return Object.values(HAIROS_EMAIL_TEMPLATES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    subject: t.subject,
  }));
}

export function getEmailTemplate(id) {
  return HAIROS_EMAIL_TEMPLATES[id] ? { ...HAIROS_EMAIL_TEMPLATES[id] } : null;
}
