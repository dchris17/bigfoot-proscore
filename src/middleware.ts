import { NextRequest, NextResponse } from "next/server";

// Manager-only pages. API routes check isAdmin() themselves.
const PROTECTED_PREFIXES = ["/settings", "/admin", "/setup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("fp_admin")?.value;
  const expected =
    process.env.ADMIN_SECRET ||
    (process.env.NODE_ENV === "production" ? null : "footprint-dev-secret-change-me");

  if (!expected || !token || token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/pin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/admin/:path*", "/setup/:path*"],
};
