import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db, parseDataUrl, uploadImage } from "@/lib/server/supabase";

/** List recent try-on sessions. */
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { data, error } = await db()
      .from("sessions")
      .select("id,label,created_at,tryons(count)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch (e) {
    return errorJson(e);
  }
}

/**
 * Create a session: { label?, photo: dataUrl, consent: true, sareeIds: [], providers: ["openai","gemini"], approaches: ["A","B"] }
 * Creates one pending try-on row per saree x provider x approach. The browser then runs each one.
 */
export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.consent) return errorJson("Consent is required", 400);
    if (!body.photo) return errorJson("Customer photo is required", 400);
    const sareeIds: string[] = body.sareeIds ?? [];
    const providers: string[] = (body.providers ?? ["openai", "gemini"]).filter((p: string) =>
      ["openai", "gemini"].includes(p)
    );
    const approaches: string[] = (body.approaches ?? ["A", "B"]).filter((a: string) => ["A", "B"].includes(a));
    if (!sareeIds.length || !providers.length || !approaches.length) {
      return errorJson("Pick at least one saree, one AI model and one approach", 400);
    }

    const id = crypto.randomUUID();
    const { buffer, mime } = parseDataUrl(body.photo);
    const customer_photo_path = `customers/${id}.jpg`;
    await uploadImage(customer_photo_path, buffer, mime);

    const { error } = await db()
      .from("sessions")
      .insert({ id, label: body.label || null, customer_photo_path, consent: true });
    if (error) throw error;

    const rows = sareeIds.flatMap((saree_id) =>
      providers.flatMap((provider) => approaches.map((approach) => ({ session_id: id, saree_id, provider, approach })))
    );
    const { error: e2 } = await db().from("tryons").insert(rows);
    if (e2) throw e2;

    return NextResponse.json({ sessionId: id });
  } catch (e) {
    return errorJson(e);
  }
}
