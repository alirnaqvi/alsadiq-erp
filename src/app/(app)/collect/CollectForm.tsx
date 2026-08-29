"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { lookupDonor, recordDonation, type CollectState, type DonorHit } from "./actions";
import ReceiptStrip from "@/components/ReceiptStrip";
import { Button, Card, Field, Input, Select, Textarea, Badge, cx } from "@/components/ui";
import { isValidMobile, longDate, money, normaliseMobile } from "@/lib/format";
import type { HeadOption } from "@/lib/queries";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "bank_transfer", label: "Bank transfer" },
  { key: "cheque", label: "Cheque" },
  { key: "online", label: "Online" },
] as const;

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      {pending ? "Saving…" : "Save and print receipt"}
    </Button>
  );
}

export default function CollectForm({
  heads,
  org,
  collector,
  initialTerm = "",
}: {
  heads: HeadOption[];
  org: { name: string; tagline: string; address: string; phone: string; footer: string };
  collector: string;
  initialTerm?: string;
}) {
  const [state, formAction] = useActionState<CollectState, FormData>(recordDonation, {});

  const [term, setTerm] = useState(initialTerm);
  // Results are stored with the term they belong to, so a stale lookup can
  // never be shown against a number the operator has since changed.
  const [result, setResult] = useState<{
    term: string;
    exact: DonorHit | null;
    matches: DonorHit[];
  } | null>(null);
  const [isSearching, startSearch] = useTransition();

  const [newName, setNewName] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [headId, setHeadId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [slipRef, setSlipRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isMembership, setIsMembership] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const mobile = normaliseMobile(term);
  const fresh = result?.term === term.trim() ? result : null;
  const donor = fresh?.exact ?? null;
  const matches = fresh?.matches ?? [];
  const searched = Boolean(fresh);
  const isNewDonor = searched && !donor && isValidMobile(mobile);

  const groupedHeads = useMemo(() => {
    const groups = new Map<string, HeadOption[]>();
    for (const h of heads) {
      const key = h.parentName ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    return [...groups.entries()];
  }, [heads]);

  const selectedHead = heads.find((h) => String(h.id) === headId);

  /* Debounced lookup — the operator types the number and the donor appears. */
  useEffect(() => {
    const t = term.trim();
    if (t.length < 3) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await lookupDonor(t);
        setResult({
          term: t,
          exact: res.exact,
          matches: res.matches.filter((m) => m.id !== res.exact?.id),
        });
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [term]);

  /* Ctrl+Enter saves from anywhere in the form. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chooseDonor = (d: DonorHit) => {
    setTerm(d.mobile);
    setResult({ term: d.mobile, exact: d, matches: [] });
    amountRef.current?.focus();
  };

  const canSave =
    Boolean(headId) &&
    Number(amount) > 0 &&
    (donor !== null || (isNewDonor && newName.trim().length > 1));

  const fe = state.fieldErrors ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="donorId" value={donor?.id ?? ""} />
        <input type="hidden" name="mobile" value={mobile} />
        <input type="hidden" name="paymentMethod" value={method} />

        {/* 1. Donor */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Donor</h2>
            {isSearching && <span className="text-xs text-ink-500">Searching…</span>}
          </div>

          <Field
            label="Mobile number, name or donor ID"
            hint="The mobile number is the donor's unique identity in the system."
            required
          >
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              inputMode="tel"
              autoFocus
              autoComplete="off"
              placeholder="03001234567"
              className="h-12 text-lg"
              aria-describedby="donor-status"
            />
          </Field>
          {fe.mobile && <p className="text-sm text-alert-700">{fe.mobile}</p>}

          <div id="donor-status" aria-live="polite">
            {donor && (
              <div className="mt-3 rounded-md border border-sabz-700/25 bg-sabz-100/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink-900">{donor.fullName}</p>
                  <span className="code text-xs text-sabz-700">{donor.donorCode}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  {donor.mobile}
                  {donor.city ? ` · ${donor.city}` : ""}
                  {donor.legacyCode ? ` · old no. ${donor.legacyCode}` : ""}
                </p>
                <p className="mt-2 text-xs text-ink-700">
                  {donor.lastAt
                    ? `Last gave Rs ${money(donor.lastAmount)} on ${longDate(donor.lastAt)} — ${donor.lastHead}. Total Rs ${money(donor.totalGiven)}.`
                    : "No previous donation recorded."}
                </p>
              </div>
            )}

            {matches.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-100 rounded-md border border-ink-200">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => chooseDonor(m)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-paper"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-800">{m.fullName}</span>
                        <span className="code block text-xs text-ink-500">
                          {m.mobile} · {m.donorCode}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-sabz-700">Use</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isNewDonor && (
              <div className="mt-3 rounded-md border border-brass-600/30 bg-brass-100/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="brass">New number</Badge>
                  <span className="text-xs text-ink-700">
                    No donor has this number. Add a name to register them now.
                  </span>
                </div>
                <Field label="Full name" required>
                  <Input
                    name="fullName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Syed Mohammad Abbas"
                    autoComplete="off"
                  />
                </Field>
                {fe.fullName && <p className="mt-1 text-sm text-alert-700">{fe.fullName}</p>}

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="mt-2 text-xs text-sabz-700 underline underline-offset-4"
                >
                  {showMore ? "Hide extra details" : "Add CNIC, address, old number"}
                </button>

                {showMore && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="CNIC">
                      <Input name="cnic" placeholder="42101-1234567-8" inputMode="numeric" />
                    </Field>
                    <Field label="City">
                      <Input name="city" placeholder="Karachi" />
                    </Field>
                    <Field label="Old donor number">
                      <Input name="legacyCode" placeholder="From the previous register" />
                    </Field>
                    <Field label="Address" className="sm:col-span-2">
                      <Input name="address" />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {searched && !donor && !isNewDonor && term.trim().length >= 3 && (
              <p className="mt-3 text-sm text-ink-500">
                No donor found. Type the full 11-digit mobile number to register a new one.
              </p>
            )}
          </div>
        </Card>

        {/* 2. Head and amount */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Donation</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Collection head" required>
              <Select
                name="headId"
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                required
              >
                <option value="">Choose a head…</option>
                {groupedHeads.map(([group, items]) => (
                  <optgroup key={group} label={group}>
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
              <Input
                ref={amountRef}
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="h-12 text-lg font-semibold"
                required
              />
            </Field>
          </div>

          {fe.amount && <p className="mt-1 text-sm text-alert-700">{fe.amount}</p>}
          {fe.headId && <p className="mt-1 text-sm text-alert-700">{fe.headId}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className={cx(
                  "tnum rounded-md border px-3 py-1.5 text-sm transition-colors",
                  amount === String(a)
                    ? "border-sabz-700 bg-sabz-100 text-sabz-700"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
                )}
              >
                {money(a)}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Payment method</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Payment method">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={method === m.key}
                  onClick={() => setMethod(m.key)}
                  className={cx(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    method === m.key
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method !== "cash" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {method === "cheque" && (
                <Field label="Cheque number" required>
                  <Input
                    name="chequeNo"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    placeholder="CHQ-100234"
                  />
                </Field>
              )}
              {(method === "bank_transfer" || method === "online") && (
                <Field label="Transaction / slip reference">
                  <Input
                    name="slipRef"
                    value={slipRef}
                    onChange={(e) => setSlipRef(e.target.value)}
                    placeholder="TRX500123"
                  />
                </Field>
              )}
              <Field label="Bank">
                <Input
                  name="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Meezan Bank"
                />
              </Field>
              {method !== "cash" && (
                <Field
                  label="Link to slip image"
                  hint="Paste a link to the scanned slip if you have one."
                  className="sm:col-span-2"
                >
                  <Input name="slipUrl" type="url" placeholder="https://…" />
                </Field>
              )}
            </div>
          )}
          {fe.chequeNo && <p className="mt-1 text-sm text-alert-700">{fe.chequeNo}</p>}

          <div className="mt-4">
            <Field label="Remarks">
              <Textarea
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Anything the accounts office should know"
              />
            </Field>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="isMembership"
              checked={isMembership}
              onChange={(e) => setIsMembership(e.target.checked)}
              className="size-4 accent-[#0c4a3e]"
            />
            Count this against the donor&apos;s monthly membership
          </label>
        </Card>

        {state.error && (
          <p role="alert" className="rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <SaveButton disabled={!canSave} />
        </div>
        <p className="text-xs text-ink-500">
          Press Ctrl + Enter to save without reaching for the mouse.
        </p>
      </form>

      {/* Live receipt preview — this is exactly what the printer will produce. */}
      <aside className="no-print lg:sticky lg:top-10 lg:self-start">
        <p className="eyebrow mb-2">Receipt preview</p>
        <ReceiptStrip
          data={{
            org,
            receiptNo: "R____-_____",
            receivedAt: new Date(),
            donorName: donor?.fullName || newName || "—",
            donorCode: donor?.donorCode || "new donor",
            mobile: mobile || "—",
            headName: selectedHead?.name || "—",
            parentName: selectedHead?.parentName,
            amount: Number(amount) || 0,
            paymentMethod: method,
            chequeNo: method === "cheque" ? chequeNo : null,
            slipRef: method !== "cash" ? slipRef : null,
            bankName: method !== "cash" ? bankName : null,
            collector,
            status: method === "cheque" ? "pending" : "completed",
            remarks: remarks || null,
          }}
        />
        <p className="mt-3 text-center text-xs text-ink-500">
          The receipt number is assigned when you save.
        </p>
      </aside>
    </div>
  );
}
