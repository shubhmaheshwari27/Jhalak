import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db, signUrls, BUCKET } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data: session, error } = await db().from("sessions").select("*").eq("id", id).single();
    if (error) throw error;
    const { data: tryons, error: e2 } = await db()
      .from("tryons")
      .select("*, sarees(id,name,code,photo_path,spec_status)")
      .eq("session_id", id)
      .order("created_at");
    if (e2) throw e2;

    const urls = await signUrls([
      session.customer_photo_path,
      ...(tryons ?? []).map((t) => t.image_path),
      ...(tryons ?? []).map((t) => t.sarees?.photo_path),
    ]);

    return NextResponse.json({
      session: { ...session, customer_photo_url: urls[session.customer_photo_path] ?? null },
      tryons: (tryons ?? []).map((t) => ({
        ...t,
        image_url: t.image_path ? urls[t.image_path] ?? null : null,
        saree: t.sarees ? { ...t.sarees, photo_url: urls[t.sarees.photo_path] ?? null } : null,
      })),
    });
  } catch (e) {
    return errorJson(e);
  }
}

/** Delete a session and all its photos (customer privacy). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data: session } = await db().from("sessions").select("customer_photo_path").eq("id", id).single();
    const { data: tryons } = await db().from("tryons").select("image_path").eq("session_id", id);
    const paths = [session?.customer_photo_path, ...(tryons ?? []).map((t) => t.image_path)].filter(
      (p): p is string => !!p
    );
    if (paths.length) await db().storage.from(BUCKET).remove(paths);
    const { error } = await db().from("sessions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
