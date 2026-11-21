import { NextResponse } from "next/server";
import { db } from "@/lib/server/supabase";

/** Setup check: which keys are configured and whether the database answers. Never returns secret values. */
export async function GET() {
  const has = (k: string) => !!process.env[k];
  let database = "not configured";
  if (has("SUPABASE_URL") && (has("SUPABASE_SECRET_KEY") || has("SUPABASE_SERVICE_ROLE_KEY"))) {
    try {
      const { error } = await db().from("sarees").select("id", { head: true, count: "exact" });
      database = error ? `error: ${error.message}` : "ok";
    } catch (e) {
      database = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return NextResponse.json({
    passcode: has("APP_PASSCODE"),
    database,
    openai: has("OPENAI_API_KEY"),
    gemini: has("GEMINI_API_KEY"),
    spec_provider: process.env.SPEC_PROVIDER || (has("OPENAI_API_KEY") ? "openai" : "gemini"),
  });
}
