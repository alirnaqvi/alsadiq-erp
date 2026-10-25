export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export function parseBloodGroup(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return BLOOD_GROUPS.includes(compact as (typeof BLOOD_GROUPS)[number]) ? compact : null;
}
