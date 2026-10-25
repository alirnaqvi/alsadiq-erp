"use client";

import { cx } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";
import { setLocale } from "@/app/locale-actions";
import type { Locale } from "@/lib/i18n";

export default function LanguageToggle({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const locale = useLocale();
  const dark = tone === "dark";

  function option(next: Locale, label: string, urduLabel?: boolean) {
    const active = locale === next;
    return (
      <form action={setLocale}>
        <input type="hidden" name="locale" value={next} />
        <button
          type="submit"
          aria-pressed={active}
          className={cx(
            "rounded-full px-3 py-1.5 transition-colors",
            urduLabel && "font-[family-name:var(--font-nastaliq),serif] text-[0.95rem] leading-none",
            active
              ? dark
                ? "bg-gold text-gold-foreground"
                : "bg-primary text-primary-foreground"
              : dark
                ? "text-primary-foreground/70 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      </form>
    );
  }

  return (
    <div
      className={cx(
        "inline-flex rounded-full p-0.5 text-xs font-semibold",
        dark ? "border border-primary-foreground/20" : "border border-border bg-card",
      )}
      role="group"
      aria-label="Language"
    >
      {option("en", "EN")}
      {option("ur", "اردو", true)}
    </div>
  );
}
