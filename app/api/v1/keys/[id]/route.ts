import { NextResponse } from "next/server";
import { createClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserver"; // pragma: allowlist secret

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: fetchErr } = await db
      .from("external_api_keys")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await db
      .from("external_api_keys")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to revoke key" },
      { status: 500 }
    );
  }
}
