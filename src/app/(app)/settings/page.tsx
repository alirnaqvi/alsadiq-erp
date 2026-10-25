import { eq } from "drizzle-orm";
import { requirePermission, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { appOrigin } from "@/lib/tokens";
import { db } from "@/db";
import { users } from "@/db/schema";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader, Card } from "@/components/ui";
import SettingsForm from "./SettingsForm";
import TwoFactorCard from "./TwoFactorCard";
import QrCode from "@/components/QrCode";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePermission("settings.manage");
  const t = tx(await getLocale());
  const me = await requireUser();
  const settings = await getSettings();
  const origin = await appOrigin();
  const joinUrl = `${origin}/join`;

  const [row] = await db
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, me.id))
    .limit(1);

  return (
    <>
      <PageHeader
        eyebrow={t("group.setup")}
        title={t("pages.settings.title")}
        subtitle={t("pages.settings.subtitle")}
      />
      <div className="space-y-6">
        <SettingsForm settings={settings} />
        <TwoFactorCard enabled={Boolean(row?.totpEnabled)} />
        <Card className="max-w-lg">
          <h2 className="mb-1 text-sm font-semibold text-ink-900">Donor app registration</h2>
          <p className="mb-4 text-sm text-ink-500">
            New donors scan this QR or visit the link. Their request lands in App sign-ups for
            approval. {user.fullName.split(" ")[0]}, print this for the counter.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <QrCode data={joinUrl} alt="Donor registration QR" size={160} />
            <div>
              <p className="code break-all text-sm text-ink-800">{joinUrl}</p>
              <p className="mt-2 text-xs text-ink-500">
                After approval they sign in on their phone at {origin}/m
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
