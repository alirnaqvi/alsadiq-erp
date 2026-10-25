"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitDonorPayment, type PayState } from "../actions";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { HeadOption } from "@/lib/queries";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Submit payment"}
    </Button>
  );
}

export default function DonorPayForm({
  heads,
  extraNames,
}: {
  heads: HeadOption[];
  extraNames: string | null;
}) {
  const [state, action] = useActionState<PayState, FormData>(submitDonorPayment, {});
  const [slipUrl, setSlipUrl] = useState("");
  const [slipError, setSlipError] = useState<string | null>(null);

  const grouped = new Map<string, HeadOption[]>();
  for (const h of heads) {
    const key = h.parentName ?? "Other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(h);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipError(null);
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setSlipError("Please choose an image or PDF.");
      return;
    }
    if (file.size > 3_000_000) {
      setSlipError("Keep the proof under about 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSlipUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (state.ok) {
    return <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{state.ok}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slipUrl" value={slipUrl} />
      <Field label="Collection head" required>
        <Select name="headId" required defaultValue="">
          <option value="">Choose…</option>
          {[...grouped.entries()].map(([g, items]) => (
            <optgroup key={g} label={g}>
              {items.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Amount (Rs)" required>
        <Input name="amount" inputMode="numeric" required placeholder="0" />
      </Field>
      <Field label="Payment method">
        <Select name="paymentMethod" defaultValue="bank_transfer">
          <option value="bank_transfer">Bank transfer</option>
          <option value="online">Online</option>
          <option value="cash">Cash (already given at counter)</option>
          <option value="cheque">Cheque</option>
        </Select>
      </Field>
      <Field label="Attach proof" hint="Photo of the transfer slip or a PDF. Optional for cash.">
        <input type="file" accept="image/*,application/pdf" onChange={onFile} className="text-sm" />
        {slipUrl && <p className="mt-1 text-xs text-sabz-700">Proof attached.</p>}
        {slipError && <p className="mt-1 text-xs text-alert-700">{slipError}</p>}
      </Field>
      <Field label="Additional names on this receipt">
        <Input name="additionalNames" defaultValue={extraNames ?? ""} />
      </Field>
      <Field label="Note">
        <Textarea name="remarks" rows={2} />
      </Field>
      {state.error && (
        <p className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">{state.error}</p>
      )}
      <Save />
    </form>
  );
}
