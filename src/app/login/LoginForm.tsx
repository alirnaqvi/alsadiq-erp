"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, verifyLogin2fa, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [twoFa, twoFaAction] = useActionState<LoginState, FormData>(verifyLogin2fa, {});

  if (state.need2fa || twoFa.need2fa) {
    return (
      <form action={twoFaAction} className="mt-8 space-y-4">
        <p className="rounded-md border border-sabz-700/20 bg-sabz-100/60 px-3 py-2 text-sm text-ink-800">
          Enter the 6-digit code from your authenticator app.
        </p>
        <Field label="Authentication code" required>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="123456"
            maxLength={6}
            className="h-12 text-center text-lg tracking-[0.4em]"
          />
        </Field>
        {(twoFa.error || state.error) && (
          <p role="alert" className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">
            {twoFa.error || state.error}
          </p>
        )}
        <SubmitButton label="Verify and sign in" />
      </form>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Field label="Username" required>
        <Input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          placeholder="counter1"
        />
      </Field>

      <Field label="Password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton label="Sign in" />
    </form>
  );
}
