import { NextResponse } from "next/server";
import { createClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserver"; // pragma: allowlist secret
import { hashApiKey, generateExternalApiKeyRaw } from "@/libs/api/validateApiKey";

export async function POST(request: Request) {
  try {
    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { name?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const rawKey = generateExternalApiKeyRaw();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    const { data: row, error } = await db
      .from("external_api_keys")
      .insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        status: "active",
      })
      .select("id, name, key_prefix, created_at")
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: "Failed to create API key", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: row.id,
      name: row.name,
      key: rawKey,
      key_prefix: row.key_prefix,
      created_at: row.created_at,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await db
      .from("external_api_keys")
      .select("id, name, key_prefix, status, usage_count, last_used_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keys: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list API keys" },
      { status: 500 }
    );
  }
}
