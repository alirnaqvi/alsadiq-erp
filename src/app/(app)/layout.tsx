import { requireUser } from "@/lib/auth";
import { hijri } from "@/lib/format";
import { getSettings } from "@/lib/queries";
import Shell, { type NavItem } from "@/components/Shell";
import { logout } from "@/app/login/actions";

const ALL_NAV: (NavItem & { permission?: string })[] = [
  { href: "/dashboard", label: "Dashboard", group: "Daily work" },
  { href: "/collect", label: "Collect", group: "Daily work", permission: "collection.create" },
  { href: "/receipts", label: "Receipts", group: "Daily work", permission: "collection.view" },
  { href: "/donors", label: "Donors", group: "Daily work", permission: "donor.view" },
  { href: "/members", label: "Monthly members", group: "Daily work", permission: "member.manage" },
  { href: "/reports", label: "Reports", group: "Oversight", permission: "report.view" },
  { href: "/audit", label: "Audit trail", group: "Oversight", permission: "audit.view" },
  { href: "/heads", label: "Collection heads", group: "Setup", permission: "head.manage" },
  { href: "/users", label: "Users", group: "Setup", permission: "user.manage" },
  { href: "/roles", label: "Roles", group: "Setup", permission: "role.manage" },
  { href: "/settings", label: "Trust settings", group: "Setup", permission: "settings.manage" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  const items = ALL_NAV.filter(
    (i) => !i.permission || user.permissions.includes(i.permission),
  ).map(({ href, label, group }) => ({ href, label, group }));

  return (
    <Shell
      items={items}
      user={{ fullName: user.fullName, roleName: user.roleName }}
      hijriToday={hijri(new Date())}
      logo={settings.org_logo}
      orgName={settings.org_name}
      onSignOut={
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-ink-300 underline underline-offset-4 hover:text-white"
          >
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </Shell>
  );
}
