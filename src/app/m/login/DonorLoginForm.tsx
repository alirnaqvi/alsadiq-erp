"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { donorLogin, type DonorLoginState } from "../actions";
import { Button, Field, Input } from "@/components/ui";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export default function DonorLoginForm() {
  const [state, action] = useActionState<DonorLoginState, FormData>(donorLogin, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Mobile number" required>
        <Input name="mobile" inputMode="tel" required autoComplete="tel" placeholder="03001234567" />
      </Field>
      <Field label="PIN" required>
        <Input name="pin" type="password" inputMode="numeric" required autoComplete="current-password" />
      </Field>
      {state.error && (
        <p className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">{state.error}</p>
      )}
      <Save />
      <p className="text-center text-sm text-ink-500">
        New here?{" "}
        <Link href="/join" className="text-sabz-700 underline underline-offset-4">
          Request to register
        </Link>
      </p>
    </form>
  );
}
