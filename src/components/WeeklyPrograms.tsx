import { WEEKLY_PROGRAMS } from "@/lib/trust-facts";
import { Card } from "@/components/ui";

export function WeeklyPrograms() {
  return (
    <Card padded={false}>
      <div className="px-5 pb-3 pt-5">
        <p className="urdu text-sm text-gold">ہفتہ وار پروگرام</p>
        <h2 className="font-display text-xl font-bold text-primary">Weekly Programs</h2>
      </div>
      <ul className="divide-y divide-border">
        {WEEKLY_PROGRAMS.map((p) => (
          <li key={`${p.day}-${p.name}`} className="flex items-baseline gap-4 px-5 py-3">
            <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-widest text-gold">{p.day}</span>
            <span className="flex-1 font-medium text-foreground">{p.name}</span>
            <span className="shrink-0 text-sm text-muted-foreground">{p.time}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
