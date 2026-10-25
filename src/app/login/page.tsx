import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hijri, longDate } from "@/lib/format";
import { getSettings } from "@/lib/queries";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { StarDivider } from "@/components/ui";
import LanguageToggle from "@/components/LanguageToggle";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  const now = new Date();
  const settings = await getSettings();
  const t = tx(await getLocale());
  const name = settings.org_name || "Al Sadiq Trust";
  const mark = settings.org_logo || "/logo.png";

  return (
    <main className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-primary-deep px-5 py-8 text-primary-foreground sm:px-8 sm:py-10 lg:w-[42%] lg:px-14 lg:py-14">
        <Star watermark />
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mark}
            alt=""
            className="mb-5 h-12 w-12 rounded-full bg-primary-foreground object-contain p-0.5"
          />
          <p className="eyebrow">{name}</p>
          <p className="urdu mt-2 w-fit text-gold">{t("trust.urduName")}</p>
          <h1 className="mt-5 max-w-sm font-display text-3xl font-bold leading-tight tracking-tight sm:mt-6 sm:text-4xl">
            {t("login.heroTitle")}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            {t("login.heroBody")}
          </p>
          <StarDivider className="mt-8 justify-start" />
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-primary-foreground/15 pt-6 text-sm lg:mt-0">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gold">{t("login.today")}</dt>
            <dd className="tnum mt-1 font-display text-lg font-bold text-primary-foreground">
              {longDate(now)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gold">{t("login.hijri")}</dt>
            <dd className="tnum mt-1 font-display text-lg font-bold text-gold">{hijri(now)}</dd>
          </div>
        </dl>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="absolute end-5 top-5 sm:end-8 sm:top-8">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold tracking-tight text-primary">{t("login.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.lead")}</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

function Star({ watermark }: { watermark?: boolean }) {
  if (!watermark) return null;
  return (
    <svg
      viewBox="-11 -11 22 22"
      className="pointer-events-none absolute -end-10 -top-8 size-56 text-gold/10"
      aria-hidden
    >
      <polygon
        points="0,-11 1.68,-4.07 7.78,-7.78 4.07,-1.68 11,0 4.07,1.68 7.78,7.78 1.68,4.07 0,11 -1.68,4.07 -7.78,7.78 -4.07,1.68 -11,0 -4.07,-1.68 -7.78,-7.78 -1.68,-4.07"
        fill="currentColor"
      />
    </svg>
  );
}
