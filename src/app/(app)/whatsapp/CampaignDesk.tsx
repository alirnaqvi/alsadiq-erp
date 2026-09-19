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
  const [state, action] = useActionState<CampaignState, FormData>(saveCampaign, {});

  const current = recipients[index];
  const preview = current ? fill(body, current) : body;

  async function loadAudience(next: string) {
    setAudience(next);
    setLoading(true);
    setIndex(0);
    const data = await campaignRecipients(next);
    setRecipients(data);
    setLoading(false);
  }

  const waHref = useMemo(() => {
    if (!current) return "#";
    return `https://wa.me/${current.wa}?text=${encodeURIComponent(fill(body, current))}`;
  }, [current, body]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form action={action} className="space-y-4">
        <input type="hidden" name="audience" value={audience} />
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign title" required>
              <Input name="title" required placeholder="Muharram reminder" />
            </Field>
            <Field label="Audience">
              <Select
                value={audience}
                onChange={(e) => loadAudience(e.target.value)}
              >
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
          {loading ? "Loading…" : `${recipients.length} recipients`}
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
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-sabz-700 text-sm font-medium text-white"
              onClick={() => setIndex((i) => Math.min(i + 1, Math.max(recipients.length - 1, 0)))}
            >
              Send next ({index + 1}/{recipients.length})
            </a>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-500">No one in this audience.</p>
        )}
      </Card>
    </div>
  );
}
