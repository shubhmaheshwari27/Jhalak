"use client";

import { useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/client/image";

export default function PhotoPicker({
  value,
  onChange,
  facing = "environment",
  label = "Photo",
  aspect = "aspect-[4/3]",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  facing?: "user" | "environment";
  label?: string;
  aspect?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await fileToDataUrl(f));
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`${aspect} w-full overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 flex items-center justify-center`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-stone-500">{busy ? "Processing…" : `No ${label.toLowerCase()} yet`}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={() => cameraRef.current?.click()}>
          📷 Take photo
        </button>
        <button type="button" className="btn-secondary" onClick={() => galleryRef.current?.click()}>
          🖼️ Upload
        </button>
      </div>
      {value && (
        <button type="button" className="text-xs text-stone-500 underline" onClick={() => onChange(null)}>
          Remove photo
        </button>
      )}
      {err && <p className="text-sm text-red-700">{err}</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture={facing} className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}
