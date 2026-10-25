"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { donors } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { nextDonorCode } from "@/lib/sequence";
import { isValidMobile, normaliseMobile } from "@/lib/format";

export type DonorFormState = { error?: string; fieldErrors?: Record<string, string> };

function read(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    mobile: normaliseMobile(String(formData.get("mobile") ?? "")),
    altMobile: normaliseMobile(String(formData.get("altMobile") ?? "")),
    cnic: String(formData.get("cnic") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    profession: String(formData.get("profession") ?? "").trim(),
    bloodGroup: String(formData.get("bloodGroup") ?? "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
    legacyCode: String(formData.get("legacyCode") ?? "").trim(),
    sharesMobileWith: String(formData.get("sharesMobileWith") ?? "").trim(),
    additionalNames: String(formData.get("additionalNames") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function validate(v: ReturnType<typeof read>): Record<string, string> | null {
  const errors: Record<string, string> = {};
  if (v.fullName.length < 2) errors.fullName = "Enter the donor's full name.";
  if (!isValidMobile(v.mobile)) {
    errors.mobile = "Enter an 11-digit mobile number, like 03001234567.";
  }
  if (v.cnic && v.cnic.replace(/\D/g, "").length !== 13) {
    errors.cnic = "A CNIC has 13 digits. Leave it blank if you don't have it.";
  }
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    errors.email = "That email address doesn't look right.";
  }
  return Object.keys(errors).length ? errors : null;
}

export async function createDonor(
  _prev: DonorFormState,
  formData: FormData,
): Promise<DonorFormState> {
  const user = await assertPermission("donor.create");
  const v = read(formData);

  const errors = validate(v);
  if (errors) return { fieldErrors: errors };

  const [clash] = await db.select().from(donors).where(eq(donors.mobile, v.mobile)).limit(1);
  if (clash) {
    return {
      fieldErrors: {
        mobile: `${clash.fullName} (${clash.donorCode}) is already registered with this number.`,
      },
    };
  }

  const [created] = await db
    .insert(donors)
    .values({
      donorCode: await nextDonorCode(),
      fullName: v.fullName,
      mobile: v.mobile,
      altMobile: v.altMobile || null,
      cnic: v.cnic || null,
      email: v.email || null,
      address: v.address || null,
      city: v.city || null,
      profession: v.profession || null,
      bloodGroup: v.bloodGroup || null,
      dateOfBirth: v.dateOfBirth || null,
      legacyCode: v.legacyCode || null,
      sharesMobileWith: v.sharesMobileWith || null,
      additionalNames: v.additionalNames || null,
      notes: v.notes || null,
      createdById: user.id,
    })
    .returning();

  await logAction({
    actor: user,
    action: "create",
    entityType: "donor",
    entityId: created.id,
    summary: `Registered donor ${created.fullName} (${created.donorCode})`,
    after: created,
  });

  revalidatePath("/donors");
  redirect(`/donors/${created.id}`);
}

export async function updateDonor(
  _prev: DonorFormState,
  formData: FormData,
): Promise<DonorFormState> {
  const user = await assertPermission("donor.edit");
  const id = Number(formData.get("id"));
  const v = read(formData);

  const errors = validate(v);
  if (errors) return { fieldErrors: errors };

  const [before] = await db.select().from(donors).where(eq(donors.id, id)).limit(1);
  if (!before) return { error: "That donor no longer exists." };

  const [clash] = await db
    .select()
    .from(donors)
    .where(and(eq(donors.mobile, v.mobile), ne(donors.id, id)))
    .limit(1);
  if (clash) {
    return {
      fieldErrors: {
        mobile: `${clash.fullName} (${clash.donorCode}) already uses this number.`,
      },
    };
  }

  const [after] = await db
    .update(donors)
    .set({
      fullName: v.fullName,
      mobile: v.mobile,
      altMobile: v.altMobile || null,
      cnic: v.cnic || null,
      email: v.email || null,
      address: v.address || null,
      city: v.city || null,
      profession: v.profession || null,
      bloodGroup: v.bloodGroup || null,
      dateOfBirth: v.dateOfBirth || null,
      legacyCode: v.legacyCode || null,
      sharesMobileWith: v.sharesMobileWith || null,
      additionalNames: v.additionalNames || null,
      notes: v.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(donors.id, id))
    .returning();

  const changed = Object.keys(after).filter(
    (k) =>
      String(before[k as keyof typeof before] ?? "") !==
      String(after[k as keyof typeof after] ?? ""),
  );

  await logAction({
    actor: user,
    action: "update",
    entityType: "donor",
    entityId: id,
    summary: `Edited ${after.fullName} (${after.donorCode}) — changed ${
      changed.filter((c) => c !== "updatedAt").join(", ") || "nothing"
    }`,
    before,
    after,
  });

  revalidatePath(`/donors/${id}`);
  redirect(`/donors/${id}`);
}
