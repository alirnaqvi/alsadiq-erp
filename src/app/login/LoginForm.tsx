"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

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

      <SubmitButton />
    </form>
  );
}
