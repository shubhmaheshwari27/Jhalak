import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE = "cr_pass";

/** Returns a 401 response if the passcode cookie is missing/wrong, otherwise null. */
export async function requireAuth(): Promise<NextResponse | null> {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return null; // no passcode configured -> open
  const jar = await cookies();
  if (jar.get(AUTH_COOKIE)?.value === expected) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function errorJson(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: message }, { status });
}
