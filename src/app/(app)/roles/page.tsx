import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, PERMISSION_GROUPS, SCOPE_LABEL } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import RoleAdmin from "./RoleAdmin";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requirePermission("role.manage");

  const rows = await db
    .select({
      id: roles.id,
      key: roles.key,
      name: roles.name,
      description: roles.description,
      level: roles.level,
      dataScope: roles.dataScope,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
      holders: sql<number>`(select count(*) from users where users.role_id = ${roles.id})`,
    })
    .from(roles)
    .orderBy(asc(roles.level));

  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Roles and permissions"
        subtitle="A role is a set of permissions plus how much collection data its holders can see."
      />
      <RoleAdmin
        roles={rows}
        permissions={PERMISSIONS.map((p) => ({ ...p }))}
        groups={PERMISSION_GROUPS}
        scopeLabels={SCOPE_LABEL}
      />
    </>
  );
}
