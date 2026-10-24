import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/bouncie/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Set by /api/bouncie/connect, which requires the manager PIN.
  if (!req.cookies.get("fp_bouncie_oauth")?.value) {
    return NextResponse.json({ error: "Start the Bouncie connection from /api/bouncie/connect" }, { status: 401 });
  }

  if (error || !code) {
    return NextResponse.json({ error: error ?? "missing code" }, { status: 400 });
  }

  const APP_URL = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";
  const redirectUri = `${APP_URL}/api/bouncie/callback`;

  try {
    await exchangeCode(code, redirectUri);
    const APP_URL2 = process.env.APP_URL ?? "https://bigfoot-proscore-production.up.railway.app";
    const res = NextResponse.redirect(APP_URL2);
    res.cookies.delete({ name: "fp_bouncie_oauth", path: "/api/bouncie/callback" });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "token exchange failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
