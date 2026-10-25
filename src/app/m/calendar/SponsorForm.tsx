"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { offerSponsorship, type SponsorState } from "./actions";
import { Button, Field, Input, Textarea } from "@/components/ui";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Offer to sponsor"}
    </Button>
  );
}

export default function SponsorForm({
  gatheringId,
  suggested,
}: {
  gatheringId: number;
  suggested: string | null;
}) {
  const [state, action] = useActionState<SponsorState, FormData>(offerSponsorship, {});
  if (state.ok) {
    return <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">{state.ok}</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="gatheringId" value={gatheringId} />
      <Field label="Amount you can sponsor (Rs)" required>
        <Input name="amount" inputMode="numeric" required defaultValue={suggested ?? ""} placeholder="0" />
      </Field>
      <Field label="Note">
        <Textarea name="message" rows={2} placeholder="I can cover langar / I prefer this date…" />
      </Field>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Save />
    </form>
  );
}
