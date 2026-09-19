"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import {
  createSession,
  createPending2fa,
  getPending2fa,
  clearPending2fa,
  destroySession,
  verifyPassword,
  getSession,
} from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { logAction } from "@/lib/audit";

export type LoginState = { error?: string; need2fa?: boolean };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const [row] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      totpEnabled: users.totpEnabled,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.username, username))
    .limit(1);

  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    await logAction({
      actor: null,
      action: "login_failed",
      entityType: "user",
      summary: `Failed sign-in attempt for "${username}"`,
    });
    return { error: "That username and password do not match." };
  }

  if (!row.isActive) {
    return { error: "This account has been deactivated. Ask an administrator to restore it." };
  }

  if (row.totpEnabled) {
    await createPending2fa(row.id);
    return { need2fa: true };
  }

  await finishLogin(row.id, row.fullName, row.roleName);
  redirect("/dashboard");
}

export async function verifyLogin2fa(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "");
  const uid = await getPending2fa();
  if (!uid) return { error: "That sign-in expired. Enter your password again." };

  const [row] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, uid))
    .limit(1);

  if (!row?.totpEnabled || !row.totpSecret || !verifyTotp(row.totpSecret, code)) {
    await logAction({
      actor: { id: row?.id ?? uid, fullName: row?.fullName ?? "unknown" },
      action: "login_failed",
      entityType: "user",
      summary: "Failed 2FA challenge",
    });
    return { need2fa: true, error: "That code is not valid. Try the next one from your authenticator." };
  }

  await clearPending2fa();
  await finishLogin(row.id, row.fullName, row.roleName);
  redirect("/dashboard");
}

async function finishLogin(id: number, fullName: string, roleName: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  await createSession(id);
  await logAction({
    actor: { id, fullName },
    action: "login",
    entityType: "user",
    entityId: id,
    summary: `${fullName} signed in as ${roleName}`,
  });
}

export async function logout() {
  const user = await getSession();
  if (user) {
    await logAction({
      actor: user,
      action: "logout",
      entityType: "user",
      entityId: user.id,
      summary: `${user.fullName} signed out`,
    });
  }
  await destroySession();
  redirect("/login");
}
