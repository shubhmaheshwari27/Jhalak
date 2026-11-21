import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db } from "@/lib/server/supabase";
import { runSpec } from "@/lib/server/spec";

export const maxDuration = 120;

/** Re-run the AI description for a saree. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data, error } = await db().from("sarees").select("photo_path").eq("id", id).single();
    if (error) throw error;
    await db().from("sarees").update({ spec_status: "pending" }).eq("id", id);
    await runSpec(id, data.photo_path);
    const { data: saree } = await db().from("sarees").select("*").eq("id", id).single();
    return NextResponse.json({ saree });
  } catch (e) {
    return errorJson(e);
  }
}
