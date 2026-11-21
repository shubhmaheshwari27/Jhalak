import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "cloakroom";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** "data:image/jpeg;base64,...." -> { buffer, mime } */
export function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid image data");
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

export async function uploadImage(path: string, buffer: Buffer, mime: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error("Storage upload failed: " + error.message);
}

export async function downloadImage(path: string): Promise<{ buffer: Buffer; mime: string }> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error("Storage download failed: " + (error?.message ?? path));
  return { buffer: Buffer.from(await data.arrayBuffer()), mime: data.type || "image/jpeg" };
}

/** Signed URLs (valid 2h) for a list of storage paths. */
export async function signUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return {};
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(unique, 60 * 60 * 2);
  if (error) throw new Error("Signing URLs failed: " + error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
