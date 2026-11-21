import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db, signUrls, BUCKET } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data, error } = await db().from("sarees").select("*").eq("id", id).single();
    if (error) throw error;
    const urls = await signUrls([data.photo_path]);
    return NextResponse.json({ saree: { ...data, photo_url: urls[data.photo_path] ?? null } });
  } catch (e) {
    return errorJson(e);
  }
}

/** Update name/code/price or a hand-corrected spec. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "code", "price"]) if (k in body) patch[k] = body[k] === "" ? null : body[k];
    if ("spec" in body) {
      patch.spec = body.spec;
      patch.spec_status = "done";
      patch.spec_error = null;
    }
    const { data, error } = await db().from("sarees").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ saree: data });
  } catch (e) {
    return errorJson(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data } = await db().from("sarees").select("photo_path").eq("id", id).single();
    const { error } = await db().from("sarees").delete().eq("id", id);
    if (error) throw error;
    if (data?.photo_path) await db().storage.from(BUCKET).remove([data.photo_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
