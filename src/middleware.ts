import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/api/auth",
];

// Fast optimistic redirect only. Real authorization happens in server code and in Postgres RLS.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/" || PUBLIC.some((p) => pathname.startsWith(p)))
    return NextResponse.next();
  if (!getSessionCookie(req)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
