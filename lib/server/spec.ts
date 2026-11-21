import { db, downloadImage } from "./supabase";
import { describeSaree } from "./ai";

/** Generate and save the AI description (used by Approach A) for one saree. */
export async function runSpec(id: string, photo_path: string) {
  try {
    const img = await downloadImage(photo_path);
    const spec = await describeSaree(img);
    await db().from("sarees").update({ spec, spec_status: "done", spec_error: null }).eq("id", id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("spec failed", id, msg);
    await db().from("sarees").update({ spec_status: "failed", spec_error: msg }).eq("id", id);
  }
}
