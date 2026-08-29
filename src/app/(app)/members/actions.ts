"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pledges, donors } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { money, normaliseMobile } from "@/lib/format";

export type PledgeState = { error?: string; ok?: string };

export async function savePledge(_prev: PledgeState, formData: FormData): Promise<PledgeState> {
  const user = await assertPermission("member.manage");

  const mobile = normaliseMobile(String(formData.get("mobile") ?? ""));
  const monthlyAmount = Number(formData.get("monthlyAmount") ?? 0);
  const headId = Number(formData.get("headId") ?? 0) || null;
  const dueDay = Math.min(28, Math.max(1, Number(formData.get("dueDay") ?? 5)));

  if (!(monthlyAmount > 0)) return { error: "Enter the monthly amount they have committed." };

  const [donor] = await db.select().from(donors).where(eq(donors.mobile, mobile)).limit(1);
  if (!donor) {
    return {
      error: "No donor has that mobile number. Register them first, then add the membership.",
    };
  }

  const [existing] = await db.select().from(pledges).where(eq(pledges.donorId, donor.id)).limit(1);

  if (existing) {
    const [after] = await db
      .update(pledges)
      .set({
        monthlyAmount: monthlyAmount.toFixed(2),
        headId,
        dueDay,
        isActive: true,
      })
      .where(eq(pledges.id, existing.id))
      .returning();

    await logAction({
      actor: user,
      action: "update",
      entityType: "pledge",
      entityId: existing.id,
      summary: `Updated ${donor.fullName}'s monthly pledge to Rs ${money(monthlyAmount)}`,
      before: existing,
      after,
    });
    revalidatePath("/members");
    return { ok: `${donor.fullName}'s pledge updated.` };
  }

  const [created] = await db
    .insert(pledges)
    .values({
      donorId: donor.id,
      monthlyAmount: monthlyAmount.toFixed(2),
      headId,
      dueDay,
      startedOn: new Date().toISOString().slice(0, 10),
      createdById: user.id,
    })
    .returning();

  await logAction({
    actor: user,
    action: "create",
    entityType: "pledge",
    entityId: created.id,
    summary: `${donor.fullName} committed Rs ${money(monthlyAmount)} a month`,
    after: created,
  });

  revalidatePath("/members");
  return { ok: `${donor.fullName} added as a monthly member.` };
}

export async function togglePledge(formData: FormData) {
  const user = await assertPermission("member.manage");
  const id = Number(formData.get("id"));

  const [before] = await db.select().from(pledges).where(eq(pledges.id, id)).limit(1);
  if (!before) return;

  const [after] = await db
    .update(pledges)
    .set({ isActive: !before.isActive })
    .where(eq(pledges.id, id))
    .returning();

  await logAction({
    actor: user,
    action: "update",
    entityType: "pledge",
    entityId: id,
    summary: `${after.isActive ? "Reactivated" : "Paused"} a monthly membership`,
    before,
    after,
  });

  revalidatePath("/members");
}
