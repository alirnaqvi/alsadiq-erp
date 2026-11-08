import { getDonorSession } from "@/lib/donor-auth";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { redirect } from "next/navigation";
import DonorLoginForm from "./DonorLoginForm";

export default async function DonorLoginPage() {
  if (await getDonorSession()) redirect("/m/home");
  const t = tx(await getLocale());
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-primary">{t("donorLogin.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("donorLogin.lead")}</p>
      <DonorLoginForm />
    </>
  );
}
