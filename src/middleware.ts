import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("fp_admin")?.value;
  const expected = process.env.ADMIN_SECRET ?? "footprint-dev-secret-change-me";

  if (!token || token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/pin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*"],
};
