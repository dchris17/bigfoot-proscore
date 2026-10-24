import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/bouncie/client";
import { isAdmin } from "@/app/pin/actions";

const APP_URL = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const redirectUri = `${APP_URL}/api/bouncie/callback`;
  const authUrl = buildAuthUrl(redirectUri);
  const res = NextResponse.redirect(authUrl);
  // The callback only accepts a code from a browser that started here.
  // SameSite=Lax so the cookie survives the redirect back from Bouncie.
  res.cookies.set("fp_bouncie_oauth", randomBytes(16).toString("hex"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/api/bouncie/callback",
  });
  return res;
}
