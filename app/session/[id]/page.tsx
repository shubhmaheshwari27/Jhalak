"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Stars from "@/components/Stars";
import { api, VARIANT_LABEL } from "@/lib/client/api";

type TryOn = {
  id: string;
  saree_id: string;
  provider: string;
  approach: string;
  status: "pending" | "running" | "done" | "failed";
  image_url: string | null;
  error: string | null;
  duration_ms: number | null;
  started_at: string | null;
  rating_saree: number | null;
  rating_face: number | null;
  notes: string | null;
  saree: { id: string; name: string; photo_url: string | null } | null;
};
type Session = { id: string; label: string | null; customer_photo_url: string | null; created_at: string };

const CONCURRENCY = 6;
const VARIANT_ORDER = ["openai-A", "openai-B", "gemini-A", "gemini-B"];

/** Same shuffle every time for a given saree, so blind mode stays consistent. */
function shuffled<T extends { id: string }>(items: T[], seed: string): T[] {
  const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return [...items].sort((a, b) => h(a.id + seed) - h(b.id + seed));
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [tryons, setTryons] = useState<TryOn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [blind, setBlind] = useState(true);
  const [zoom, setZoom] = useState<{ a: string; b?: string | null } | null>(null);
  const started = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const d = await api<{ session: Session; tryons: TryOn[] }>(`/api/sessions/${id}`);
      setSession((prev) => ({ ...d.session, customer_photo_url: d.session.customer_photo_url ?? prev?.customer_photo_url ?? null }));
      setTryons(d.tryons);
      return d.tryons;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, [id]);

  const run = useCallback(
    async (ids: string[], force = false) => {
      const queue = ids.filter((x) => force || !started.current.has(x));
      queue.forEach((x) => started.current.add(x));
      if (force) setTryons((ts) => ts.map((t) => (ids.includes(t.id) ? { ...t, status: "running", error: null } : t)));
      const worker = async () => {
        while (queue.length) {
          const tid = queue.shift()!;
          try {
            await api(`/api/tryons/${tid}/run${force ? "?force=1" : ""}`, { method: "POST" });
          } catch {
            /* error is saved on the row */
          }
          await refresh();
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    },
    [refresh]
  );

  // Load, then start any pending ones.
  useEffect(() => {
    refresh().then((ts) => run(ts.filter((t) => t.status === "pending").map((t) => t.id)));
  }, [refresh, run]);

  // While something is running (maybe from another device), poll.
  useEffect(() => {
    if (!tryons.some((t) => t.status === "running")) return;
    const h = setInterval(refresh, 5000);
    return () => clearInterval(h);
  }, [tryons, refresh]);

  async function rate(t: TryOn, patch: Partial<TryOn>) {
    setTryons((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    try {
      await api(`/api/tryons/${t.id}`, { method: "PATCH", json: patch });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteSession() {
    if (!confirm("Delete this session, the customer photo and all generated images?")) return;
    await api(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/results");
  }

  const groups = Object.values(
    tryons.reduce<Record<string, TryOn[]>>((acc, t) => {
      (acc[t.saree_id] ??= []).push(t);
      return acc;
    }, {})
  );
  const done = tryons.filter((t) => t.status === "done" || t.status === "failed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {session?.customer_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.customer_photo_url} alt="Customer" className="h-16 w-12 rounded-lg object-cover" />
        )}
        <div className="flex-1">
          <h1 className="h1 text-xl">{session?.label || "Try-on session"}</h1>
          <p className="text-xs text-stone-500">
            {done}/{tryons.length} finished{done < tryons.length ? " · images take about 30–90s each" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
          <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
          Blind mode (hide which model made each image)
        </label>
        <button className="text-sm text-red-700 underline" onClick={deleteSession}>
          Delete session
        </button>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}

      {groups.map((items) => {
        const saree = items[0].saree;
        const ordered = blind
          ? shuffled(items, saree?.id ?? "")
          : [...items].sort((a, b) => VARIANT_ORDER.indexOf(`${a.provider}-${a.approach}`) - VARIANT_ORDER.indexOf(`${b.provider}-${b.approach}`));
        return (
          <section key={saree?.id} className="card space-y-3">
            <div className="flex items-center gap-3">
              {saree?.photo_url && (
                <button onClick={() => setZoom({ a: saree.photo_url! })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={saree.photo_url} alt={saree.name} className="h-16 w-16 rounded-lg object-cover" />
                </button>
              )}
              <div>
                <p className="font-semibold">{saree?.name}</p>
                <p className="text-xs text-stone-500">Tap the saree photo or any result to view it full screen.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {ordered.map((t, i) => {
                const key = `${t.provider}-${t.approach}`;
                return (
                  <div key={t.id} className="space-y-2 rounded-xl border border-stone-200 p-2">
                    <p className="text-[11px] font-medium text-stone-600">
                      {blind ? `Option ${i + 1}` : VARIANT_LABEL[key]}
                    </p>
                    <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-lg bg-stone-100">
                      {t.status === "done" && t.image_url ? (
                        <button className="h-full w-full" onClick={() => setZoom({ a: t.image_url!, b: saree?.photo_url })}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={t.image_url} alt={key} className="h-full w-full object-cover" />
                        </button>
                      ) : t.status === "failed" ? (
                        <div className="space-y-2 p-2 text-center">
                          <p className="text-xs text-red-700 line-clamp-6">{t.error}</p>
                          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => run([t.id], true)}>
                            Retry
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-stone-500">
                          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-maroon" />
                          {t.status === "running" ? "Generating…" : "Waiting…"}
                        </div>
                      )}
                    </div>
                    {t.status === "done" && (
                      <>
                        <Stars label="Saree accuracy" value={t.rating_saree} onChange={(v) => rate(t, { rating_saree: v })} />
                        <Stars label="Face likeness" value={t.rating_face} onChange={(v) => rate(t, { rating_face: v })} />
                        <input
                          className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs"
                          placeholder="Note (e.g. wrong border)"
                          defaultValue={t.notes ?? ""}
                          onBlur={(e) => e.target.value !== (t.notes ?? "") && rate(t, { notes: e.target.value })}
                        />
                        <div className="flex items-center justify-between text-[10px] text-stone-400">
                          <span>{t.duration_ms ? `${Math.round(t.duration_ms / 1000)}s` : ""}</span>
                          <button className="underline" onClick={() => run([t.id], true)}>
                            Regenerate
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3" onClick={() => setZoom(null)}>
          <p className="pb-2 text-center text-xs text-white/70">Tap anywhere to close</p>
          <div className={`grid flex-1 gap-2 overflow-auto ${zoom.b ? "md:grid-cols-2" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.a} alt="" className="mx-auto max-h-full w-auto object-contain" />
            {zoom.b && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={zoom.b} alt="Original saree" className="mx-auto max-h-full w-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
