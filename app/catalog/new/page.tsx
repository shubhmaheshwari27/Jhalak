"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoPicker from "@/components/PhotoPicker";
import { api } from "@/lib/client/api";

export default function NewSaree() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!photo || !name) return;
    setBusy(true);
    setErr(null);
    try {
      const d = await api<{ saree: { id: string } }>("/api/sarees", {
        method: "POST",
        json: { name, code, price, photo },
      });
      router.push(`/catalog/${d.saree.id}`);
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="h1">Add a saree</h1>

      <details className="card" open>
        <summary className="cursor-pointer font-medium">How to photograph the saree</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>Lay the saree folded flat on a plain table, in good daylight with no harsh shadows.</li>
          <li>Show every part: the <b>body</b> (main fabric), the <b>top border</b>, the <b>bottom border</b>, a section of the <b>pallu</b> opened out, and the <b>blouse</b> piece.</li>
          <li>Put a printed label next to each part: BODY, TOP BORDER, BOTTOM BORDER, PALLU, BLOUSE.</li>
          <li>Shoot from straight above (or a fixed angle) so everything fits in one photo.</li>
        </ol>
      </details>

      <div className="card space-y-3">
        <PhotoPicker value={photo} onChange={setPhoto} label="Saree photo" />
        <div>
          <label className="text-sm font-medium">Name *</label>
          <input className="input mt-1" placeholder="e.g. Pink paithani cotton" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Code / barcode</label>
            <input className="input mt-1" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Price (₹)</label>
            <input className="input mt-1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn w-full" disabled={!photo || !name || busy} onClick={save}>
          {busy ? "Saving & describing the saree (≈20s)…" : "Save saree"}
        </button>
      </div>
    </div>
  );
}
