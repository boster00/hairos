/**
 * Deterministic mock articles when CJGEO_DEV_FAKE_AUTH is on but Supabase is unavailable (e.g. placeholder .env.local).
 */
export const DEV_FAKE_CONTENT_MAGIC_ARTICLES = [
  {
    id: '48a69152-3c3b-46ea-9cc9-21f85239288a',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Co-IP',
    type: 'other',
    status: 'draft',
    content_html:
      '<article class="prose max-w-none"><h1>Co-IP</h1><p>Co-immunoprecipitation (Co-IP) detects protein–protein interactions by pulling down a bait antigen and identifying associated proteins. This draft simulates adopted v0 output for local dev.</p><section><h2>Workflow</h2><ol><li>Lyse cells and preclear lysate</li><li>Incubate with bait antibody</li><li>Capture immune complexes on beads</li><li>Wash, elute, and analyze by Western blot or mass spectrometry</li></ol></section></article>',
    outline: { status: 'adopted', adopted_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    campaign_id: null,
    context: {},
  },
  {
    id: '57174dce-cfe7-4868-be66-4fcb10eb159d',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Western Blot',
    type: 'other',
    status: 'draft',
    content_html:
      '<article class="prose max-w-none"><h1>Western Blot</h1><p>Western blotting separates proteins by SDS-PAGE, transfers them to a membrane, and detects targets with specific antibodies. Simulated adopted content for dev.</p><section><h2>Key controls</h2><ul><li>Loading control (e.g. GAPDH or actin)</li><li>Primary antibody specificity</li><li>Secondary-only lanes</li></ul></section></article>',
    outline: { status: 'adopted', adopted_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    campaign_id: null,
    context: {},
  },
  {
    id: 'c10c10a1-e8d2-4c03-8d95-92ffd385706e',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Blood Coagulation',
    type: 'other',
    status: 'draft',
    content_html:
      '<article class="prose max-w-none"><h1>Blood Coagulation</h1><p>Hemostasis limits blood loss through platelet plug formation and the coagulation cascade. This page is mock adopted HTML for local testing.</p><section><h2>Cascade overview</h2><p>Extrinsic and intrinsic pathways converge on factor X activation, leading to thrombin generation and fibrin clot formation.</p></section></article>',
    outline: { status: 'adopted', adopted_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    campaign_id: null,
    context: {},
  },
];

export function getDevFakeArticleById(id) {
  return DEV_FAKE_CONTENT_MAGIC_ARTICLES.find((a) => a.id === id) || null;
}
