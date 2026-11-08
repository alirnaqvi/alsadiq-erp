import { getSettings } from "@/lib/queries";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import JoinForm from "./JoinForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const settings = await getSettings();
  const t = tx(await getLocale());
  const name = settings.org_name || "Al Sadiq Trust";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-8 sm:px-5 sm:py-10">
      <p className="eyebrow">{name}</p>
      <p className="urdu mt-1 w-fit text-sm text-gold">{t("trust.urduName")}</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary">{t("join.title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("join.lead")}</p>
      <div className="mt-8">
        <JoinForm />
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">
        {t("join.already")}{" "}
        <Link href="/m/login" className="font-semibold text-primary underline underline-offset-4">
          {t("common.signIn")}
        </Link>
      </p>
    </main>
  );
}
