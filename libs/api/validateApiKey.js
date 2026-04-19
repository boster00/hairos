import { createHash, randomBytes } from "crypto";

/**
 * @typedef {{ valid: true, userId: string, keyId: string } | { valid: false }} ApiKeyValidationResult
 */

export function hashApiKey(rawKey) {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function generateExternalApiKeyRaw() {
  return `cjgeo_${randomBytes(16).toString("hex")}`;
}

/**
 * @param {*} db PostgREST client (service role)
 * @param {string | null | undefined} rawKey
 * @returns {Promise<ApiKeyValidationResult>}
 */
export async function validateApiKeyLookup(db, rawKey) {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
    return { valid: false };
  }

  const keyHash = hashApiKey(rawKey.trim());

  const { data: row, error } = await db
    .from("external_api_keys")
    .select("id, user_id, status")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .maybeSingle();

  if (error || !row) {
    return { valid: false };
  }

  return { valid: true, userId: row.user_id, keyId: row.id };
}

/**
 * @param {*} db PostgREST client (service role)
 * @param {string | null | undefined} rawKey
 */
export async function validateApiKeyAndTouchUsage(db, rawKey) {
  const base = await validateApiKeyLookup(db, rawKey);
  if (!base.valid) {
    return base;
  }

  const now = new Date().toISOString();
  const { data: row } = await db
    .from("external_api_keys")
    .select("usage_count")
    .eq("id", base.keyId)
    .single();

  const nextCount = (typeof row?.usage_count === "number" ? row.usage_count : 0) + 1;

  await db
    .from("external_api_keys")
    .update({
      usage_count: nextCount,
      last_used_at: now,
      updated_at: now,
    })
    .eq("id", base.keyId);

  return base;
}
