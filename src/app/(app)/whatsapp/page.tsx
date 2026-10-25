import { requirePermission } from "@/lib/auth";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/ui";
import { campaignRecipients } from "./actions";
import CampaignDesk from "./CampaignDesk";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  await requirePermission("whatsapp.send");
  const t = tx(await getLocale());
  const recipients = await campaignRecipients("all");

  return (
    <>
      <PageHeader
        eyebrow={t("pages.whatsapp.eyebrow")}
        title={t("pages.whatsapp.title")}
        subtitle="WhatsApp Business API is not connected yet. Campaigns open each donor chat on WhatsApp Web with the message filled in — the same way a volunteer would send by hand, only faster."
      />
      <CampaignDesk initial={{ audience: "all", recipients }} />
    </>
  );
}
