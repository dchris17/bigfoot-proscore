"use server";

import { cookies } from "next/headers";

function adminToken(): string {
  return process.env.ADMIN_SECRET ?? "footprint-dev-secret-change-me";
}

export async function checkPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const expected = process.env.ADMIN_PIN ?? "0000";
  if (pin !== expected) {
    return { ok: false, error: "Wrong PIN. Try again." };
  }
  const jar = await cookies();
  jar.set("fp_admin", adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return { ok: true };
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("fp_admin")?.value === adminToken();
}
