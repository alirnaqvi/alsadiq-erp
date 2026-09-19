import "server-only";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

async function next(key: string): Promise<number> {
  const result = await db.execute(
    sql`INSERT INTO counters (key, value) VALUES (${key}, 1)
        ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
        RETURNING value`,
  );
  const rows = (result as unknown as { rows: { value: number }[] }).rows;
  return Number(rows[0].value);
}

export async function nextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await next(`receipt_${year}`);
  return `R${year}-${String(n).padStart(5, "0")}`;
}

export async function nextDonorCode(): Promise<string> {
  const n = await next("donor");
  return `ASD-${String(n).padStart(5, "0")}`;
}

export async function nextAssetCode(): Promise<string> {
  const n = await next("asset");
  return `AST-${String(n).padStart(5, "0")}`;
}

export async function nextItemCode(): Promise<string> {
  const n = await next("inventory");
  return `INV-${String(n).padStart(5, "0")}`;
}

export function newShareToken() {
  return randomBytes(16).toString("hex");
}
