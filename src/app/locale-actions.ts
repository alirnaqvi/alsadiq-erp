"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function setLocale(formData: FormData) {
  const raw = formData.get("locale");
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
