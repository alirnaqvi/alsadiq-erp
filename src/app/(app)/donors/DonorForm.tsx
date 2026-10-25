"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createDonor, updateDonor, type DonorFormState } from "./actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { CITIES } from "@/lib/cities";
import { BLOOD_GROUPS } from "@/lib/blood-groups";

type Donor = {
  id: number;
  fullName: string;
  mobile: string;
  altMobile: string | null;
  cnic: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  profession: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  legacyCode: string | null;
  sharesMobileWith: string | null;
  additionalNames: string | null;
  notes: string | null;
};

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export default function DonorForm({ donor }: { donor?: Donor }) {
  const action = donor ? updateDonor : createDonor;
  const [state, formAction] = useActionState<DonorFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {donor && <input type="hidden" name="id" value={donor.id} />}

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Who is giving</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required className="sm:col-span-2">
            <Input name="fullName" defaultValue={donor?.fullName} required autoFocus />
          </Field>
          {fe.fullName && <p className="-mt-3 text-sm text-alert-700 sm:col-span-2">{fe.fullName}</p>}

          <Field
            label="Mobile number"
            required
            hint="This is the donor's unique identity. No two donors can share it."
          >
            <Input
              name="mobile"
              defaultValue={donor?.mobile}
              inputMode="tel"
              placeholder="03001234567"
              required
            />
          </Field>
          <Field label="Alternate number">
            <Input name="altMobile" defaultValue={donor?.altMobile ?? ""} inputMode="tel" />
          </Field>
          {fe.mobile && <p className="-mt-3 text-sm text-alert-700 sm:col-span-2">{fe.mobile}</p>}

          <Field
            label="Shared number belongs to"
            hint="Use when a family gives under one number — name the person who holds the phone."
            className="sm:col-span-2"
          >
            <Input name="sharesMobileWith" defaultValue={donor?.sharesMobileWith ?? ""} />
          </Field>
          {donor && (
            <Field
              label="Additional names on receipts"
              hint="Family members or other names to print on receipts."
              className="sm:col-span-2"
            >
              <Input
                name="additionalNames"
                defaultValue={donor.additionalNames ?? ""}
                placeholder="Syeda Fatima, Ali Abbas"
              />
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Optional details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CNIC">
            <Input
              name="cnic"
              defaultValue={donor?.cnic ?? ""}
              placeholder="42101-1234567-8"
              inputMode="numeric"
            />
          </Field>
          {fe.cnic && <p className="-mt-3 text-sm text-alert-700">{fe.cnic}</p>}
          <Field label="Email">
            <Input name="email" type="email" defaultValue={donor?.email ?? ""} />
          </Field>
          {fe.email && <p className="-mt-3 text-sm text-alert-700">{fe.email}</p>}
          <Field label="City">
            <Select name="city" defaultValue={donor?.city ?? ""}>
              <option value="">Choose city…</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Membership #"
            hint="The number from the previous register, e.g. AS-601."
          >
            <Input name="legacyCode" defaultValue={donor?.legacyCode ?? ""} placeholder="AS-601" />
          </Field>
          <Field label="Profession">
            <Input name="profession" defaultValue={donor?.profession ?? ""} />
          </Field>
          <Field label="Blood group">
            <Select name="bloodGroup" defaultValue={donor?.bloodGroup ?? ""}>
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" defaultValue={donor?.dateOfBirth ?? ""} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input name="address" defaultValue={donor?.address ?? ""} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea name="notes" rows={3} defaultValue={donor?.notes ?? ""} />
          </Field>
        </div>
      </Card>

      {state.error && (
        <p role="alert" className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">
          {state.error}
        </p>
      )}

      <Save label={donor ? "Save changes" : "Register donor"} />
    </form>
  );
}
