"use server";

import { cookies, headers } from "next/headers";

// Dev-only fallbacks. In production, a missing ADMIN_SECRET / ADMIN_PIN locks
// the manager area instead of falling back to a value that is in the repo.
const isProd = process.env.NODE_ENV === "production";

// 3 wrong PINs locks that IP out for 15 minutes. Kept in memory: the app runs as
// a single Railway instance, and a redeploy clearing it is fine.
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

async function clientIp(): Promise<string> {
  const h = await headers();
  // Railway's edge sets X-Real-IP; X-Forwarded-For's last hop is the fallback.
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
}

function lockedMessage(lockedUntil: number): string {
  const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
  return `Too many wrong tries. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`;
}

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

  const ip = await clientIp();
  const now = Date.now();
  const entry = failures.get(ip);
  if (entry && entry.lockedUntil > now) {
    return { ok: false, error: lockedMessage(entry.lockedUntil) };
  }

  if (pin !== expected) {
    const count = (entry && entry.lockedUntil === 0 ? entry.count : 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_MS;
      failures.set(ip, { count: 0, lockedUntil });
      return { ok: false, error: lockedMessage(lockedUntil) };
    }
    failures.set(ip, { count, lockedUntil: 0 });
    const left = MAX_ATTEMPTS - count;
    return { ok: false, error: `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.` };
  }

  failures.delete(ip);
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
