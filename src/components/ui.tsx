import * as React from "react";
import Link from "next/link";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Star({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="-11 -11 22 22"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <polygon
        points="0,-11 1.68,-4.07 7.78,-7.78 4.07,-1.68 11,0 4.07,1.68 7.78,7.78 1.68,4.07 0,11 -1.68,4.07 -7.78,7.78 -4.07,1.68 -11,0 -4.07,-1.68 -7.78,-7.78 -1.68,-4.07"
        fill="currentColor"
      />
    </svg>
  );
}

export function StarDivider({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center justify-center gap-2 text-gold", className)} aria-hidden>
      <span className="h-px w-10 bg-gold/30" />
      <Star size={8} />
      <Star size={14} />
      <Star size={8} />
      <span className="h-px w-10 bg-gold/30" />
    </div>
  );
}

/* ------------------------------------------------------------- surfaces */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  urdu,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: React.ReactNode;
  urdu?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        {(urdu || eyebrow) && (
          <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {urdu && <p className="urdu w-fit text-gold">{urdu}</p>}
          </div>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- buttons */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const buttonSizes = {
  sm: "h-9 min-h-9 px-3 text-[13px]",
  md: "h-10 min-h-10 px-4",
  lg: "h-12 min-h-12 px-6 text-base",
};

const buttonVariants = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary:
    "border-[1.5px] border-primary bg-transparent font-semibold text-primary hover:bg-primary hover:text-primary-foreground",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  gold: "font-semibold text-gold-foreground shadow-[var(--shadow-gold)] [background-image:var(--gradient-gold)] hover:-translate-y-0.5 hover:shadow-[0_12px_35px_-8px_oklch(0.74_0.135_80_/_0.55)]",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
    />
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      {...rest}
      className={cx(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
    >
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- fields */

export function Field({
  label,
  urdu,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  urdu?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.95rem] font-semibold text-foreground">
        <span>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {urdu && <span className="urdu text-sm font-normal text-muted-foreground">{urdu}</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-lg border border-input bg-background px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-muted aria-[invalid=true]:border-destructive";

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  },
) {
  return <input dir="auto" {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, "pr-8", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea dir="auto" {...props} className={cx(inputClass, props.className)} />;
}

/* --------------------------------------------------------------- badges */

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "green" | "brass" | "red";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-primary/10 text-primary",
    brass: "border border-gold/40 bg-gold/15 text-gold-foreground",
    red: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- tables */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[32rem] border-collapse text-sm sm:min-w-[560px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cx(
        "border-b border-border bg-muted px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cx(
        "border-b border-border px-5 py-3 align-middle text-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-cream px-6 py-12 text-center">
      <p className="font-display text-lg font-bold text-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
