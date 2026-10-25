"use client";

import { useState } from "react";
import { sponsorshipWhatsApp } from "./actions";

export default function WhatsAppStatusLink({ id }: { id: number }) {
  const [href, setHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const url = await sponsorshipWhatsApp(id);
    setBusy(false);
    if (url) {
      setHref(url);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="text-sm font-semibold text-primary underline underline-offset-4"
    >
      {busy ? "Preparing…" : href ? "Open WhatsApp again" : "Send status on WhatsApp"}
    </button>
  );
}
