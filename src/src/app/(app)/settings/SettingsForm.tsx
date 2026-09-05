"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettings, type SettingsState } from "./actions";
import { changeOwnPassword, type UserState } from "../users/actions";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import ReceiptStrip from "@/components/ReceiptStrip";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export default function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [pw, pwAction] = useActionState<UserState, FormData>(changeOwnPassword, {});

  const [org, setOrg] = useState({
    name: settings.org_name ?? "",
    tagline: settings.org_tagline ?? "",
    address: settings.org_address ?? "",
    phone: settings.org_phone ?? "",
    footer: settings.receipt_footer ?? "",
    logo: settings.org_logo ?? "",
  });
  const [logoError, setLogoError] = useState<string | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > 300_000) {
      setLogoError("That image is too large — please use a file under ~200KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOrg((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form action={formAction} className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-ink-900">Trust details</h2>
            <div className="space-y-4">
              <Field label="Logo" hint="Shown on printed and WhatsApp receipts. Square images work best, under ~200KB.">
                <div className="flex items-center gap-4">
                  {org.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.logo}
                      alt="Trust logo"
                      className="h-16 w-16 rounded-md border border-ink-200 object-contain bg-white"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
                  />
                </div>
                <input type="hidden" name="org_logo" value={org.logo} />
                {logoError && <p className="mt-1 text-sm text-alert-700">{logoError}</p>}
              </Field>
              <Field label="Name" required>
                <Input
                  name="org_name"
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Line under the name">
                <Input
                  name="org_tagline"
                  value={org.tagline}
                  onChange={(e) => setOrg({ ...org, tagline: e.target.value })}
                  placeholder="Registered Welfare Trust"
                />
              </Field>
              <Field label="Address">
                <Input
                  name="org_address"
                  value={org.address}
                  onChange={(e) => setOrg({ ...org, address: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  name="org_phone"
                  value={org.phone}
                  onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                />
              </Field>
              <Field label="Footer message" hint="Printed at the bottom of every receipt.">
                <Textarea
                  name="receipt_footer"
                  rows={2}
                  value={org.footer}
                  onChange={(e) => setOrg({ ...org, footer: e.target.value })}
                />
              </Field>
            </div>

            {state.error && <p className="mt-3 text-sm text-alert-700">{state.error}</p>}
            {state.ok && <p className="mt-3 text-sm text-sabz-700">{state.ok}</p>}

            <div className="mt-4">
              <Save label="Save settings" />
            </div>
          </Card>
        </form>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="eyebrow mb-2">How receipts will look</p>
          <ReceiptStrip
            data={{
              org,
              receiptNo: "R2026-00123",
              receivedAt: new Date(),
              donorName: "Syed Mohammad Abbas",
              donorCode: "ASD-00042",
              mobile: "03001234567",
              headName: "10th Muharram (Ashura)",
              parentName: "Majlis",
              amount: 5000,
              paymentMethod: "cash",
              collector: "Counter staff",
              status: "completed",
            }}
          />
        </div>
      </div>

      <Card className="max-w-lg">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Change your password</h2>
        <form action={pwAction} className="space-y-4">
          <Field label="Current password" required>
            <Input name="current" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="New password" required hint="At least 8 characters.">
            <Input name="next" type="password" required autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password" required>
            <Input name="confirm" type="password" required autoComplete="new-password" />
          </Field>
          {pw.error && <p className="text-sm text-alert-700">{pw.error}</p>}
          {pw.ok && <p className="text-sm text-sabz-700">{pw.ok}</p>}
          <Save label="Change password" />
        </form>
      </Card>
    </div>
  );
}
