import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

const registry = LucideIcons as unknown as Record<string, ComponentType<LucideProps>>;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = registry[name];
  if (!Cmp) return null;
  return <Cmp {...props} />;
}
