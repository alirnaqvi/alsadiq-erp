import { requireUser } from "@/lib/auth";
import { hijri } from "@/lib/format";
import { getSettings } from "@/lib/queries";
import { tx, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import Shell, { type NavItem } from "@/components/Shell";
import { logout } from "@/app/login/actions";

const ALL_NAV: (NavItem & { permission?: string; labelKey: MessageKey; groupKey: MessageKey })[] = [
  { href: "/dashboard", label: "Dashboard", group: "Daily work", labelKey: "nav.dashboard", groupKey: "group.daily" },
  { href: "/collect", label: "Collect", group: "Daily work", labelKey: "nav.collect", groupKey: "group.daily", permission: "collection.create" },
  { href: "/receipts", label: "Receipts", group: "Daily work", labelKey: "nav.receipts", groupKey: "group.daily", permission: "collection.view" },
  { href: "/donors", label: "Donors", group: "Daily work", labelKey: "nav.donors", groupKey: "group.daily", permission: "donor.view" },
  { href: "/members", label: "Monthly members", group: "Daily work", labelKey: "nav.members", groupKey: "group.daily", permission: "member.manage" },
  { href: "/verifications", label: "App sign-ups", group: "Daily work", labelKey: "nav.verifications", groupKey: "group.daily", permission: "donor.verify" },
  { href: "/whatsapp", label: "WhatsApp", group: "Outreach", labelKey: "nav.whatsapp", groupKey: "group.outreach", permission: "whatsapp.send" },
  { href: "/calendar", label: "Calendar", group: "Outreach", labelKey: "nav.calendar", groupKey: "group.outreach" },
  { href: "/reports", label: "Reports", group: "Oversight", labelKey: "nav.reports", groupKey: "group.oversight", permission: "report.view" },
  { href: "/audit", label: "Audit trail", group: "Oversight", labelKey: "nav.audit", groupKey: "group.oversight", permission: "audit.view" },
  { href: "/assets", label: "Assets", group: "Store", labelKey: "nav.assets", groupKey: "group.store", permission: "asset.manage" },
  { href: "/inventory", label: "Inventory", group: "Store", labelKey: "nav.inventory", groupKey: "group.store", permission: "inventory.manage" },
  { href: "/heads", label: "Collection heads", group: "Setup", labelKey: "nav.heads", groupKey: "group.setup", permission: "head.manage" },
  { href: "/users", label: "Users", group: "Setup", labelKey: "nav.users", groupKey: "group.setup", permission: "user.manage" },
  { href: "/roles", label: "Roles", group: "Setup", labelKey: "nav.roles", groupKey: "group.setup", permission: "role.manage" },
  { href: "/settings", label: "Trust settings", group: "Setup", labelKey: "nav.settings", groupKey: "group.setup", permission: "settings.manage" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();
  const t = tx(await getLocale());

  const items = ALL_NAV.filter(
    (i) => !i.permission || user.permissions.includes(i.permission),
  ).map(({ href, labelKey, groupKey }) => ({
    href,
    label: t(labelKey),
    group: t(groupKey),
  }));

  return (
    <Shell
      items={items}
      user={{ fullName: user.fullName, roleName: user.roleName }}
      hijriToday={hijri(new Date())}
      logo={settings.org_logo || "/logo.png"}
      orgName={settings.org_name}
      onSignOut={
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-primary-foreground/75 underline underline-offset-4 hover:text-gold"
          >
            {t("common.signOut")}
          </button>
        </form>
      }
    >
      {children}
    </Shell>
  );
}
