import { getSettings } from "@/lib/queries";
import JoinForm from "./JoinForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const settings = await getSettings();
  const name = settings.org_name || "Al Sadiq Trust";

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-600">{name}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">Become a donor</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Fill in your details. The trust will review the request. After approval you can see your
        ledger and send payments from the donor app.
      </p>
      <div className="mt-8">
        <JoinForm />
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">
        Already approved?{" "}
        <Link href="/m/login" className="text-sabz-700 underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
