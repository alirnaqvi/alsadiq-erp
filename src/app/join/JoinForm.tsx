"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitRegistration, type JoinState } from "./actions";
import { Button, Field, Input } from "@/components/ui";
import Link from "next/link";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send verification request"}
    </Button>
  );
}

export default function JoinForm() {
  const [state, action] = useActionState<JoinState, FormData>(submitRegistration, {});

  if (state.ok) {
    return (
      <div className="rounded-lg border border-sabz-700/25 bg-sabz-100/70 p-5 text-sm text-ink-800">
        <p className="font-medium text-sabz-700">Request received</p>
        <p className="mt-2">{state.ok}</p>
        <Link href="/m/login" className="mt-4 inline-block text-sabz-700 underline underline-offset-4">
          Go to donor sign-in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" required>
        <Input name="fullName" required autoComplete="name" />
      </Field>
      <Field label="Mobile number" required hint="This is your unique ID with the trust.">
        <Input name="mobile" required inputMode="tel" placeholder="03001234567" autoComplete="tel" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" />
      </Field>
      <Field label="CNIC">
        <Input name="cnic" inputMode="numeric" placeholder="42101-1234567-8" />
      </Field>
      <Field label="City">
        <Input name="city" />
      </Field>
      <Field label="Address">
        <Input name="address" />
      </Field>
      <Field label="Additional names on receipts" hint="Family members who should appear on receipts.">
        <Input name="additionalNames" placeholder="Syeda Fatima, Ali Abbas" />
      </Field>
      <Field label="App PIN (4–8 digits)" required>
        <Input name="pin" type="password" inputMode="numeric" required autoComplete="new-password" />
      </Field>
      <Field label="Repeat PIN" required>
        <Input name="confirm" type="password" inputMode="numeric" required autoComplete="new-password" />
      </Field>
      {state.error && (
        <p className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">{state.error}</p>
      )}
      <Save />
    </form>
  );
}
