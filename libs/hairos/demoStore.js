/**
 * In-memory store for HairOS UI demo (HAIR_OS_UI_DEMO + CJGEO_DEV_FAKE_AUTH).
 * Survives for the lifetime of the dev server process.
 */

const DEMO_SALON_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_OWNER_ID = "00000000-0000-0000-0000-000000000001";

let state = {
  salon: {
    id: DEMO_SALON_ID,
    owner_id: DEMO_OWNER_ID,
    name: "Demo Salon",
    slug: "demo-salon",
    phone: "(555) 010-0200",
    address: "123 Style Ave",
    timezone: "America/Los_Angeles",
    vapi_assistant_id: null,
    twilio_from_number: null,
    google_calendar_token: null,
    buffer_token: null,
  },
  clients: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      salon_id: DEMO_SALON_ID,
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+15550001111",
      notes: "Prefers Saturday mornings",
      visit_count: 4,
      last_visit_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  social_posts: [
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      salon_id: DEMO_SALON_ID,
      content: "Spring refresh — book your color consult this week!",
      image_urls: [],
      platforms: ["instagram", "facebook"],
      scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      buffer_post_id: null,
      status: "scheduled",
      created_at: new Date().toISOString(),
    },
  ],
  newsletter_campaigns: [
    {
      id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
      salon_id: DEMO_SALON_ID,
      subject: "April specials at Demo Salon",
      content_html: "<p>Hi {{first_name}},</p><p>We have new spring packages — reply to book.</p>",
      recipient_count: 42,
      sent_at: null,
      created_at: new Date().toISOString(),
    },
  ],
  staff: [
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      salon_id: DEMO_SALON_ID,
      name: "Alex Rivera",
      email: "alex@demo-salon.local",
      phone: null,
      role: "stylist",
      active: true,
      staff_services: [{ service_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee" }],
    },
  ],
  services: [
    {
      id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      salon_id: DEMO_SALON_ID,
      name: "Cut & Style",
      description: "Shampoo, cut, blow-dry",
      duration_minutes: 60,
      price_cents: 8500,
      active: true,
    },
  ],
  appointments: [],
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isDemoHairContext() {
  return process.env.HAIR_OS_UI_DEMO === "1" && process.env.CJGEO_DEV_FAKE_AUTH === "1";
}

export function getDemoSalon() {
  return clone(state.salon);
}

/** Merge fields into demo salon (onboarding / settings). */
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
    const ta = a.scheduled_at || "";
    const tb = b.scheduled_at || "";
    return ta.localeCompare(tb);
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

export function insertDemoAppointment(row) {
  const id = row.id || crypto.randomUUID();
  const staff = state.staff.find((s) => s.id === row.staff_id);
  const service = state.services.find((s) => s.id === row.service_id);
  const next = {
    ...row,
    id,
    salon_id: DEMO_SALON_ID,
    status: row.status || "confirmed",
    created_at: new Date().toISOString(),
    staff: staff ? { name: staff.name } : { name: "Staff" },
    services: service
      ? { name: service.name, duration_minutes: service.duration_minutes, price_cents: service.price_cents }
      : { name: "Service", duration_minutes: 60, price_cents: 0 },
  };
  state.appointments.push(next);
  return clone(next);
}
