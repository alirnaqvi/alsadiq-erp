"use client";

import { Button } from "@/components/ui";

export default function PrintReceiptButton() {
  return (
    <Button type="button" variant="gold" onClick={() => window.print()}>
      Print receipt
    </Button>
  );
}
