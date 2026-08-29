import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import UserAdmin from "./UserAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requirePermission("user.manage");

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      mobile: users.mobile,
      email: users.email,
      postedAt: users.postedAt,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      managerId: users.managerId,
      roleId: users.roleId,
      roleName: roles.name,
      roleLevel: roles.level,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(asc(roles.level), asc(users.fullName));

  const roleRows = await db.select().from(roles).orderBy(asc(roles.level));

  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Users"
        subtitle="Who can sign in, what they may do, and who reviews their collection."
      />
      <UserAdmin
        users={rows.map((r) => ({ ...r, lastLoginAt: r.lastLoginAt?.toISOString() ?? null }))}
        roles={roleRows.map((r) => ({ id: r.id, name: r.name, dataScope: r.dataScope }))}
        currentUserId={me.id}
      />
    </>
  );
}
