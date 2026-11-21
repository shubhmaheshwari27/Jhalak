import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db, parseDataUrl, uploadImage, signUrls } from "@/lib/server/supabase";
import { runSpec } from "@/lib/server/spec";

export const maxDuration = 120;

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { data, error } = await db().from("sarees").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const urls = await signUrls((data ?? []).map((s) => s.photo_path));
    return NextResponse.json({
      sarees: (data ?? []).map((s) => ({ ...s, photo_url: urls[s.photo_path] ?? null })),
    });
  } catch (e) {
    return errorJson(e);
  }
}

/** Create a saree: { name, code?, price?, photo: dataUrl }. Also generates the AI description. */
export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.name || !body.photo) return errorJson("Name and photo are required", 400);
    const id = crypto.randomUUID();
    const { buffer, mime } = parseDataUrl(body.photo);
    const photo_path = `sarees/${id}.jpg`;
    await uploadImage(photo_path, buffer, mime);

    const { error } = await db().from("sarees").insert({
      id,
      name: body.name,
      code: body.code || null,
      price: body.price ? Number(body.price) : null,
      photo_path,
    });
    if (error) throw error;

    await runSpec(id, photo_path);
    const { data } = await db().from("sarees").select("*").eq("id", id).single();
    return NextResponse.json({ saree: data });
  } catch (e) {
    return errorJson(e);
  }
}
