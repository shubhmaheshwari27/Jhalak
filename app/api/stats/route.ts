import { NextResponse } from "next/server";
import { requireAuth, errorJson } from "@/lib/server/auth";
import { db } from "@/lib/server/supabase";

type Row = {
  provider: string;
  approach: string;
  status: string;
  duration_ms: number | null;
  rating_saree: number | null;
  rating_face: number | null;
};

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Compare the 4 variants: OpenAI A/B, Gemini A/B. */
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { data, error } = await db()
      .from("tryons")
      .select("provider,approach,status,duration_ms,rating_saree,rating_face");
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const variants = [
      ["openai", "A"],
      ["openai", "B"],
      ["gemini", "A"],
      ["gemini", "B"],
    ].map(([provider, approach]) => {
      const r = rows.filter((x) => x.provider === provider && x.approach === approach);
      const done = r.filter((x) => x.status === "done");
      const saree = r.map((x) => x.rating_saree).filter((x): x is number => x != null);
      const face = r.map((x) => x.rating_face).filter((x): x is number => x != null);
      return {
        provider,
        approach,
        total: r.length,
        done: done.length,
        failed: r.filter((x) => x.status === "failed").length,
        avg_seconds: avg(done.map((x) => (x.duration_ms ?? 0) / 1000)),
        rated: saree.length,
        avg_saree: avg(saree),
        avg_face: avg(face),
      };
    });
    return NextResponse.json({ variants });
  } catch (e) {
    return errorJson(e);
  }
}
