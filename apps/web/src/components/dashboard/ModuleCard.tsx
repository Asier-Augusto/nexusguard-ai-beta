import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import type { ModuloConfig } from "@/lib/modules";

export function ModuleCard({
  module,
  unlocked,
}: {
  module: ModuloConfig;
  unlocked: boolean;
}) {
  const content = (
    <Card
      className={`h-full transition-all ${
        unlocked ? "hover:border-accent/50 hover:bg-surface-hover" : "opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon name={module.icon} size={26} />
        </div>
        {!unlocked && <Icon name="Lock" size={20} className="text-muted" />}
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground">{module.label}</h3>
      <p className="mt-1 text-sm text-muted">{module.description}</p>
      {unlocked ? (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          Entrar <Icon name="ArrowRight" size={16} />
        </span>
      ) : (
        <span className="mt-4 inline-block text-sm font-medium text-muted">
          Bloqueado
        </span>
      )}
    </Card>
  );

  if (!unlocked) return content;
  return <Link href={module.href}>{content}</Link>;
}
