import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-secret-change-me-please");
export type SessionUser = { id: string; name: string; role: Role; mustChangePassword: boolean };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  (await cookies()).set("sumbul_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get("sumbul_session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as unknown as SessionUser; } catch { return null; }
}

export async function requireUser(roles?: Role[]) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/sifre-degistir");
  if (roles && !roles.includes(user.role)) redirect("/yetkisiz");
  return user;
}

export const roleHome = (role: Role) => role === "COORDINATOR" || role === "ADMIN" ? "/coordinator/dashboard" : role === "COACH" ? "/coach/dashboard" : "/parent/dashboard";
