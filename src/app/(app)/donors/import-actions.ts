"use server";

import { revalidatePath } from "next/cache";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { donors } from "@/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth";

async function requireImportUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes("donor.import") && !user.permissions.includes("donor.create")) {
    throw new Error("Your role does not allow this action (donor.import).");
  }
  return user;
}
import { logAction } from "@/lib/audit";
import { nextDonorCode } from "@/lib/sequence";
import { parseDonorWorkbook, type ImportRow } from "@/lib/donor-import";
import { isValidMobile } from "@/lib/format";

export type ImportPreview = {
  error?: string;
  sheets?: string[];
  ready?: ImportRow[];
  skipped?: { row: number; sheet: string; reason: string }[];
};

export type ImportCommit = {
  error?: string;
  created?: number;
  skippedExisting?: number;
  failed?: number;
};

export async function previewDonorImport(
  _prev: ImportPreview,
  formData: FormData,
): Promise<ImportPreview> {
  await requireImportUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an Excel file (.xlsx)." };
  }
  if (file.size > 8_000_000) {
    return { error: "That file is too large. Please keep it under 8MB." };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return { error: "Please upload an .xlsx file." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseDonorWorkbook(buffer);
    if (parsed.rows.length === 0) {
      return {
        error: "No usable donor rows were found. Check that the sheet has a name and a mobile number.",
        sheets: parsed.sheets,
        skipped: parsed.skipped,
      };
    }
    return {
      sheets: parsed.sheets,
      ready: parsed.rows,
      skipped: parsed.skipped,
    };
  } catch (e) {
    console.error(e);
    return { error: "The file could not be read. Save it again as .xlsx and retry." };
  }
}

export async function commitDonorImport(
  _prev: ImportCommit,
  formData: FormData,
): Promise<ImportCommit> {
  const user = await requireImportUser();
  const raw = String(formData.get("payload") ?? "");
  if (!raw) return { error: "Nothing to import. Preview the file again." };
  let rows: ImportRow[] = [];
  try {
    rows = JSON.parse(raw) as ImportRow[];
  } catch {
    return { error: "The preview expired. Upload the file again." };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No rows to import." };

  let created = 0;
  let skippedExisting = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.fullName || !isValidMobile(row.mobile)) {
      failed += 1;
      continue;
    }
    const clash = await db
      .select({ id: donors.id })
      .from(donors)
      .where(
        row.membershipNo
          ? or(eq(donors.mobile, row.mobile), eq(donors.donorCode, row.membershipNo))
          : eq(donors.mobile, row.mobile),
      )
      .limit(1);
    if (clash.length) {
      skippedExisting += 1;
      continue;
    }

    let donorCode = row.membershipNo?.replace(/\s+/g, "").toUpperCase() || "";
    if (donorCode) {
      const [taken] = await db.select({ id: donors.id }).from(donors).where(eq(donors.donorCode, donorCode)).limit(1);
      if (taken) donorCode = "";
    }
    if (!donorCode) donorCode = await nextDonorCode();

    try {
      const [createdRow] = await db
        .insert(donors)
        .values({
          donorCode,
          legacyCode: row.membershipNo && row.membershipNo.toUpperCase() !== donorCode ? row.membershipNo : row.membershipNo,
          fullName: row.fullName,
          mobile: row.mobile,
          cnic: row.cnic,
          email: row.email,
          address: row.address,
          city: row.city,
          profession: row.profession,
          bloodGroup: row.bloodGroup,
          dateOfBirth: row.dateOfBirth,
          priorTotal: row.amount ? row.amount.toFixed(2) : "0",
          notes: row.amount ? `Imported register total Rs ${row.amount}.` : null,
          createdById: user.id,
        })
        .returning();
      created += 1;
      await logAction({
        actor: user,
        action: "create",
        entityType: "donor",
        entityId: createdRow.id,
        summary: `Imported donor ${createdRow.fullName} (${createdRow.donorCode}) from Excel`,
      });
    } catch (e) {
      console.error(e);
      failed += 1;
    }
  }

  revalidatePath("/donors");
  return { created, skippedExisting, failed };
}
