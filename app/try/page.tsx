"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoPicker from "@/components/PhotoPicker";
import { api } from "@/lib/client/api";
import { Saree } from "@/components/SpecBadge";

export default function TryOn() {
  const router = useRouter();
  const [sarees, setSarees] = useState<Saree[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [consent, setConsent] = useState(false);
  const [providers, setProviders] = useState<string[]>(["openai", "gemini"]);
  const [approaches, setApproaches] = useState<string[]>(["A", "B"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ sarees: Saree[] }>("/api/sarees")
      .then((d) => setSarees(d.sarees))
      .catch((e) => setErr(e.message));
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const count = picked.length * providers.length * approaches.length;
  const needsSpec = approaches.includes("A") && sarees?.some((s) => picked.includes(s.id) && s.spec_status !== "done");

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ sessionId: string }>("/api/sessions", {
        method: "POST",
        json: { label, photo, consent, sareeIds: picked, providers, approaches },
      });
      router.push(`/session/${d.sessionId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h1">New try-on</h1>

      {/* Step 1 */}
      <section className="card space-y-3">
        <h2 className="font-semibold">1. Pick sarees ({picked.length})</h2>
        {!sarees && !err && <p className="text-sm text-stone-500">Loading…</p>}
        {sarees?.length === 0 && (
          <p className="text-sm text-stone-600">
            No sarees yet. <Link href="/catalog/new" className="text-maroon underline">Add one first</Link>.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {sarees?.map((s) => {
            const on = picked.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(picked, setPicked, s.id)}
                className={`relative overflow-hidden rounded-xl border-2 text-left ${on ? "border-maroon" : "border-transparent"}`}
              >
                {s.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt={s.name} className="aspect-square w-full object-cover" />
                )}
                <p className="truncate bg-white px-1 py-1 text-[11px]">{s.name}</p>
                {on && <span className="absolute right-1 top-1 rounded-full bg-maroon px-1.5 text-xs text-white">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 */}
      <section className="card space-y-3">
        <h2 className="font-semibold">2. Customer photo</h2>
        <p className="text-xs text-stone-500">
          Best results: a full-length photo, standing straight and facing the camera, in good light against a plain wall.
        </p>
        <PhotoPicker value={photo} onChange={setPhoto} facing="user" label="Customer photo" aspect="h-72" />
        <input className="input" placeholder="Label (optional), e.g. Riya test 1" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>The person in this photo agrees to it being used to make try-on images. It can be deleted at any time.</span>
        </label>
      </section>

      {/* Step 3 */}
      <section className="card space-y-3">
        <h2 className="font-semibold">3. What to compare</h2>
        <div className="flex flex-wrap gap-2">
          {[
            ["openai", "OpenAI"],
            ["gemini", "Gemini"],
          ].map(([v, l]) => (
            <button key={v} type="button" onClick={() => toggle(providers, setProviders, v)}
              className={`chip px-3 py-1.5 text-sm ${providers.includes(v) ? "bg-maroon text-white" : "bg-stone-100 text-stone-600"}`}>
              {l}
            </button>
          ))}
          {[
            ["A", "A · Describe first"],
            ["B", "B · Direct photo"],
          ].map(([v, l]) => (
            <button key={v} type="button" onClick={() => toggle(approaches, setApproaches, v)}
              className={`chip px-3 py-1.5 text-sm ${approaches.includes(v) ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          This makes <b>{count}</b> image{count === 1 ? "" : "s"} ({picked.length} saree × {providers.length} model × {approaches.length} approach). Each image costs API credits.
        </p>
        {needsSpec && (
          <p className="text-xs text-amber-700">
            Some picked sarees don&apos;t have an AI description yet, so Approach A will fail for them. Open them in the saree list and tap Re-describe.
          </p>
        )}
      </section>

      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="btn w-full py-4 text-base" disabled={busy || !photo || !consent || count === 0} onClick={start}>
        {busy ? "Starting…" : `✨ Generate ${count} try-on${count === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
