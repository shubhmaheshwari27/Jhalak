"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, VARIANT_LABEL } from "@/lib/client/api";

type Variant = {
  provider: string;
  approach: string;
  total: number;
  done: number;
  failed: number;
  avg_seconds: number | null;
  rated: number;
  avg_saree: number | null;
  avg_face: number | null;
};
type SessionRow = { id: string; label: string | null; created_at: string; tryons: { count: number }[] };

export default function Results() {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ variants: Variant[] }>("/api/stats").then((d) => setVariants(d.variants)).catch((e) => setErr(e.message));
    api<{ sessions: SessionRow[] }>("/api/sessions").then((d) => setSessions(d.sessions)).catch((e) => setErr(e.message));
  }, []);

  const best = variants
    ?.filter((v) => v.rated > 0 && v.avg_saree != null)
    .sort((a, b) => (b.avg_saree ?? 0) - (a.avg_saree ?? 0))[0];

  return (
    <div className="space-y-5">
      <h1 className="h1">Compare results</h1>
      {err && <p className="text-sm text-red-700">{err}</p>}

      {best && (
        <div className="card border-maroon/30 bg-maroon/5">
          <p className="text-xs uppercase tracking-wide text-maroon">Leading so far</p>
          <p className="text-lg font-semibold">{VARIANT_LABEL[`${best.provider}-${best.approach}`]}</p>
          <p className="text-sm text-stone-600">
            Saree accuracy {best.avg_saree}/5 from {best.rated} rating{best.rated === 1 ? "" : "s"}. Rate at least 20 images per option before trusting this.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {variants?.map((v) => (
          <div key={`${v.provider}-${v.approach}`} className="card space-y-2">
            <p className="font-semibold">{VARIANT_LABEL[`${v.provider}-${v.approach}`]}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Saree accuracy" value={v.avg_saree != null ? `${v.avg_saree}/5` : "—"} />
              <Stat label="Face likeness" value={v.avg_face != null ? `${v.avg_face}/5` : "—"} />
              <Stat label="Avg time" value={v.avg_seconds != null ? `${v.avg_seconds}s` : "—"} />
            </div>
            <p className="text-xs text-stone-500">
              {v.done} made · {v.failed} failed · {v.rated} rated
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Sessions</h2>
        {sessions?.length === 0 && <p className="text-sm text-stone-500">No try-ons yet.</p>}
        {sessions?.map((s) => (
          <Link key={s.id} href={`/session/${s.id}`} className="card flex items-center justify-between py-3">
            <span className="text-sm font-medium">{s.label || "Untitled session"}</span>
            <span className="text-xs text-stone-500">
              {s.tryons?.[0]?.count ?? 0} images · {new Date(s.created_at).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] text-stone-500">{label}</p>
    </div>
  );
}
