import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db } from "@/lib/server/supabase";

/** Save ratings: { rating_saree?: 1-5, rating_face?: 1-5, notes?: string } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["rating_saree", "rating_face"]) {
      if (k in body) {
        const v = body[k] === null ? null : Number(body[k]);
        if (v !== null && (v < 1 || v > 5)) return errorJson("Rating must be 1-5", 400);
        patch[k] = v;
      }
    }
    if ("notes" in body) patch.notes = body.notes || null;
    const { error } = await db().from("tryons").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
