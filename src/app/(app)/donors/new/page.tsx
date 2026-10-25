import { requirePermission } from "@/lib/auth";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/ui";
import DonorForm from "../DonorForm";

export default async function NewDonorPage() {
  await requirePermission("donor.create");
  const t = tx(await getLocale());
  return (
    <>
      <PageHeader
        eyebrow={t("pages.donors.eyebrow")}
        title={t("pages.donorsNew.title")}
        subtitle={t("pages.donorsNew.subtitle")}
      />
      <div className="max-w-2xl">
        <DonorForm />
      </div>
    </>
  );
}
