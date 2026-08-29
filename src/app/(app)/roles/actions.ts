"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export type RoleState = { error?: string; ok?: string };

export async function saveRole(_prev: RoleState, formData: FormData): Promise<RoleState> {
  const actor = await assertPermission("role.manage");

  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const level = Number(formData.get("level") ?? 50);
  const dataScope = String(formData.get("dataScope") ?? "own") as "own" | "team" | "all";
  const permissions = formData
    .getAll("permissions")
    .map(String)
    .filter((p) => (ALL_PERMISSIONS as string[]).includes(p));

  if (name.length < 2) return { error: "Give the role a name." };

  if (id) {
    const [before] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!before) return { error: "That role no longer exists." };

    // The admin role must keep the ability to manage roles, or the system
    // locks everyone out of its own settings.
    if (before.key === "admin" && !permissions.includes("role.manage")) {
      return {
        error:
          "The Administrator role has to keep 'Manage roles and permissions', otherwise nobody can change them again.",
      };
    }

    const [after] = await db
      .update(roles)
      .set({ name, description, level, dataScope, permissions })
      .where(eq(roles.id, id))
      .returning();

    await logAction({
      actor,
      action: "update",
      entityType: "role",
      entityId: id,
      summary: `Updated role "${after.name}" — ${permissions.length} permissions, scope ${dataScope}`,
      before,
      after,
    });

    revalidatePath("/roles");
    return { ok: "Role updated." };
  }

  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
  const [existing] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
  if (existing) return { error: `A role called "${name}" already exists.` };

  const [after] = await db
    .insert(roles)
    .values({ key, name, description, level, dataScope, permissions })
    .returning();

  await logAction({
    actor,
    action: "create",
    entityType: "role",
    entityId: after.id,
    summary: `Created role "${after.name}"`,
    after,
  });

  revalidatePath("/roles");
  return { ok: "Role created." };
}

export async function deleteRole(formData: FormData) {
  const actor = await assertPermission("role.manage");
  const id = Number(formData.get("id"));

  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.isSystem) return;

  const holders = await db.select({ id: users.id }).from(users).where(eq(users.roleId, id));
  if (holders.length > 0) return;

  await db.delete(roles).where(eq(roles.id, id));
  await logAction({
    actor,
    action: "delete",
    entityType: "role",
    entityId: id,
    summary: `Deleted role "${role.name}"`,
    before: role,
  });

  revalidatePath("/roles");
}
