import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

type BadgeVariant = "neutral" | "accent" | "good" | "warning" | "serious" | "critical";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-surface-hover text-muted border-border",
  accent: "bg-accent/10 text-accent border-accent/30",
  good: "bg-status-good/10 text-status-good border-status-good/30",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/30",
  serious: "bg-status-serious/10 text-status-serious border-status-serious/30",
  critical: "bg-status-critical/10 text-status-critical border-status-critical/30",
};

// Icono obligatorio para variantes de estado: el color nunca transmite el
// significado por sí solo (accesibilidad para daltonismo).
const VARIANT_ICON: Partial<Record<BadgeVariant, string>> = {
  good: "CheckCircle2",
  warning: "AlertTriangle",
  serious: "AlertOctagon",
  critical: "ShieldAlert",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const icon = VARIANT_ICON[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
