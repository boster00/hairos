import { createClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserver"; // pragma: allowlist secret
import { createServiceRoleClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserviceRole"; // pragma: allowlist secret
import { FAKE_PIPELINE_USER_ID } from "@/libs/content-pipeline/devMockStore";

let cachedDevRealUserId = null;

async function resolveDevRealUserId(svc) {
  if (cachedDevRealUserId) return cachedDevRealUserId;

  const { data: row } = await svc
    .from("content_magic_articles")
    .select("user_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (row?.user_id) {
    cachedDevRealUserId = row.user_id;
    return cachedDevRealUserId;
  }

  return null;
}

/**
 * Resolves DB client + user id for Content Pipeline API routes.
 * When CJGEO_DEV_FAKE_AUTH + CONTENT_PIPELINE_USE_REAL_DB, use service role and a real auth.users id (FK).
 */
export async function getPipelineDbContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { supabase, userId: user.id, sessionUser: user };
  }

  if (
    process.env.CJGEO_DEV_FAKE_AUTH === "1" &&
    process.env.CONTENT_PIPELINE_USE_REAL_DB === "1"
  ) {
    const svc = createServiceRoleClient();
    const userId = await resolveDevRealUserId(svc);
    if (!userId) {
      throw new Error(
        "CONTENT_PIPELINE_USE_REAL_DB: no user_id found on content_magic_articles; create an article or sign in once so pipelines can use a valid auth.users id"
      );
    }
    return {
      supabase: svc,
      userId,
      sessionUser: null,
    };
  }

  return { supabase, userId: null, sessionUser: null };
}
