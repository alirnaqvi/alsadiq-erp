import "server-only";
import ExcelJS from "exceljs";
import { CITIES, guessCity } from "./cities";
import { parseBloodGroup } from "./blood-groups";
import { formatCnic, isValidMobile, normaliseMobile } from "./format";
import type { ImportRow } from "./donor-import-types";

export type { ImportRow } from "./donor-import-types";

export type ImportParseResult = {
  rows: ImportRow[];
  skipped: { row: number; sheet: string; reason: string }[];
  sheets: string[];
};

const NAME_KEYS = ["name", "full name", "donor name", "naam"];
const MOBILE_KEYS = ["phone", "mobile", "contact", "contact#", "contact no", "contact number", "cell"];
const MEMBER_KEYS = ["membership", "membership#", "membership no", "r/no", "r no", "r.no", "donor id", "code", "as no"];
const AMOUNT_KEYS = ["amount donated", "amount", "donation", "total", "given"];
const PROF_KEYS = ["profession", "occupation", "job"];
const BLOOD_KEYS = ["blood group", "blood", "b.g"];
const DOB_KEYS = ["date of birth", "dob", "birth date", "birthday"];
const CITY_KEYS = ["city", "town"];
const ADDR_KEYS = ["address", "addr"];
const CNIC_KEYS = ["cnic", "cnic no", "cnic no.", "nic"];
const EMAIL_KEYS = ["email", "e-mail"];

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (obj.result != null) return cellText(obj.result as ExcelJS.CellValue);
    if (obj.text) return String(obj.text).trim();
    if (obj.hyperlink) return String(obj.hyperlink).trim();
  }
  return String(value).trim();
}

function normHeader(h: string) {
  return h.toLowerCase().replace(/[#.]/g, "").replace(/\s+/g, " ").trim();
}

function pick(map: Map<string, string>, keys: string[]) {
  for (const k of keys) {
    const hit = map.get(normHeader(k));
    if (hit) return hit;
  }
  return "";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 1900;
    if (mo > 12 && d <= 12) return `${y}-${String(d).padStart(2, "0")}-${String(mo).padStart(2, "0")}`;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime()) && dt.getFullYear() > 1900 && dt.getFullYear() < 2100) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function looksLikeMembership(v: string) {
  return /^as[-\s]?\d+/i.test(v) || /^asd-\d+/i.test(v);
}

function looksLikeMobile(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

export async function parseDonorWorkbook(buffer: ArrayBuffer | Buffer): Promise<ImportParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ExcelJS.Buffer);
  const rows: ImportRow[] = [];
  const skipped: ImportParseResult["skipped"] = [];
  const seenMobile = new Set<string>();
  const seenMember = new Set<string>();

  for (const ws of wb.worksheets) {
    if (!ws || ws.rowCount < 1) continue;
    const first = ws.getRow(1);
    const headers: string[] = [];
    first.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = cellText(cell.value);
    });
    const headerNorm = headers.map((h) => normHeader(h || ""));
    const hasName = headerNorm.some((h) => NAME_KEYS.includes(h));
    const hasPhone = headerNorm.some((h) => MOBILE_KEYS.includes(h) || h.includes("phone") || h.includes("contact"));
    const headered = hasName && hasPhone;

    if (headered) {
      const colOf = (keys: string[]) => {
        for (let i = 1; i < headerNorm.length; i++) {
          if (keys.includes(headerNorm[i])) return i;
        }
        return 0;
      };
      const cName = colOf(NAME_KEYS);
      const cMobile = colOf(MOBILE_KEYS) || headers.findIndex((_, i) => /phone|contact|mobile/.test(headerNorm[i] || ""));
      const cMember = colOf(MEMBER_KEYS);
      const cAmount = colOf(AMOUNT_KEYS);
      const cProf = colOf(PROF_KEYS);
      const cBlood = colOf(BLOOD_KEYS);
      const cDob = colOf(DOB_KEYS);
      const cCity = colOf(CITY_KEYS);
      const cAddr = colOf(ADDR_KEYS);
      const cCnic = colOf(CNIC_KEYS);
      const cEmail = colOf(EMAIL_KEYS);

      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const get = (c: number) => (c ? cellText(row.getCell(c).value) : "");
        ingest({
          row: r,
          sheet: ws.name,
          membershipNo: get(cMember),
          fullName: get(cName),
          mobile: get(cMobile),
          amount: parseAmount(get(cAmount)),
          profession: get(cProf) || null,
          bloodGroup: parseBloodGroup(get(cBlood)),
          dateOfBirth: parseDate(get(cDob)),
          city: get(cCity) || guessCity(get(cAddr)),
          address: get(cAddr) || null,
          cnic: get(cCnic) ? formatCnic(get(cCnic)) : null,
          email: get(cEmail) || null,
        });
      }
    } else {
      for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const a = cellText(row.getCell(1).value);
        const b = cellText(row.getCell(2).value);
        const c = cellText(row.getCell(3).value);
        if (!a && !b && !c) continue;
        if (r === 1 && /name|s no|phone/i.test(`${a} ${b} ${c}`)) continue;
        let membershipNo = "";
        let fullName = "";
        let mobile = "";
        if (looksLikeMembership(a) && looksLikeMobile(c)) {
          membershipNo = a;
          fullName = b;
          mobile = c;
        } else if (looksLikeMobile(a)) {
          mobile = a;
          fullName = b;
          membershipNo = c;
        } else if (looksLikeMembership(a)) {
          membershipNo = a;
          fullName = b;
          mobile = c;
        } else {
          skipped.push({ row: r, sheet: ws.name, reason: "Could not read name and mobile on this row." });
          continue;
        }
        ingest({
          row: r,
          sheet: ws.name,
          membershipNo,
          fullName,
          mobile,
          amount: 0,
          profession: null,
          bloodGroup: null,
          dateOfBirth: null,
          city: null,
          address: null,
          cnic: null,
          email: null,
        });
      }
    }
  }

  function ingest(raw: {
    row: number;
    sheet: string;
    membershipNo: string;
    fullName: string;
    mobile: string;
    amount: number;
    profession: string | null;
    bloodGroup: string | null;
    dateOfBirth: string | null;
    city: string | null;
    address: string | null;
    cnic: string | null;
    email: string | null;
  }) {
    const issues: string[] = [];
    const fullName = raw.fullName.replace(/\s+/g, " ").trim();
    const mobile = normaliseMobile(raw.mobile);
    const membershipNo = raw.membershipNo.replace(/\s+/g, " ").trim() || null;
    if (!fullName) {
      skipped.push({ row: raw.row, sheet: raw.sheet, reason: "Missing name." });
      return;
    }
    if (!isValidMobile(mobile)) {
      skipped.push({ row: raw.row, sheet: raw.sheet, reason: `Not a valid mobile number (${raw.mobile || "blank"}).` });
      return;
    }
    if (seenMobile.has(mobile)) {
      skipped.push({ row: raw.row, sheet: raw.sheet, reason: `Duplicate mobile ${mobile} in this file.` });
      return;
    }
    if (membershipNo && seenMember.has(membershipNo.toUpperCase())) {
      issues.push("Membership number already used earlier in this file.");
    }
    seenMobile.add(mobile);
    if (membershipNo) seenMember.add(membershipNo.toUpperCase());
    let city = raw.city?.trim() || null;
    if (city && !CITIES.includes(city as (typeof CITIES)[number])) {
      const match = CITIES.find((c) => c.toLowerCase() === city!.toLowerCase());
      city = match ?? guessCity(city) ?? city;
    }
    rows.push({
      row: raw.row,
      sheet: raw.sheet,
      membershipNo,
      fullName,
      mobile,
      amount: raw.amount,
      profession: raw.profession?.trim() || null,
      bloodGroup: raw.bloodGroup,
      dateOfBirth: raw.dateOfBirth,
      city,
      address: raw.address?.trim() || null,
      cnic: raw.cnic,
      email: raw.email?.trim() || null,
      issues,
    });
  }

  return {
    rows,
    skipped,
    sheets: wb.worksheets.map((s) => s.name),
  };
}

export const IMPORT_TEMPLATE_COLUMNS = [
  { header: "Membership #", key: "membershipNo", width: 16 },
  { header: "Name", key: "fullName", width: 28 },
  { header: "Contact#", key: "mobile", width: 16 },
  { header: "Amount donated", key: "amount", width: 16 },
  { header: "Profession", key: "profession", width: 18 },
  { header: "Blood group", key: "bloodGroup", width: 14 },
  { header: "Date of birth", key: "dateOfBirth", width: 16 },
  { header: "City", key: "city", width: 16 },
  { header: "Address", key: "address", width: 32 },
  { header: "CNIC", key: "cnic", width: 18 },
  { header: "Email", key: "email", width: 24 },
];
