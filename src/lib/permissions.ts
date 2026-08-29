/**
 * Every capability in the system has a key. A role holds a list of these keys.
 * Adding a permission here and ticking it on a role is all it takes to widen
 * access — no code changes elsewhere.
 */
export const PERMISSIONS = [
  { key: "collection.create", group: "Collection", label: "Record donations" },
  { key: "collection.view", group: "Collection", label: "View donation records" },
  { key: "collection.void", group: "Collection", label: "Void / reverse a receipt" },
  { key: "donor.create", group: "Donors", label: "Register donors" },
  { key: "donor.edit", group: "Donors", label: "Edit donor details" },
  { key: "donor.view", group: "Donors", label: "View donors" },
  { key: "member.manage", group: "Membership", label: "Manage monthly members" },
  { key: "head.manage", group: "Setup", label: "Manage collection heads" },
  { key: "user.manage", group: "Setup", label: "Manage users" },
  { key: "role.manage", group: "Setup", label: "Manage roles and permissions" },
  { key: "settings.manage", group: "Setup", label: "Change trust settings" },
  { key: "report.view", group: "Reports", label: "Run and export reports" },
  { key: "audit.view", group: "Reports", label: "Read the audit trail" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as PermissionKey[];

export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export function can(permissions: string[], key: PermissionKey) {
  return permissions.includes(key);
}

export const SCOPE_LABEL: Record<string, string> = {
  own: "Only their own entries",
  team: "Their own and their team's entries",
  all: "Every entry in the trust",
};
