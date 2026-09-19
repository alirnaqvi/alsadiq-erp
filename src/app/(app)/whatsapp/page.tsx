import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { campaignRecipients } from "./actions";
import CampaignDesk from "./CampaignDesk";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  await requirePermission("whatsapp.send");
  const recipients = await campaignRecipients("all");

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Bulk WhatsApp"
        subtitle="Write one message, then send it to every donor in the chosen list. Each chat opens with the text already filled — press send in WhatsApp."
      />
      <CampaignDesk initial={{ audience: "all", recipients }} />
    </>
  );
}
