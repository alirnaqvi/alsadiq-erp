"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertPermission, hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { teamIds } from "@/lib/queries";

export type UserState = { error?: string; ok?: string };

function randomPassword() {
  const words = ["Sadiq", "Najaf", "Karbala", "Kazmi", "Zainab", "Abbas"];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}@${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function saveUser(_prev: UserState, formData: FormData): Promise<UserState> {
  const actor = await assertPermission("user.manage");

  const id = Number(formData.get("id") ?? 0);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roleId = Number(formData.get("roleId") ?? 0);
  const managerId = Number(formData.get("managerId") ?? 0) || null;
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const postedAt = String(formData.get("postedAt") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Usernames use lowercase letters, numbers, dots, dashes or underscores." };
  }
  if (fullName.length < 2) return { error: "Enter the person's full name." };
  if (!roleId) return { error: "Choose a role." };
  if (id && managerId === id) return { error: "Someone cannot report to themselves." };

  // Prevent a reporting loop: a manager cannot be someone further down this
  // person's own chain.
  if (id && managerId) {
    const below = await teamIds(id);
    if (below.includes(managerId)) {
      return { error: "That person already reports to this user, so they cannot be the manager." };
    }
  }

  const [clash] = await db
    .select()
    .from(users)
    .where(id ? and(eq(users.username, username), ne(users.id, id)) : eq(users.username, username))
    .limit(1);
  if (clash) return { error: `The username "${username}" is already taken.` };

  if (id) {
    const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!before) return { error: "That user no longer exists." };

    const [after] = await db
      .update(users)
      .set({
        username,
        fullName,
        roleId,
        managerId,
        mobile: mobile || null,
        email: email || null,
        postedAt: postedAt || null,
      })
      .where(eq(users.id, id))
      .returning();

    await logAction({
      actor,
      action: "update",
      entityType: "user",
      entityId: id,
      summary: `Updated user ${after.fullName} (${after.username})`,
      before: { ...before, passwordHash: "***" },
      after: { ...after, passwordHash: "***" },
    });

    revalidatePath("/users");
    return { ok: "User updated." };
  }

  const plain = password || randomPassword();
  if (plain.length < 6) return { error: "The password needs at least 6 characters." };

  const [created] = await db
    .insert(users)
    .values({
      username,
      fullName,
      roleId,
      managerId,
      mobile: mobile || null,
      email: email || null,
      postedAt: postedAt || null,
      passwordHash: await hashPassword(plain),
      mustChangePassword: true,
    })
    .returning();

  await logAction({
    actor,
    action: "create",
    entityType: "user",
    entityId: created.id,
    summary: `Created user ${created.fullName} (${created.username})`,
    after: { ...created, passwordHash: "***" },
  });

  revalidatePath("/users");
  return { ok: `${fullName} can now sign in as "${username}" with the password ${plain}` };
}

export async function resetPassword(_prev: UserState, formData: FormData): Promise<UserState> {
  const actor = await assertPermission("user.manage");
  const id = Number(formData.get("id"));

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "That user no longer exists." };

  const plain = randomPassword();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(plain), mustChangePassword: true })
    .where(eq(users.id, id));

  await logAction({
    actor,
    action: "reset_password",
    entityType: "user",
    entityId: id,
    summary: `Reset the password for ${target.fullName} (${target.username})`,
  });

  revalidatePath("/users");
  return { ok: `New password for ${target.fullName}: ${plain}` };
}

export async function toggleUser(formData: FormData) {
  const actor = await assertPermission("user.manage");
  const id = Number(formData.get("id"));
  if (id === actor.id) return;

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before) return;

  const [after] = await db
    .update(users)
    .set({ isActive: !before.isActive })
    .where(eq(users.id, id))
    .returning();

  await logAction({
    actor,
    action: "update",
    entityType: "user",
    entityId: id,
    summary: `${after.isActive ? "Restored" : "Deactivated"} ${after.fullName} (${after.username})`,
  });

  revalidatePath("/users");
}

/** Anyone can change their own password from Settings. */
export async function changeOwnPassword(_prev: UserState, formData: FormData): Promise<UserState> {
  const { getSession, verifyPassword } = await import("@/lib/auth");
  const me = await getSession();
  if (!me) return { error: "Sign in again to change your password." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "Use at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords do not match." };

  const [row] = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { error: "Your current password is not correct." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false })
    .where(eq(users.id, me.id));

  await logAction({
    actor: me,
    action: "change_password",
    entityType: "user",
    entityId: me.id,
    summary: `${me.fullName} changed their own password`,
  });

  return { ok: "Password changed." };
}
