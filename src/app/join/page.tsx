import { getSettings } from "@/lib/queries";
import JoinForm from "./JoinForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const settings = await getSettings();
  const name = settings.org_name || "Al Sadiq Trust";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-8 sm:px-5 sm:py-10">
      <p className="eyebrow">{name}</p>
      <p className="urdu mt-1 w-fit text-sm text-gold">الصادق ٹرسٹ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary">Become a donor</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Fill in your details. The trust will review the request. After approval you can see your
        ledger and send payments from the donor app.
      </p>
      <div className="mt-8">
        <JoinForm />
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">
        Already approved?{" "}
        <Link href="/m/login" className="font-semibold text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
