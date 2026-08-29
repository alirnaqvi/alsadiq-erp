import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import type { PermissionKey } from "./permissions";

const COOKIE = "alsadiq_session";
const MAX_AGE = 60 * 60 * 12; // a working day

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  roleKey: string;
  roleName: string;
  permissions: string[];
  dataScope: "own" | "team" | "all";
  managerId: number | null;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the logged-in user, or null. Never throws. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let uid: number;
  try {
    const { payload } = await jwtVerify(token, secret());
    uid = Number(payload.uid);
  } catch {
    return null;
  }

  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      isActive: users.isActive,
      managerId: users.managerId,
      roleId: roles.id,
      roleKey: roles.key,
      roleName: roles.name,
      permissions: roles.permissions,
      dataScope: roles.dataScope,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, uid))
    .limit(1);

  if (!row || !row.isActive) return null;

  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    roleId: row.roleId,
    roleKey: row.roleKey,
    roleName: row.roleName,
    permissions: row.permissions ?? [],
    dataScope: row.dataScope,
    managerId: row.managerId,
  };
}

/** Use at the top of every protected page and server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes(key)) redirect("/dashboard?denied=" + key);
  return user;
}

/** For server actions, where a redirect would swallow the reason. */
export async function assertPermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes(key)) {
    throw new Error(`Your role does not allow this action (${key}).`);
  }
  return user;
}
