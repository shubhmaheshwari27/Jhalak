"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";

export default function Login() {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/login", { method: "POST", json: { passcode: pass } });
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next;
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 text-center">
      <div>
        <div className="text-5xl">🥻</div>
        <h1 className="h1 mt-2">Cloakroom</h1>
        <p className="text-sm text-stone-500">Virtual saree try-on · test app</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 text-left">
        <label className="text-sm font-medium">Team passcode</label>
        <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn w-full" disabled={busy || !pass}>
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
