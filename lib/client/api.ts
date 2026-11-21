"use client";

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && typeof window !== "undefined" && !url.includes("/api/login")) {
    window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname);
    throw new Error("Please enter the passcode");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const VARIANT_LABEL: Record<string, string> = {
  "openai-A": "OpenAI · A (describe first)",
  "openai-B": "OpenAI · B (direct photo)",
  "gemini-A": "Gemini · A (describe first)",
  "gemini-B": "Gemini · B (direct photo)",
};
