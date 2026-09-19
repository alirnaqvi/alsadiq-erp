"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorRegistrations, donors } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { nextDonorCode } from "@/lib/sequence";

export async function decideRegistration(formData: FormData) {
  const user = await assertPermission("donor.verify");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  const [row] = await db.select().from(donorRegistrations).where(eq(donorRegistrations.id, id)).limit(1);
  if (!row || row.status !== "pending") return;

  if (decision !== "approved") {
    await db
      .update(donorRegistrations)
      .set({
        status: "rejected",
        reviewedById: user.id,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      })
      .where(eq(donorRegistrations.id, id));
    await logAction({
      actor: user,
      action: "update",
      entityType: "donor_registration",
      entityId: id,
      summary: `Rejected donor-app request from ${row.fullName} (${row.mobile})`,
    });
    revalidatePath("/verifications");
    return;
  }

  const [existing] = await db.select().from(donors).where(eq(donors.mobile, row.mobile)).limit(1);
  let donor = existing;
  if (!donor) {
    const [created] = await db
      .insert(donors)
      .values({
        donorCode: await nextDonorCode(),
        fullName: row.fullName,
        mobile: row.mobile,
        email: row.email,
        cnic: row.cnic,
        address: row.address,
        city: row.city,
        additionalNames: row.additionalNames,
        appPinHash: row.pinHash,
        createdById: user.id,
      })
      .returning();
    donor = created;
    await logAction({
      actor: user,
      action: "create",
      entityType: "donor",
      entityId: created.id,
      summary: `Approved app registration — added ${created.fullName} (${created.donorCode})`,
      after: created,
    });
  } else {
    await db
      .update(donors)
      .set({
        appPinHash: row.pinHash,
        email: row.email || existing.email,
        additionalNames: row.additionalNames || existing.additionalNames,
        updatedAt: new Date(),
      })
      .where(eq(donors.id, existing.id));
    await logAction({
      actor: user,
      action: "update",
      entityType: "donor",
      entityId: existing.id,
      summary: `Linked donor-app login to existing ${existing.fullName} (${existing.donorCode})`,
    });
  }

  await db
    .update(donorRegistrations)
    .set({
      status: "approved",
      reviewedById: user.id,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      donorId: donor.id,
    })
    .where(eq(donorRegistrations.id, id));

  revalidatePath("/verifications");
  revalidatePath("/donors");
}
