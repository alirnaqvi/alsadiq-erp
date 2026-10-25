import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, PERMISSION_GROUPS, SCOPE_LABEL } from "@/lib/permissions";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/ui";
import RoleAdmin from "./RoleAdmin";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requirePermission("role.manage");
  const t = tx(await getLocale());

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
        eyebrow={t("group.setup")}
        title={t("pages.roles.title")}
        subtitle={t("pages.roles.subtitle")}
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
