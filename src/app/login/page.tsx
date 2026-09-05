import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hijri, longDate } from "@/lib/format";
import { getSettings } from "@/lib/queries";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  const now = new Date();
  const settings = await getSettings();

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* Identity panel */}
      <div className="relative flex flex-col justify-between bg-ink-950 px-8 py-10 text-white lg:w-[42%] lg:px-14 lg:py-14">
        <div>
          {settings.org_logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.org_logo} alt="" className="mb-4 h-12 w-12 object-contain" />
          )}
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-600">
            {settings.org_name || "Al Sadiq Trust"}
          </p>
          <h1 className="mt-6 max-w-sm text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Collection &amp; receipting system
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">
            Every rupee received is recorded against a donor, a head, and the person who
            collected it.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 text-sm lg:mt-0">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.09em] text-ink-500">Today</dt>
            <dd className="tnum mt-1 text-white">{longDate(now)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.09em] text-ink-500">Hijri</dt>
            <dd className="tnum mt-1 text-brass-600">{hijri(now)}</dd>
          </div>
        </dl>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">
            Use the account your administrator gave you.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
