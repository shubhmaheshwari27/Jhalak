"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Saree, SpecBadge } from "@/components/SpecBadge";

export default function Catalog() {
  const [sarees, setSarees] = useState<Saree[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ sarees: Saree[] }>("/api/sarees")
      .then((d) => setSarees(d.sarees))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Sarees</h1>
        <Link href="/catalog/new" className="btn">
          + Add saree
        </Link>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {!sarees && !err && <p className="text-sm text-stone-500">Loading…</p>}
      {sarees?.length === 0 && (
        <div className="card text-center text-sm text-stone-600">No sarees yet. Add your first one.</div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {sarees?.map((s) => (
          <Link key={s.id} href={`/catalog/${s.id}`} className="card block overflow-hidden p-0">
            {s.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo_url} alt={s.name} className="aspect-square w-full object-cover" />
            )}
            <div className="space-y-1 p-3">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <SpecBadge status={s.spec_status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
