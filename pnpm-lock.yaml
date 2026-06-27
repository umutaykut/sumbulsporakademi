import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sumbul_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-secret-change-me-please");
    const { payload } = await jwtVerify(token, secret);
    const path = req.nextUrl.pathname;
    if (path.startsWith("/coordinator") && !["COORDINATOR","ADMIN"].includes(String(payload.role))) return NextResponse.redirect(new URL("/yetkisiz", req.url));
    if (path.startsWith("/coach") && payload.role !== "COACH") return NextResponse.redirect(new URL("/yetkisiz", req.url));
    if (path.startsWith("/parent") && payload.role !== "PARENT") return NextResponse.redirect(new URL("/yetkisiz", req.url));
    return NextResponse.next();
  } catch { return NextResponse.redirect(new URL("/login", req.url)); }
}
export const config = { matcher: ["/coordinator/:path*", "/coach/:path*", "/parent/:path*", "/sifre-degistir"] };
