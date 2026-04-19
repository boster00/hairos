/**
 * In-memory store for HairOS UI demo (HAIR_OS_UI_DEMO + CJGEO_DEV_FAKE_AUTH).
 * Luxe Studio by Maya — polished prospect-facing demo data.
 */

const DEMO_SALON_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_OWNER_ID = "00000000-0000-0000-0000-000000000001";

const SVC_BRAZILIAN = "a1000000-0000-4000-8000-000000000001";
const SVC_BALAYAGE = "a1000000-0000-4000-8000-000000000002";
const SVC_KERATIN = "a1000000-0000-4000-8000-000000000003";
const SVC_HAIRCUT = "a1000000-0000-4000-8000-000000000004";
const STAFF_MAYA = "b2000000-0000-4000-8000-000000000001";
const STAFF_JORDAN = "b2000000-0000-4000-8000-000000000002";

function weekRangeISO() {
  const d = new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function buildAvailabilityRules() {
  const rules = [];
  const days = [1, 2, 3, 4, 5, 6];
  for (const staffId of [STAFF_MAYA, STAFF_JORDAN]) {
    for (const dow of days) {
      rules.push({ staff_id: staffId, day_of_week: dow, start_time: "09:00:00", end_time: "18:00:00" });
    }
  }
  return rules;
}

let state = {
  salon: {
    id: DEMO_SALON_ID,
    owner_id: DEMO_OWNER_ID,
    name: "Luxe Studio by Maya",
    slug: "luxe-maya",
    phone: "(323) 555-0148",
    address: "8424 Melrose Ave, Los Angeles, CA 90069",
    timezone: "America/Los_Angeles",
    vapi_assistant_id: "asst_luxe_maya_voice_01",
    twilio_from_number: "+13235550148",
    google_calendar_token: null,
    google_oauth_refresh_token: process.env.HAIR_OS_GOOGLE_REFRESH_TOKEN || null,
    google_calendar_id: "primary",
    buffer_token: null,
    squarespace_connected: false,
  },
  clients: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      salon_id: DEMO_SALON_ID,
      name: "Sarah Chen",
      email: "sarah.chen@gmail.com",
      phone: "+13105550177",
      notes: "Fine hair — prefers lower heat on dryer",
      visit_count: 6,
      last_visit_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  social_posts: [
    {
      id: "c0100000-0000-4000-8000-000000000001",
      salon_id: DEMO_SALON_ID,
      content:
        "That glassy finish though ✨ Before → after Brazilian gloss refresh. Swipe for the full transformation — booking link in bio.",
      image_urls: [],
      platforms: ["instagram", "tiktok"],
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      buffer_post_id: null,
      status: "scheduled",
      created_at: new Date().toISOString(),
    },
    {
      id: "c0100000-0000-4000-8000-000000000002",
      salon_id: DEMO_SALON_ID,
      content:
        "POV: you finally booked the balayage maintenance you’ve been putting off. Warm caramel ribbons + healthy ends — tap to snag a Saturday spot.",
      image_urls: [],
      platforms: ["instagram", "tiktok"],
      scheduled_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      buffer_post_id: null,
      status: "scheduled",
      created_at: new Date().toISOString(),
    },
    {
      id: "c0100000-0000-4000-8000-000000000003",
      salon_id: DEMO_SALON_ID,
      content:
        "Stylist-approved: Olaplex No.3 on damp hair for 10 minutes before your appointment = stronger color results. Save this for later.",
      image_urls: [],
      platforms: ["tiktok", "instagram"],
      scheduled_at: null,
      buffer_post_id: null,
      status: "draft",
      created_at: new Date().toISOString(),
    },
    {
      id: "c0100000-0000-4000-8000-000000000004",
      salon_id: DEMO_SALON_ID,
      content:
        "May dates are filling fast for bridal trials + extensions consults. DM “BRIDE” and we’ll send the calendar link within the hour.",
      image_urls: [],
      platforms: ["instagram"],
      scheduled_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      buffer_post_id: null,
      status: "scheduled",
      created_at: new Date().toISOString(),
    },
    {
      id: "c0100000-0000-4000-8000-000000000005",
      salon_id: DEMO_SALON_ID,
      content:
        "Same-day blowout add-on while your toner processes? Yes. $45 add-on when you book online — code SMOOTH45 at checkout (this week only).",
      image_urls: [],
      platforms: ["instagram", "tiktok"],
      scheduled_at: null,
      buffer_post_id: null,
      status: "draft",
      created_at: new Date().toISOString(),
    },
  ],
  newsletter_campaigns: [
    {
      id: "d0100000-0000-4000-8000-000000000001",
      salon_id: DEMO_SALON_ID,
      subject: "Spring gloss refresh — 3 spots left this week",
      content_html:
        "<p>Hi {{first_name}},</p><p>Balayage touch-ups and gloss bars are booking fast. Reply with your ideal day and we’ll hold a chair.</p>",
      recipient_count: 186,
      open_rate_pct: 41,
      click_rate_pct: 12,
      sent_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: "d0100000-0000-4000-8000-000000000002",
      salon_id: DEMO_SALON_ID,
      subject: "Mother’s Day glam — book Mom + you",
      content_html: "<p>Treat the duo you love most.</p><p>Side-by-side appointments + champagne on us.</p>",
      recipient_count: 142,
      open_rate_pct: 38,
      click_rate_pct: 9,
      sent_at: new Date(Date.now() - 24 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: "d0100000-0000-4000-8000-000000000003",
      salon_id: DEMO_SALON_ID,
      subject: "New: Keratin express lane Saturdays",
      content_html: "<p>In & out in under 90 minutes with the same smooth results you trust.</p>",
      recipient_count: 210,
      open_rate_pct: 44,
      click_rate_pct: 15,
      sent_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 41 * 86400000).toISOString(),
    },
    {
      id: "d0100000-0000-4000-8000-000000000004",
      salon_id: DEMO_SALON_ID,
      subject: "April VIP list — early access",
      content_html: "<p>Draft for next send…</p>",
      recipient_count: 0,
      open_rate_pct: null,
      click_rate_pct: null,
      sent_at: null,
      created_at: new Date().toISOString(),
    },
  ],
  staff: [
    {
      id: STAFF_MAYA,
      salon_id: DEMO_SALON_ID,
      name: "Maya Johnson",
      email: "maya@luxestudiobymaya.com",
      phone: null,
      role: "owner",
      avatar_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
      active: true,
      staff_services: [
        { service_id: SVC_BRAZILIAN },
        { service_id: SVC_BALAYAGE },
        { service_id: SVC_KERATIN },
        { service_id: SVC_HAIRCUT },
      ],
    },
    {
      id: STAFF_JORDAN,
      salon_id: DEMO_SALON_ID,
      name: "Jordan Lee",
      email: "jordan@luxestudiobymaya.com",
      phone: null,
      role: "stylist",
      avatar_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop",
      active: true,
      staff_services: [
        { service_id: SVC_BRAZILIAN },
        { service_id: SVC_BALAYAGE },
        { service_id: SVC_KERATIN },
        { service_id: SVC_HAIRCUT },
      ],
    },
  ],
  services: [
    {
      id: SVC_BRAZILIAN,
      salon_id: DEMO_SALON_ID,
      name: "Brazilian Blowout",
      description: "Smoothing treatment for frizz-prone hair — glossy, humidity-resistant finish.",
      duration_minutes: 120,
      price_cents: 8000,
      active: true,
    },
    {
      id: SVC_BALAYAGE,
      salon_id: DEMO_SALON_ID,
      name: "Balayage",
      description: "Hand-painted lightening for natural sun-kissed ribbons.",
      duration_minutes: 150,
      price_cents: 20000,
      active: true,
    },
    {
      id: SVC_KERATIN,
      salon_id: DEMO_SALON_ID,
      name: "Keratin Treatment",
      description: "Restorative smoothing — reduces dry time and daily styling time.",
      duration_minutes: 120,
      price_cents: 5000,
      active: true,
    },
    {
      id: SVC_HAIRCUT,
      salon_id: DEMO_SALON_ID,
      name: "Haircut & Style",
      description: "Precision cut, shampoo, and blow-dry style.",
      duration_minutes: 45,
      price_cents: 5000,
      active: true,
    },
  ],
  availability_rules: buildAvailabilityRules(),
  appointments: [],
  /** Last Google Calendar event link from API (for QA / prospect proof). */
  last_google_calendar_html_link: null,
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isDemoHairContext() {
  return process.env.HAIR_OS_UI_DEMO === "1" && process.env.CJGEO_DEV_FAKE_AUTH === "1";
}

export function getDemoSalon() {
  const s = clone(state.salon);
  if (!s.google_oauth_refresh_token && process.env.HAIR_OS_GOOGLE_REFRESH_TOKEN) {
    s.google_oauth_refresh_token = process.env.HAIR_OS_GOOGLE_REFRESH_TOKEN;
  }
  return s;
}

export function mergeDemoSalon(fields) {
  state.salon = {
    ...state.salon,
    ...fields,
    id: DEMO_SALON_ID,
    owner_id: DEMO_OWNER_ID,
    updated_at: new Date().toISOString(),
  };
  return clone(state.salon);
}

export function listDemoClients() {
  return clone(state.clients);
}

export function upsertDemoClient(row) {
  const id = row.id || crypto.randomUUID();
  const idx = state.clients.findIndex((c) => c.id === id);
  const next = {
    ...row,
    id,
    salon_id: DEMO_SALON_ID,
    visit_count: row.visit_count ?? 0,
    created_at: row.created_at || new Date().toISOString(),
  };
  if (idx >= 0) state.clients[idx] = next;
  else state.clients.push(next);
  return clone(next);
}

export function deleteDemoClient(id) {
  state.clients = state.clients.filter((c) => c.id !== id);
}

export function listDemoSocialPosts() {
  return clone(state.social_posts).sort((a, b) => {
    const ta = a.scheduled_at || a.created_at;
    const tb = b.scheduled_at || b.created_at;
    return String(tb).localeCompare(String(ta));
  });
}

export function upsertDemoSocialPost(row) {
  const id = row.id || crypto.randomUUID();
  const idx = state.social_posts.findIndex((p) => p.id === id);
  const next = {
    ...row,
    id,
    salon_id: DEMO_SALON_ID,
    image_urls: row.image_urls || [],
    platforms: row.platforms || [],
    status: row.status || "draft",
    created_at: row.created_at || new Date().toISOString(),
  };
  if (idx >= 0) state.social_posts[idx] = next;
  else state.social_posts.push(next);
  return clone(next);
}

export function deleteDemoSocialPost(id) {
  state.social_posts = state.social_posts.filter((p) => p.id !== id);
}

export function listDemoNewsletters() {
  return clone(state.newsletter_campaigns).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function upsertDemoNewsletter(row) {
  const id = row.id || crypto.randomUUID();
  const idx = state.newsletter_campaigns.findIndex((n) => n.id === id);
  const next = {
    ...row,
    id,
    salon_id: DEMO_SALON_ID,
    recipient_count: row.recipient_count ?? 0,
    open_rate_pct: row.open_rate_pct ?? null,
    click_rate_pct: row.click_rate_pct ?? null,
    created_at: row.created_at || new Date().toISOString(),
  };
  if (idx >= 0) state.newsletter_campaigns[idx] = next;
  else state.newsletter_campaigns.push(next);
  return clone(next);
}

export function deleteDemoNewsletter(id) {
  state.newsletter_campaigns = state.newsletter_campaigns.filter((n) => n.id !== id);
}

export function updateDemoSalonIntegration(patch) {
  state.salon = { ...state.salon, ...patch, updated_at: new Date().toISOString() };
  return clone(state.salon);
}

export function listDemoStaff() {
  return clone(state.staff);
}

export function listDemoServices() {
  return clone(state.services);
}

export function listDemoAppointments() {
  return clone(state.appointments);
}

export function listDemoAvailabilityRules() {
  return clone(state.availability_rules);
}

export function setLastGoogleCalendarHtmlLink(url) {
  state.last_google_calendar_html_link = url || null;
}

export function getLastGoogleCalendarHtmlLink() {
  return state.last_google_calendar_html_link;
}

export function insertDemoAppointment(row) {
  const id = row.id || crypto.randomUUID();
  const staff = state.staff.find((s) => s.id === row.staff_id);
  const service = state.services.find((s) => s.id === row.service_id);
  const next = {
    ...row,
    id,
    salon_id: DEMO_SALON_ID,
    status: row.status || "confirmed",
    google_calendar_event_id: row.google_calendar_event_id || null,
    created_at: new Date().toISOString(),
    staff: staff ? { name: staff.name } : { name: "Staff" },
    services: service
      ? { name: service.name, duration_minutes: service.duration_minutes, price_cents: service.price_cents }
      : { name: "Service", duration_minutes: 60, price_cents: 0 },
  };
  state.appointments.push(next);
  return clone(next);
}

export function updateDemoAppointment(id, patch) {
  const idx = state.appointments.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  state.appointments[idx] = { ...state.appointments[idx], ...patch };
  return clone(state.appointments[idx]);
}
