import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/bouncie/client";

const APP_URL = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";

export async function GET() {
  const redirectUri = `${APP_URL}/api/bouncie/callback`;
  const authUrl = buildAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
