import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donors } from "@/db/schema";

const COOKIE = "alsadiq_donor";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(s + ":donor");
}

export type DonorSession = {
  id: number;
  donorCode: string;
  fullName: string;
  mobile: string;
  email: string | null;
  additionalNames: string | null;
};

export async function createDonorSession(donorId: number) {
  const token = await new SignJWT({ did: donorId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyDonorSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getDonorSession(): Promise<DonorSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let did: number;
  try {
    const { payload } = await jwtVerify(token, secret());
    did = Number(payload.did);
  } catch {
    return null;
  }

  const [row] = await db
    .select({
      id: donors.id,
      donorCode: donors.donorCode,
      fullName: donors.fullName,
      mobile: donors.mobile,
      email: donors.email,
      additionalNames: donors.additionalNames,
      isActive: donors.isActive,
    })
    .from(donors)
    .where(eq(donors.id, did))
    .limit(1);
  if (!row || !row.isActive) return null;

  return {
    id: row.id,
    donorCode: row.donorCode,
    fullName: row.fullName,
    mobile: row.mobile,
    email: row.email,
    additionalNames: row.additionalNames,
  };
}

export async function requireDonor(): Promise<DonorSession> {
  const d = await getDonorSession();
  if (!d) redirect("/m/login");
  return d;
}
