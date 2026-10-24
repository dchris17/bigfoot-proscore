"use server";

import { cookies } from "next/headers";

// Dev-only fallbacks. In production, a missing ADMIN_SECRET / ADMIN_PIN locks
// the manager area instead of falling back to a value that is in the repo.
const isProd = process.env.NODE_ENV === "production";

function adminToken(): string | null {
  return process.env.ADMIN_SECRET || (isProd ? null : "footprint-dev-secret-change-me");
}

function adminPin(): string | null {
  return process.env.ADMIN_PIN || (isProd ? null : "0000");
}

export async function checkPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const expected = adminPin();
  const token = adminToken();
  if (!expected || !token) {
    return { ok: false, error: "Manager PIN is not configured on the server." };
  }
  if (pin !== expected) {
    return { ok: false, error: "Wrong PIN. Try again." };
  }
  const jar = await cookies();
  jar.set("fp_admin", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return { ok: true };
}

export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const jar = await cookies();
  return jar.get("fp_admin")?.value === token;
}
