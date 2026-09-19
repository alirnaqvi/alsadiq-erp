"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { donors, pledges, whatsappCampaigns } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { pkMonthBounds } from "@/lib/queries";
import { waNumber } from "@/lib/format";

export type Recipient = { id: number; name: string; mobile: string; wa: string };

export async function campaignRecipients(audience: string): Promise<Recipient[]> {
  await assertPermission("whatsapp.send");
  const { start, end } = pkMonthBounds();

  if (audience === "overdue") {
    const rows = await db
      .select({
        id: donors.id,
        name: donors.fullName,
        mobile: donors.mobile,
        monthly: pledges.monthlyAmount,
        paid: sql<string>`coalesce((
          select sum(amount) from donations
          where donations.donor_id = ${donors.id}
            and donations.status <> 'void'
            and donations.received_at >= ${start}
            and donations.received_at < ${end}
        ),0)`,
      })
      .from(pledges)
      .innerJoin(donors, eq(pledges.donorId, donors.id))
      .where(eq(pledges.isActive, true));
    return rows
      .filter((r) => Number(r.paid) < Number(r.monthly))
      .map((r) => ({ id: r.id, name: r.name, mobile: r.mobile, wa: waNumber(r.mobile) }));
  }

  if (audience === "members") {
    const rows = await db
      .select({ id: donors.id, name: donors.fullName, mobile: donors.mobile })
      .from(pledges)
      .innerJoin(donors, eq(pledges.donorId, donors.id))
      .where(eq(pledges.isActive, true));
    return rows.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile, wa: waNumber(r.mobile) }));
  }

  const rows = await db
    .select({ id: donors.id, name: donors.fullName, mobile: donors.mobile })
    .from(donors)
    .where(eq(donors.isActive, true));
  return rows.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile, wa: waNumber(r.mobile) }));
}

export type CampaignState = { error?: string; ok?: string; count?: number };

export async function saveCampaign(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const user = await assertPermission("whatsapp.send");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");
  if (!title || !body) return { error: "Give the message a title and a body." };

  const recipients = await campaignRecipients(audience);
  await db.insert(whatsappCampaigns).values({
    title,
    body,
    audience,
    recipientCount: recipients.length,
    createdById: user.id,
  });
  await logAction({
    actor: user,
    action: "create",
    entityType: "whatsapp_campaign",
    summary: `Prepared WhatsApp campaign "${title}" for ${recipients.length} donors (${audience})`,
  });
  revalidatePath("/whatsapp");
  return { ok: "Campaign saved. Use Send next to open each WhatsApp chat.", count: recipients.length };
}
