"use client";

import { useActionState, useMemo, useState } from "react";
import { saveCampaign, campaignRecipients, type CampaignState, type Recipient } from "./actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

function fill(template: string, r: Recipient) {
  return template
    .replaceAll("{name}", r.name)
    .replaceAll("{mobile}", r.mobile);
}

export default function CampaignDesk({
  initial,
}: {
  initial: { audience: string; recipients: Recipient[] };
}) {
  const [audience, setAudience] = useState(initial.audience);
  const [recipients, setRecipients] = useState(initial.recipients);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(
    "Assalam-o-Alaikum {name},\n\nJazak Allah for your support of Al Sadiq Trust. May Allah accept your contribution.\n\n— Al Sadiq Trust",
  );
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [state, action] = useActionState<CampaignState, FormData>(saveCampaign, {});

  const current = recipients[index];
  const preview = current ? fill(body, current) : body;

  async function loadAudience(next: string) {
    setAudience(next);
    setLoading(true);
    setIndex(0);
    setSent(new Set());
    const data = await campaignRecipients(next);
    setRecipients(data);
    setLoading(false);
  }

  const waHref = useMemo(() => {
    if (!current) return "#";
    return `https://wa.me/${current.wa}?text=${encodeURIComponent(fill(body, current))}`;
  }, [current, body]);

  function copyNumbers() {
    const text = recipients.map((r) => r.mobile).join("\n");
    void navigator.clipboard.writeText(text);
  }

  function exportCsv() {
    const header = "Name,Mobile,WhatsApp,Message\n";
    const lines = recipients.map((r) => {
      const msg = fill(body, r).replaceAll('"', '""');
      return `"${r.name}","${r.mobile}","${r.wa}","${msg}"`;
    });
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "al-sadiq-whatsapp-campaign.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function markSentAndNext() {
    if (current) setSent((prev) => new Set(prev).add(current.id));
    setIndex((i) => Math.min(i + 1, Math.max(recipients.length - 1, 0)));
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-xl font-bold text-primary">Until the Business API is live</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Official bulk send needs Meta&apos;s WhatsApp Business API. Until the trust has that,
          this desk opens one personalised chat at a time on WhatsApp (phone or WhatsApp Web).
          You can also copy the number list or download a CSV for the WhatsApp Business app
          broadcast list.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={copyNumbers} disabled={!recipients.length}>
            Copy all numbers
          </Button>
          <Button type="button" variant="secondary" onClick={exportCsv} disabled={!recipients.length}>
            Download CSV
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form action={action} className="space-y-4">
          <input type="hidden" name="audience" value={audience} />
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign title" required>
                <Input name="title" required placeholder="Muharram reminder" />
              </Field>
              <Field label="Audience">
                <Select value={audience} onChange={(e) => loadAudience(e.target.value)}>
                  <option value="all">All donors</option>
                  <option value="members">Monthly members</option>
                  <option value="overdue">Members overdue this month</option>
                </Select>
              </Field>
            </div>
            <Field
              className="mt-4"
              label="Message"
              hint="Use {name} for the donor's name. Each chat opens in WhatsApp with the text filled in."
              required
            >
              <Textarea name="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} required />
            </Field>
            {state.error && <p className="mt-3 text-sm text-alert-700">{state.error}</p>}
            {state.ok && <p className="mt-3 text-sm text-sabz-700">{state.ok}</p>}
            <div className="mt-4">
              <Button type="submit" variant="secondary">
                Save campaign
              </Button>
            </div>
          </Card>
        </form>

        <Card>
          <p className="eyebrow">Send queue</p>
          <p className="mt-1 text-sm text-ink-700">
            {loading ? "Loading…" : `${sent.size} sent · ${recipients.length} in list`}
          </p>
          {current ? (
            <>
              <p className="mt-4 font-medium text-ink-900">{current.name}</p>
              <p className="code text-xs text-ink-500">{current.mobile}</p>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-paper p-3 text-xs text-ink-700">{preview}</p>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md font-semibold text-gold-foreground shadow-[var(--shadow-gold)] [background-image:var(--gradient-gold)]"
                onClick={markSentAndNext}
              >
                Open WhatsApp ({index + 1}/{recipients.length})
              </a>
              <button
                type="button"
                className="mt-2 w-full text-xs text-primary underline underline-offset-4"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              >
                Previous donor
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-500">No one in this audience.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
