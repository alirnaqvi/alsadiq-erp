"use client";

import { Button } from "@/components/ui";

export default function PrintPdfButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
