export const CURRENCY = "PKR";

export function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyWithSymbol(value: string | number | null | undefined) {
  return `Rs ${money(value)}`;
}

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Shaban",
  "Ramadan",
  "Shawwal",
  "Dhul Qadah",
  "Dhul Hijjah",
];

/**
 * The trust's whole year is organised around the Hijri calendar — heads are
 * named "28th Safar", "9th Muharram". Showing it beside the Gregorian date
 * means staff never have to convert in their head at the counter.
 */
export function hijriYmd(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).formatToParts(d);
  const num = (t: string) => Number((parts.find((p) => p.type === t)?.value ?? "").replace(/\D/g, "") || 0);
  return { year: num("year"), month: num("month"), day: num("day") };
}

export function hijriMonthName(month: number) {
  return HIJRI_MONTHS[month - 1] ?? "";
}

export function hijri(date: Date | string) {
  try {
    const { day, month, year } = hijriYmd(date);
    if (!day || !month) return "";
    return `${day} ${hijriMonthName(month)} ${year}`;
  } catch {
    return "";
  }
}

/** Find Gregorian dates in the next `horizonDays` that fall on a given Hijri month/day. */
export function upcomingHijriDates(hijriMonth: number, hijriDay: number, horizonDays = 420, from = new Date()) {
  const start = new Date(`${ymd(from)}T00:00:00+05:00`);
  const matches: { gregorian: Date; hijriYear: number }[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const h = hijriYmd(d);
    if (h.month === hijriMonth && h.day === hijriDay) {
      matches.push({ gregorian: d, hijriYear: h.year });
    }
  }
  return matches;
}

export function longDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(d);
}

export function dateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  }).format(d);
}

export function timeOnly(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  }).format(d);
}

/** YYYY-MM-DD in Pakistan time, for date inputs and month grouping. */
export function ymd(date: Date | string = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(d);
}

/**
 * Mobile numbers arrive as 03001234567, 0300-1234567, +923001234567.
 * They are stored in one shape so the uniqueness rule actually holds.
 */
export function normaliseMobile(input: string) {
  let s = (input || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+92")) s = "0" + s.slice(3);
  else if (s.startsWith("0092")) s = "0" + s.slice(4);
  else if (s.startsWith("92") && s.length === 12) s = "0" + s.slice(2);
  else if (s.length === 10 && s.startsWith("3")) s = "0" + s;
  return s;
}

export function isValidMobile(input: string) {
  const s = normaliseMobile(input);
  return /^03\d{9}$/.test(s);
}

/** wa.me needs the international form without the plus. */
export function waNumber(mobile: string) {
  const s = normaliseMobile(mobile);
  return s.startsWith("0") ? "92" + s.slice(1) : s;
}

export function formatCnic(input: string) {
  const d = (input || "").replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  online: "Online",
};

export const STATUS_LABELS: Record<string, string> = {
  completed: "Received",
  pending: "Pending clearance",
  void: "Voided",
};

/* Receipts in Pakistan carry the amount in words as well as figures. */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + underThousand(n % 100) : ""}`;
}

/** Uses the South Asian scale: crore, lakh, thousand. */
export function amountInWords(value: string | number): string {
  let n = Math.floor(Number(value ?? 0));
  if (!Number.isFinite(n) || n <= 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  if (crore) {
    parts.push(`${underThousand(crore)} Crore`);
    n %= 10_000_000;
  }
  const lakh = Math.floor(n / 100_000);
  if (lakh) {
    parts.push(`${underThousand(lakh)} Lakh`);
    n %= 100_000;
  }
  const thousand = Math.floor(n / 1000);
  if (thousand) {
    parts.push(`${underThousand(thousand)} Thousand`);
    n %= 1000;
  }
  if (n) parts.push(underThousand(n));
  return parts.join(" ");
}
