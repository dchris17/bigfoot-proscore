import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/bouncie/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.json({ error: error ?? "missing code" }, { status: 400 });
  }

  const APP_URL = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";
  const redirectUri = `${APP_URL}/api/bouncie/callback`;

  try {
    await exchangeCode(code, redirectUri);
    const APP_URL2 = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";
    return NextResponse.redirect(APP_URL2);
  } catch (e) {
    return NextResponse.json(
      { error: "token exchange failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
