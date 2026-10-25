"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { lookupDonor, recordDonation, type CollectState, type DonorHit } from "./actions";
import ReceiptStrip from "@/components/ReceiptStrip";
import { Button, Card, Field, Input, Select, Textarea, Badge, cx } from "@/components/ui";
import { useT } from "@/components/LocaleProvider";
import { isValidMobile, longDate, money, normaliseMobile } from "@/lib/format";
import { CITIES } from "@/lib/cities";
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
  const t = useT();
  return (
    <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending || disabled}>
      {pending ? t("collect.saving") : t("collect.save")}
    </Button>
  );
}

export default function CollectForm({
  heads,
  membershipHead,
  org,
  collector,
  initialTerm = "",
}: {
  heads: HeadOption[];
  membershipHead: HeadOption | null;
  org: { name: string; tagline: string; address: string; phone: string; footer: string; logo?: string };
  collector: string;
  initialTerm?: string;
}) {
  const t = useT();
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
  const [wantMembership, setWantMembership] = useState(false);
  const [wantOthers, setWantOthers] = useState(false);
  const [isMonthlyMember, setIsMonthlyMember] = useState(false);
  const [selectedHeadIds, setSelectedHeadIds] = useState<string[]>([]);
  const [headAmounts, setHeadAmounts] = useState<Record<string, string>>({});
  const [activeHeadId, setActiveHeadId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [slipRef, setSlipRef] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [slipError, setSlipError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [additionalNames, setAdditionalNames] = useState("");

  function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipError(null);

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setSlipError("Please choose an image or PDF file.");
      return;
    }
    if (file.size > 3_000_000) {
      setSlipError("That file is too large — please use a file under ~2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSlipUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const mobile = normaliseMobile(term);
  const fresh = result?.term === term.trim() ? result : null;
  const donor = fresh?.exact ?? null;
  const matches = fresh?.matches ?? [];
  const searched = Boolean(fresh);
  const isNewDonor = searched && !donor && isValidMobile(mobile);

  const otherHeads = useMemo(
    () => heads.filter((h) => h.code !== "MEM-MON" && h.parentName !== "Monthly Membership"),
    [heads],
  );

  const groupedHeads = useMemo(() => {
    const groups = new Map<string, HeadOption[]>();
    for (const h of otherHeads) {
      const key = h.parentName ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    return [...groups.entries()];
  }, [otherHeads]);

  const selectedHeads = otherHeads.filter((h) => selectedHeadIds.includes(String(h.id)));
  const othersTotal = selectedHeads.reduce((sum, h) => sum + (Number(headAmounts[String(h.id)]) || 0), 0);

  function toggleMembership() {
    setWantMembership((prev) => {
      const next = !prev;
      if (next) setIsMonthlyMember(true);
      return next;
    });
  }

  function addHead(id: string) {
    if (!id) return;
    setSelectedHeadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveHeadId(id);
  }

  function removeHead(id: string) {
    setSelectedHeadIds((prev) => {
      const remaining = prev.filter((x) => x !== id);
      setActiveHeadId((cur) => (cur === id ? (remaining[remaining.length - 1] ?? "") : cur));
      return remaining;
    });
  }

  function applyQuickAmount(value: number) {
    const asText = String(value);
    if (wantMembership && !wantOthers) {
      setAmount(asText);
      return;
    }
    if (wantMembership && !activeHeadId) {
      setAmount(asText);
      return;
    }
    const target = activeHeadId || selectedHeadIds[0];
    if (!target) return;
    setHeadAmounts((prev) => ({ ...prev, [target]: asText }));
  }

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

  useEffect(() => {
    if (donor?.additionalNames != null) setAdditionalNames(donor.additionalNames);
  }, [donor?.id, donor?.additionalNames]);

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
    setAdditionalNames(d.additionalNames ?? "");
    amountRef.current?.focus();
  };

  const membershipOk = wantMembership && Number(amount) > 0 && Boolean(membershipHead);
  const othersOk =
    wantOthers &&
    selectedHeadIds.length > 0 &&
    selectedHeadIds.every((id) => Number(headAmounts[id]) > 0);
  const canSave =
    (membershipOk || othersOk) && (donor !== null || (isNewDonor && newName.trim().length > 1));

  const fe = state.fieldErrors ?? {};
  const previewAmount = (wantMembership ? Number(amount) || 0 : 0) + (wantOthers ? othersTotal : 0);
  const previewHead =
    wantMembership && !wantOthers
      ? membershipHead
      : selectedHeads.length === 1
        ? selectedHeads[0]
        : undefined;
  const previewLines = [
    ...(wantMembership && membershipHead && Number(amount) > 0
      ? [{ name: membershipHead.name, parentName: membershipHead.parentName, amount: Number(amount) || 0 }]
      : []),
    ...(wantOthers
      ? selectedHeads.map((h) => ({
          name: h.name,
          parentName: h.parentName,
          amount: Number(headAmounts[String(h.id)]) || 0,
        }))
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="donorId" value={donor?.id ?? ""} />
        <input type="hidden" name="mobile" value={mobile} />
        <input type="hidden" name="paymentMethod" value={method} />
        {wantMembership && <input type="hidden" name="kind_membership" value="on" />}
        {wantOthers && <input type="hidden" name="kind_others" value="on" />}
        {isMonthlyMember && <input type="hidden" name="isMonthlyMember" value="on" />}

        {/* 1. Donor */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-primary">{t("collect.donor")}</h2>
            {isSearching && <span className="text-xs text-ink-500">{t("collect.searching")}</span>}
          </div>

          <Field
            label={t("collect.mobile")}
            hint={t("collect.mobileHint")}
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
                    : t("collect.noPrev")}
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
                      <span className="shrink-0 text-xs text-sabz-700">{t("collect.use")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isNewDonor && (
              <div className="mt-3 rounded-md border border-brass-600/30 bg-brass-100/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="brass">{t("collect.newNumber")}</Badge>
                  <span className="text-xs text-ink-700">
                    {t("collect.newNumberHint")}
                  </span>
                </div>
                <Field label={t("collect.fullName")} required>
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
                  {showMore ? t("collect.hideMore") : t("collect.showMore")}
                </button>

                {showMore && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label={t("collect.cnic")}>
                      <Input name="cnic" placeholder="42101-1234567-8" inputMode="numeric" />
                    </Field>
                    <Field label={t("collect.city")}>
                      <Select name="city" defaultValue="">
                        <option value="">{t("collect.chooseCity")}</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={t("collect.legacy")}>
                      <Input name="legacyCode" placeholder="From the previous register" />
                    </Field>
                    <Field label={t("collect.address")} className="sm:col-span-2">
                      <Input name="address" />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {searched && !donor && !isNewDonor && term.trim().length >= 3 && (
              <p className="mt-3 text-sm text-ink-500">
                {t("collect.notFound")}
              </p>
            )}
          </div>
        </Card>

        {/* 2. Kind, then heads / amount */}
        <Card>
          <h2 className="mb-3 font-display text-xl font-bold text-primary">{t("collect.donation")}</h2>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-ink-700">
              {t("collect.whatFor")} <span className="text-alert-700">*</span>
            </legend>
            <p className="mb-2 text-xs text-ink-500">
              {t("collect.whatForHint")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={wantMembership}
                onClick={toggleMembership}
                className={cx(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm",
                  wantMembership
                    ? "border-sabz-700 bg-sabz-100/70 text-ink-900"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
                )}
              >
                {t("collect.membership")}
              </button>
              <button
                type="button"
                aria-pressed={wantOthers}
                onClick={() => setWantOthers((v) => !v)}
                className={cx(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm",
                  wantOthers
                    ? "border-sabz-700 bg-sabz-100/70 text-ink-900"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
                )}
              >
                {t("collect.others")}
              </button>
            </div>
          </fieldset>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={isMonthlyMember}
              onChange={(e) => setIsMonthlyMember(e.target.checked)}
              className="size-4 accent-primary"
            />
            {t("collect.monthlyMemberQ")}
          </label>
          {fe.kind && <p className="mt-1 text-sm text-alert-700">{fe.kind}</p>}

          {wantMembership && (
            <div className="mt-4">
              {!membershipHead && (
                <p className="mb-3 text-sm text-alert-700">
                  {t("collect.membershipMissing")}
                </p>
              )}
              <Field label={t("collect.amount")} required>
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
              {fe.amount && <p className="mt-1 text-sm text-alert-700">{fe.amount}</p>}
            </div>
          )}

          {wantOthers && (
            <div className="mt-4" data-testid="others-heads">
              <Field label={t("collect.heads")} hint={t("collect.headsHint")} required>
                <Select
                  value=""
                  aria-label={t("collect.chooseHead")}
                  onChange={(e) => addHead(e.target.value)}
                >
                  <option value="">{t("collect.chooseHead")}</option>
                  {groupedHeads.map(([group, items]) => {
                    const remaining = items.filter((h) => !selectedHeadIds.includes(String(h.id)));
                    if (remaining.length === 0) return null;
                    return (
                      <optgroup key={group} label={group}>
                        {remaining.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </Select>
              </Field>
              {otherHeads.length === 0 && (
                <p className="mt-1 text-sm text-alert-700">{t("collect.noOtherHeads")}</p>
              )}
              {selectedHeads.length > 0 && (
                <ul className="mt-3 divide-y divide-ink-100 rounded-md border border-ink-200">
                  {selectedHeads.map((h) => {
                    const id = String(h.id);
                    return (
                      <li key={id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <input type="hidden" name="headId" value={id} />
                        <span className="min-w-0 flex-1 text-sm text-ink-800">{h.name}</span>
                        <Input
                          name={`amount_${id}`}
                          value={headAmounts[id] ?? ""}
                          onChange={(e) =>
                            setHeadAmounts((prev) => ({
                              ...prev,
                              [id]: e.target.value.replace(/[^\d.]/g, ""),
                            }))
                          }
                          onFocus={() => setActiveHeadId(id)}
                          inputMode="numeric"
                          placeholder="Rs"
                          className="h-10 w-28 text-sm"
                          aria-label={`Amount for ${h.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeHead(id)}
                          className="text-xs text-alert-700 underline underline-offset-4"
                        >
                          {t("collect.removeHead")}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selectedHeads.length > 1 && (
                <p className="mt-2 tnum text-sm text-ink-700">
                  {t("collect.totalAcross", { amount: money(othersTotal), n: selectedHeads.length })}
                </p>
              )}
              {fe.headId && <p className="mt-1 text-sm text-alert-700">{fe.headId}</p>}
              {fe.amount && <p className="mt-1 text-sm text-alert-700">{fe.amount}</p>}
            </div>
          )}

          {(wantMembership || wantOthers) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => applyQuickAmount(a)}
                  className={cx(
                    "tnum rounded-md border px-3 py-1.5 text-sm transition-colors",
                    (wantOthers ? headAmounts[activeHeadId] || "" : amount) === String(a)
                      ? "border-sabz-700 bg-sabz-100 text-sabz-700"
                      : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
                  )}
                >
                  {money(a)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">{t("collect.payment")}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("collect.payment")}>
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
                  {t(
                    m.key === "cash"
                      ? "collect.cash"
                      : m.key === "bank_transfer"
                        ? "collect.bank"
                        : m.key === "cheque"
                          ? "collect.cheque"
                          : "collect.online",
                  )}
                </button>
              ))}
            </div>
          </div>

          {method !== "cash" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {method === "cheque" && (
                <Field label={t("collect.chequeNo")} required>
                  <Input
                    name="chequeNo"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    placeholder="CHQ-100234"
                  />
                </Field>
              )}
              {(method === "bank_transfer" || method === "online") && (
                <Field label={t("collect.slipRef")}>
                  <Input
                    name="slipRef"
                    value={slipRef}
                    onChange={(e) => setSlipRef(e.target.value)}
                    placeholder="TRX500123"
                  />
                </Field>
              )}
              <Field label={t("collect.bankName")}>
                <Input
                  name="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Meezan Bank"
                />
              </Field>
              {method !== "cash" && (
                <Field
                  label={t("collect.slip")}
                  hint={t("collect.slipHint")}
                  className="sm:col-span-2"
                >
                  <div className="flex items-center gap-3">
                    {slipUrl && slipUrl.startsWith("data:image/") && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slipUrl}
                        alt="Slip preview"
                        className="h-14 w-14 rounded-md border border-ink-200 object-cover"
                      />
                    )}
                    {slipUrl && slipUrl.startsWith("data:application/pdf") && (
                      <span className="text-sm text-ink-600">PDF attached</span>
                    )}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSlipChange}
                      className="text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
                    />
                  </div>
                  <input type="hidden" name="slipUrl" value={slipUrl} />
                  {slipError && <p className="mt-1 text-sm text-alert-700">{slipError}</p>}
                </Field>
              )}
            </div>
          )}
          {fe.chequeNo && <p className="mt-1 text-sm text-alert-700">{fe.chequeNo}</p>}

          <div className="mt-4">
            <Field
              label={t("collect.extraNames")}
              hint={t("collect.extraHint")}
            >
              <Input
                name="additionalNames"
                value={additionalNames}
                onChange={(e) => setAdditionalNames(e.target.value)}
                placeholder="Syeda Fatima, Ali Abbas"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label={t("collect.remarks")}>
              <Textarea
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Anything the accounts office should know"
              />
            </Field>
          </div>
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
          {t("collect.shortcut")}
        </p>
      </form>

      {/* Live receipt preview — this is exactly what the printer will produce. */}
      <aside className="no-print max-w-[320px] lg:sticky lg:top-10 lg:self-start">
        <p className="eyebrow mb-2">{t("collect.preview")}</p>
        <ReceiptStrip
          data={{
            org,
            receiptNo: "R____-_____",
            receivedAt: new Date(),
            donorName: donor?.fullName || newName || "—",
            donorCode: donor?.donorCode || "new donor",
            mobile: mobile || "—",
            headName:
              previewLines.length > 1
                ? `${previewLines.length} heads`
                : previewHead?.name || membershipHead?.name || "—",
            parentName: previewHead?.parentName,
            amount: previewAmount,
            paymentMethod: method,
            chequeNo: method === "cheque" ? chequeNo : null,
            slipRef: method !== "cash" ? slipRef : null,
            bankName: method !== "cash" ? bankName : null,
            collector,
            status: method === "cheque" ? "pending" : "completed",
            remarks: remarks || null,
            additionalNames: additionalNames || null,
            headLines: previewLines,
          }}
        />
        <p className="mt-3 text-center text-xs text-ink-500">
          The receipt number is assigned when you save.
        </p>
      </aside>
    </div>
  );
}
