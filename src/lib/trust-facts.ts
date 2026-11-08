/**
 * Facts copied from the public website (alsadiqtrust.com), which the trust
 * treats as accurate. Seed, settings defaults, the donor pay screen and the
 * calendar all read from here so the portal does not drift.
 */

export const TRUST = {
  name: "Masjid o Imam Bargah Al-Sadiq Trust (Rgtd)",
  shortName: "Al Sadiq Trust",
  tagline: "G-9/2, Islamabad · Since 1996",
  address: "Al Sadiq Trust, G-9/2, Islamabad, Pakistan",
  phone: "+92 (51) 2851996",
  email: "alsadiqpakistan@gmail.com",
  whatsapp: "923212415331",
  location: "Al Sadiq Trust, G-9/2, Islamabad",
} as const;

export const BANK = {
  bankName: "Bank Al Habib",
  accountTitle: "AL SADIQ TRUST (REGD)",
  accountNumber: "01050081000512019",
  iban: "PK34BAHL0105008100051201",
} as const;

export const WEEKLY_PROGRAMS = [
  { day: "Tuesday", name: "Dua Tawassul", time: "After Maghrabain" },
  { day: "Thursday", name: "Dua Kumail + Majlis for Eesale Thawab", time: "After Maghrabain" },
  { day: "Friday", name: "Dua Nudba", time: "After Fajar" },
  { day: "Friday", name: "Hadeese Kisa", time: "After Maghrabain" },
] as const;

/** Donate heads from alsadiqtrust.com/donate, plus monthly membership for the office counter. */
export const DONATE_HEADS: {
  code: string;
  name: string;
  nameUr: string;
  children?: { code: string; name: string; nameUr?: string }[];
}[] = [
  { code: "KHUMS", name: "Khums", nameUr: "خمس" },
  { code: "ZAKAT", name: "Zakat", nameUr: "زکوٰۃ" },
  { code: "SADAQAT", name: "Sadaqat", nameUr: "صدقات" },
  { code: "AZADARI_SHARE", name: "Azadari Share", nameUr: "عزاداری کا حصہ" },
  { code: "MAJLIS_SPONSOR", name: "Majlis Sponsorship", nameUr: "مجلس کی سپانسرشپ" },
  { code: "ONLINE_MAJLIS", name: "Online Majlis", nameUr: "آن لائن مجلس" },
  { code: "EDU_SUPPORT", name: "Education Support", nameUr: "تعلیمی معاونت" },
  { code: "MEDICAL", name: "Medical Centre", nameUr: "طبی مرکز" },
  { code: "LIBRARY", name: "Library", nameUr: "کتب خانہ" },
  { code: "MAGHSAL", name: "Maghsal & Ambulance", nameUr: "مغسل اور ایمبولینس" },
  { code: "IT_STREAM", name: "IT & Live Streaming", nameUr: "آئی ٹی اور نشریات" },
  {
    code: "MEMBER",
    name: "Monthly Membership",
    nameUr: "ماہانہ رکنیت",
    children: [{ code: "MEM-MON", name: "Monthly contribution", nameUr: "ماہانہ حصہ" }],
  },
  { code: "GENERAL", name: "General", nameUr: "عام عطیہ" },
];

export type CalendarOccasion = {
  month: number;
  day: number;
  title: string;
  titleUr: string;
  kind: "majlis" | "milad" | "jashne" | "aamaal";
  note?: string;
};

/** Annual Hijri calendar as published on alsadiqtrust.com/calendar. */
export const ISLAMIC_CALENDAR: CalendarOccasion[] = [
  { month: 1, day: 1, title: "Start of Islamic Year", titleUr: "آغازِ سنہ ہجری", kind: "majlis" },
  { month: 1, day: 9, title: "Shab-e-Ashura", titleUr: "شبِ عاشور", kind: "aamaal" },
  { month: 1, day: 10, title: "Day of Ashura - Martyrdom of Imam Hussain (AS)", titleUr: "یومِ عاشور - شہادتِ امام حسینؑ", kind: "majlis" },
  { month: 1, day: 11, title: "Majlis Series (11–15 Muharram)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Kamil Mahdavi" },
  { month: 1, day: 13, title: "Majlis Sham-e-Ghariban", titleUr: "مجلسِ شام غریباں", kind: "majlis" },
  { month: 1, day: 16, title: "Majlis Series (16–20 Muharram)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Syed Ali Muhammad Naqvi" },
  { month: 1, day: 20, title: "Pre-Arbaeen Majlis", titleUr: "مجلسِ چہلم تیاری", kind: "majlis" },
  { month: 1, day: 21, title: "Majlis Series (21–25 Muharram)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Syed Muhammad Taqi Shah Naqvi" },
  { month: 1, day: 25, title: "Martyrdom of Imam Zain-ul-Abideen (AS)", titleUr: "شہادتِ امام زین العابدینؑ", kind: "majlis" },
  { month: 1, day: 26, title: "Majlis Series (26–30 Muharram)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Ikhlaq Hussain Shirazi" },

  { month: 2, day: 1, title: "Majlis Series (1–5 Safar)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Ghulam Raza Rohani" },
  { month: 2, day: 6, title: "Majlis Series (6–10 Safar)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Syed Hassan Zafar Naqvi" },
  { month: 2, day: 7, title: "Birth of Imam Musa Kazim (AS)", titleUr: "ولادتِ امام موسیٰ کاظمؑ", kind: "milad" },
  { month: 2, day: 11, title: "Majlis Series, Arbaeen lead-up (11–15 Safar)", titleUr: "مجلس سلسلہ (اربعین)", kind: "majlis", note: "Speaker: Maulana Sheikh Sikhawat Ali Qumi" },
  { month: 2, day: 13, title: "Martyrdom of Lady Sukayna (SA)", titleUr: "شہادتِ بی بی سکینہؑ", kind: "majlis" },
  { month: 2, day: 16, title: "Majlis Series (16–20 Safar)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Hafiz Syed Muhammad Haidar Naqvi" },
  { month: 2, day: 17, title: "Taboot of Imam Ali Reza (AS)", titleUr: "تابوتِ امام علی رضاؑ", kind: "majlis" },
  { month: 2, day: 20, title: "Arbaeen of Imam Hussain (AS)", titleUr: "اربعینِ امام حسینؑ", kind: "majlis" },
  { month: 2, day: 21, title: "Majlis Series (21–25 Safar)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Muhammad Raza Dawoodi" },
  { month: 2, day: 28, title: "Demise of Prophet (PBUH) & Martyrdom of Imam Hassan (AS)", titleUr: "رحلتِ رسولِ اکرمؐ و شہادتِ امام حسنؑ", kind: "majlis" },
  { month: 2, day: 29, title: "Martyrdom of Imam Reza (AS)", titleUr: "شہادتِ امام رضاؑ", kind: "majlis" },

  { month: 3, day: 8, title: "Martyrdom of Imam Hassan Askari (AS)", titleUr: "شہادتِ امام حسن عسکریؑ", kind: "majlis" },
  { month: 3, day: 9, title: "Eid-e-Zahra (SA)", titleUr: "عیدِ زہراؑ", kind: "jashne" },
  { month: 3, day: 12, title: "Birth of Imam Hassan Askari (AS)", titleUr: "ولادتِ امام حسن عسکریؑ", kind: "milad" },
  { month: 3, day: 17, title: "Milad Prophet (PBUH) & Imam Jafar Sadiq (AS)", titleUr: "میلادِ رسولِ اکرمؐ و امام جعفر صادقؑ", kind: "milad" },

  { month: 4, day: 11, title: "Demise of Masuma of Qom (SA)", titleUr: "وفاتِ معصومہ قمؑ", kind: "majlis", note: "Speaker: Maulana Syed Iftikhar Hussain Naqvi" },

  { month: 5, day: 5, title: "Birth of Bibi Zainab (SA)", titleUr: "ولادتِ بی بی زینبؑ", kind: "milad" },
  { month: 5, day: 9, title: "Ayyam-e-Fatimiyah Majlis Series (9–13 Jamadi-ul-Awwal)", titleUr: "ایامِ فاطمیہ", kind: "majlis", note: "Speaker: Maulana Nasir Haidar" },
  { month: 5, day: 13, title: "Martyrdom of Bibi Fatima Zahra (SA)", titleUr: "شہادتِ بی بی فاطمہ زہراؑ", kind: "majlis" },
  { month: 5, day: 15, title: "Birth of Imam Zain-ul-Abideen (AS)", titleUr: "ولادتِ امام زین العابدینؑ", kind: "milad" },
  { month: 5, day: 24, title: "Ayyam-e-Fatimiyah Majlis Series (24–28 Jamadi-ul-Awwal)", titleUr: "ایامِ فاطمیہ", kind: "majlis", note: "Speaker: Maulana Ikhlaq Hussain Shirazi" },

  { month: 6, day: 1, title: "Ayyam-e-Fatimiyah Majlis Series (1–5 Jamadi-us-Sani)", titleUr: "ایامِ فاطمیہ", kind: "majlis", note: "Speaker: Maulana Syed Hassan Zafar Naqvi" },
  { month: 6, day: 20, title: "Birth of Bibi Fatima Zahra (SA)", titleUr: "ولادتِ بی بی فاطمہ زہراؑ", kind: "milad" },
  { month: 6, day: 27, title: "Martyrdom of Imam Ali Naqi (AS)", titleUr: "شہادتِ امام علی نقیؑ", kind: "majlis" },

  { month: 7, day: 1, title: "Birth of Imam Muhammad Baqir (AS)", titleUr: "ولادتِ امام محمد باقرؑ", kind: "milad" },
  { month: 7, day: 3, title: "Martyrdom of Imam Ali Naqi (AS)", titleUr: "شہادتِ امام علی نقیؑ", kind: "majlis" },
  { month: 7, day: 10, title: "Birth of Imam Muhammad Taqi (AS)", titleUr: "ولادتِ امام محمد تقیؑ", kind: "milad" },
  { month: 7, day: 13, title: "Birth of Imam Ali (AS)", titleUr: "ولادتِ امیر المومنین علیؑ", kind: "milad" },
  { month: 7, day: 15, title: "Demise of Bibi Zainab (SA)", titleUr: "وفاتِ بی بی زینبؑ", kind: "majlis" },
  { month: 7, day: 25, title: "Martyrdom of Imam Musa Kazim (AS)", titleUr: "شہادتِ امام موسیٰ کاظمؑ", kind: "majlis" },
  { month: 7, day: 26, title: "Demise of Hazrat Abu Talib (AS)", titleUr: "وفاتِ ابو طالبؑ", kind: "majlis" },
  { month: 7, day: 27, title: "Eid-e-Mubahisa (Bisaat)", titleUr: "عیدِ مبعث", kind: "jashne" },
  { month: 7, day: 28, title: "Imam Hussain's (AS) Departure from Medina", titleUr: "روانگیٔ امام حسینؑ از مدینہ", kind: "majlis" },

  { month: 8, day: 3, title: "Birth of Imam Hussain (AS)", titleUr: "ولادتِ امام حسینؑ", kind: "milad" },
  { month: 8, day: 4, title: "Birth of Hazrat Abbas (AS)", titleUr: "ولادتِ حضرت عباسؑ", kind: "milad" },
  { month: 8, day: 5, title: "Birth of Imam Zain-ul-Abideen (AS)", titleUr: "ولادتِ امام زین العابدینؑ", kind: "milad" },
  { month: 8, day: 11, title: "Five Khutbas (11–15 Shaban)", titleUr: "پانچ خطبات", kind: "majlis", note: "Speakers: Maulana Zaki Baqri, Maulana Hassan Zafar Naqvi" },
  { month: 8, day: 11, title: "Birth of Ali Akbar (AS)", titleUr: "ولادتِ علی اکبرؑ", kind: "milad" },
  { month: 8, day: 15, title: "Birth of Imam Mahdi (AJ) - Shab-e-Barat", titleUr: "ولادتِ امام مہدیؑ - شبِ برات", kind: "milad" },

  { month: 9, day: 1, title: "Start of Ramadan - Iftar & Programs", titleUr: "آغازِ ماہِ رمضان", kind: "majlis" },
  { month: 9, day: 15, title: "Birth of Imam Hassan (AS)", titleUr: "ولادتِ امام حسنؑ", kind: "milad" },
  { month: 9, day: 18, title: "Majlis for Martyrdom of Imam Ali (AS) (18–21 Ramadan)", titleUr: "شہادتِ امیر المومنین علیؑ کی مجلس", kind: "majlis" },
  { month: 9, day: 19, title: "Shab-e-Qadr (1st) - Zarbat Imam Ali (AS)", titleUr: "شبِ قدر (پہلی)", kind: "aamaal" },
  { month: 9, day: 21, title: "Martyrdom of Imam Ali (AS)", titleUr: "شہادتِ امیر المومنین علیؑ", kind: "majlis" },
  { month: 9, day: 21, title: "I'tikaf (21–23 Ramadan)", titleUr: "اعتکاف", kind: "aamaal" },
  { month: 9, day: 23, title: "Shab-e-Qadr", titleUr: "شبِ قدر", kind: "aamaal" },

  { month: 10, day: 1, title: "Eid-ul-Fitr", titleUr: "عید الفطر", kind: "jashne" },
  { month: 10, day: 13, title: "Three-Day Majlis (13–15 Shawwal)", titleUr: "مجلس سلسلہ", kind: "majlis", note: "Speaker: Maulana Afzal Haidari" },
  { month: 10, day: 25, title: "Martyrdom of Imam Jafar Sadiq (AS)", titleUr: "شہادتِ امام جعفر صادقؑ", kind: "majlis" },

  { month: 11, day: 11, title: "Birth of Imam Reza (AS)", titleUr: "ولادتِ امام رضاؑ", kind: "milad" },

  { month: 12, day: 1, title: "Marriage of Bibi Fatima (SA)", titleUr: "شادیِ حضرت فاطمہؑ", kind: "milad" },
  { month: 12, day: 7, title: "Martyrdom of Imam Muhammad Baqir (AS)", titleUr: "شہادتِ امام محمد باقرؑ", kind: "majlis" },
  { month: 12, day: 9, title: "Day of Arafah - Martyrdom of Muslim ibn Aqeel (AS)", titleUr: "یومِ عرفہ - شہادتِ مسلم بن عقیلؑ", kind: "majlis" },
  { month: 12, day: 10, title: "Eid-ul-Adha", titleUr: "عید الاضحیٰ", kind: "jashne" },
  { month: 12, day: 15, title: "Birth of Imam Ali Naqi (AS)", titleUr: "ولادتِ امام علی نقیؑ", kind: "milad" },
  { month: 12, day: 18, title: "Eid-e-Ghadeer", titleUr: "عیدِ غدیر", kind: "jashne" },
  { month: 12, day: 24, title: "Day of Mubahala", titleUr: "مباہلہ", kind: "majlis" },
];

export const TRUST_SETTINGS: Record<string, string> = {
  org_name: TRUST.name,
  org_tagline: TRUST.tagline,
  org_address: TRUST.address,
  org_phone: TRUST.phone,
  org_email: TRUST.email,
  receipt_footer: "May Allah accept your contribution. Please keep this receipt.",
  whatsapp_country_code: "92",
  whatsapp_number: TRUST.whatsapp,
  bank_name: BANK.bankName,
  bank_account_title: BANK.accountTitle,
  bank_account_number: BANK.accountNumber,
  bank_iban: BANK.iban,
};
