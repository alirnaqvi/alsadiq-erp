/** Pakistani cities used in the donor city dropdown. */
export const CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Karachi",
  "Lahore",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Gujranwala",
  "Sialkot",
  "Sargodha",
  "Bahawalpur",
  "Sukkur",
  "Larkana",
  "Abbottabad",
  "Mardan",
  "Gujrat",
  "Sahiwal",
  "Okara",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Dera Ghazi Khan",
  "Jhelum",
  "Wah Cantt",
  "Taxila",
  "Attock",
  "Chakwal",
  "Mirpur",
  "Muzaffarabad",
  "Gilgit",
  "Other",
] as const;

export type City = (typeof CITIES)[number];

export function guessCity(address: string | null | undefined): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const city of CITIES) {
    if (city === "Other") continue;
    if (lower.includes(city.toLowerCase())) return city;
  }
  if (/\bisb\b|islamabd|islambad/.test(lower)) return "Islamabad";
  if (/rwp|pindi/.test(lower)) return "Rawalpindi";
  if (/korang|g-?[89]|f-1[0-2]|e-?[789]|i-?[89]/.test(lower)) return "Islamabad";
  return null;
}
