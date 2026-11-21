"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Saree, SpecBadge } from "@/components/SpecBadge";

export default function SareeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saree, setSaree] = useState<Saree | null>(null);
  const [specText, setSpecText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load(s: Saree) {
    setSaree((prev) => ({ ...s, photo_url: s.photo_url ?? prev?.photo_url ?? null }));
    setSpecText(s.spec ? JSON.stringify(s.spec, null, 2) : "");
  }

  useEffect(() => {
    api<{ saree: Saree }>(`/api/sarees/${id}`)
      .then((d) => load(d.saree))
      .catch((e) => setMsg(e.message));
  }, [id]);

  // While the AI is still describing the saree, check every 4 seconds.
  useEffect(() => {
    if (saree?.spec_status !== "pending") return;
    const h = setInterval(() => {
      api<{ saree: Saree }>(`/api/sarees/${id}`).then((d) => {
        if (d.saree.spec_status !== "pending") load(d.saree);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(h);
  }, [id, saree?.spec_status]);

  async function rerun() {
    setBusy("rerun");
    setMsg(null);
    try {
      const d = await api<{ saree: Saree }>(`/api/sarees/${id}/spec`, { method: "POST" });
      load(d.saree);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveSpec() {
    setBusy("save");
    setMsg(null);
    try {
      const spec = JSON.parse(specText);
      const d = await api<{ saree: Saree }>(`/api/sarees/${id}`, { method: "PATCH", json: { spec } });
      load(d.saree);
      setMsg("Saved ✓");
    } catch (e) {
      setMsg(e instanceof SyntaxError ? "That isn't valid JSON. Check commas and quotes." : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this saree and all its try-ons?")) return;
    setBusy("delete");
    try {
      await api(`/api/sarees/${id}`, { method: "DELETE" });
      router.push("/catalog");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  if (!saree) return <p className="text-sm text-stone-500">{msg ?? "Loading…"}</p>;

  return (
    <div className="space-y-4">
      <Link href="/catalog" className="text-sm text-stone-500">
        ← All sarees
      </Link>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 p-2">
          {saree.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={saree.photo_url} alt={saree.name} className="w-full rounded-xl" />
          )}
          <div className="flex items-center justify-between px-2 pb-1">
            <div>
              <p className="font-semibold">{saree.name}</p>
              <p className="text-xs text-stone-500">
                {saree.code ? `Code ${saree.code}` : "No code"}
                {saree.price ? ` · ₹${saree.price}` : ""}
              </p>
            </div>
            <SpecBadge status={saree.spec_status} />
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold">AI description (used by Approach A)</h2>
            <p className="text-xs text-stone-500">
              Check it against the photo. If something is wrong (colour, motif, border), fix it here. Approach A can only be as good as this description.
            </p>
          </div>
          {saree.spec_status === "failed" && <p className="text-sm text-red-700">{saree.spec_error}</p>}
          {saree.spec_status === "pending" && (
            <p className="text-sm text-amber-700">The AI is reading the saree photo. This usually takes 10–30 seconds…</p>
          )}
          <textarea
            className="input h-80 font-mono text-xs"
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            placeholder="No description yet"
          />
          {msg && <p className="text-sm text-stone-700">{msg}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={saveSpec} disabled={!!busy || !specText}>
              {busy === "save" ? "Saving…" : "Save edits"}
            </button>
            <button className="btn-secondary" onClick={rerun} disabled={!!busy}>
              {busy === "rerun" || saree.spec_status === "pending" ? "Describing…" : "↻ Re-describe"}
            </button>
          </div>
          <button className="w-full text-sm text-red-700 underline" onClick={remove} disabled={!!busy}>
            Delete saree
          </button>
        </div>
      </div>
    </div>
  );
}
