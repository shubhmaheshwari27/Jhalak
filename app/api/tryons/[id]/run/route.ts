import { NextResponse, after } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db, downloadImage, uploadImage } from "@/lib/server/supabase";
import { generateTryOn, Provider, Approach } from "@/lib/server/ai";

// Image generation can take 30-120s. Vercel allows up to 300s on the free plan (Fluid compute).
export const maxDuration = 300;

const STALE_MS = 6 * 60 * 1000;

/** Generate one try-on image. Add ?force=1 to retry a failed/stuck one. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";

  try {
    const { data: t, error } = await db()
      .from("tryons")
      .select("*, sarees(photo_path, spec), sessions(customer_photo_path)")
      .eq("id", id)
      .single();
    if (error) throw error;

    const stale = t.status === "running" && t.started_at && Date.now() - new Date(t.started_at).getTime() > STALE_MS;
    if (t.status === "done" && !force) return NextResponse.json({ status: "done" });
    if (t.status === "running" && !stale && !force) return NextResponse.json({ status: "running" });

    // Claim it (avoid two tabs generating the same image)
    const { data: claimed } = await db()
      .from("tryons")
      .update({ status: "running", started_at: new Date().toISOString(), error: null })
      .eq("id", id)
      .eq("status", t.status)
      .select("id");
    if (!claimed?.length) return NextResponse.json({ status: "running" });

    after(() => generate(id, t));
    return NextResponse.json({ status: "running" });
  } catch (e) {
    return errorJson(e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generate(id: string, t: any) {
  const started = Date.now();
  try {
    const [person, saree] = await Promise.all([
      downloadImage(t.sessions.customer_photo_path),
      downloadImage(t.sarees.photo_path),
    ]);
    const out = await generateTryOn({
      provider: t.provider as Provider,
      approach: t.approach as Approach,
      person,
      saree,
      spec: t.sarees.spec,
    });
    const ext = out.mime.includes("jpeg") ? "jpg" : out.mime.includes("webp") ? "webp" : "png";
    const image_path = `tryons/${t.session_id}/${id}.${ext}`;
    await uploadImage(image_path, out.buffer, out.mime);
    await db()
      .from("tryons")
      .update({ status: "done", image_path, duration_ms: Date.now() - started, error: null })
      .eq("id", id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tryon failed", id, msg);
    await db().from("tryons").update({ status: "failed", error: msg, duration_ms: Date.now() - started }).eq("id", id);
  }
}
