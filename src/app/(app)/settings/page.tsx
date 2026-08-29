import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Trust settings"
        subtitle="These details print at the top and bottom of every receipt."
      />
      <div className="max-w-2xl">
        <SettingsForm settings={settings} />
      </div>
    </>
  );
}
