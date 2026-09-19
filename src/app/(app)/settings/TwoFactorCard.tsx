"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { beginTotpSetup, confirmTotpSetup, disableTotp, type TwoFaState } from "./twofa-actions";
import { Button, Card, Field, Input } from "@/components/ui";
import QrCode from "@/components/QrCode";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export default function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<TwoFaState>({});
  const [confirm, confirmAction] = useActionState<TwoFaState, FormData>(confirmTotpSetup, {});
  const [off, offAction] = useActionState<TwoFaState, FormData>(disableTotp, {});

  const uri = confirm.uri || setup.uri;
  const secret = confirm.secret || setup.secret;

  return (
    <Card className="max-w-lg">
      <h2 className="mb-1 text-sm font-semibold text-ink-900">Two-factor authentication</h2>
      <p className="mb-4 text-sm text-ink-500">
        Staff logins can require a 6-digit code from Google Authenticator, Authy or similar.
        Super admins should turn this on.
      </p>

      {enabled && !uri ? (
        <form action={offAction} className="space-y-3">
          <p className="text-sm text-sabz-700">2FA is on for your account.</p>
          <Field label="Authenticator code to turn it off">
            <Input name="code" inputMode="numeric" maxLength={6} placeholder="123456" />
          </Field>
          {off.error && <p className="text-sm text-alert-700">{off.error}</p>}
          {off.ok && <p className="text-sm text-sabz-700">{off.ok}</p>}
          <Button type="submit" variant="danger">
            Turn 2FA off
          </Button>
        </form>
      ) : uri ? (
        <form action={confirmAction} className="space-y-4">
          <div className="flex justify-center">
            <QrCode data={uri} alt="Authenticator QR code" />
          </div>
          <p className="code break-all text-center text-xs text-ink-500">{secret}</p>
          <Field label="Enter the 6-digit code to confirm" required>
            <Input name="code" inputMode="numeric" maxLength={6} required autoFocus className="text-center tracking-[0.3em]" />
          </Field>
          {(confirm.error || setup.error) && (
            <p className="text-sm text-alert-700">{confirm.error || setup.error}</p>
          )}
          <Save label="Confirm and enable" />
        </form>
      ) : (
        <form
          action={async () => {
            const res = await beginTotpSetup();
            setSetup(res);
          }}
        >
          {off.ok && <p className="mb-3 text-sm text-sabz-700">{off.ok}</p>}
          <Button type="submit">Set up authenticator</Button>
        </form>
      )}
    </Card>
  );
}
