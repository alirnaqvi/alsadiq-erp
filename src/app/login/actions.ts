"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { createSession, destroySession, verifyPassword, getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export type LoginState = { error?: string };

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
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.username, username))
    .limit(1);

  // Same message either way — it should not reveal which usernames exist.
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

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));
  await createSession(row.id);
  await logAction({
    actor: { id: row.id, fullName: row.fullName },
    action: "login",
    entityType: "user",
    entityId: row.id,
    summary: `${row.fullName} signed in as ${row.roleName}`,
  });

  redirect("/dashboard");
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
