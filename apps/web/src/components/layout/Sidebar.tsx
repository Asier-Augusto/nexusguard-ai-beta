"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { MODULES, type ModuloKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function Sidebar({
  isOpen,
  onClose,
  modulosDesbloqueados,
  senuelosPendientes,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Calculado en servidor a partir del rol y del progreso real del usuario. */
  modulosDesbloqueados: ModuloKey[];
  /** Senuelos de campanas activas que esta persona no ha mirado todavia. */
  senuelosPendientes: number;
}) {
  const pathname = usePathname();

  // Copia antes de ordenar: `sort` muta el array, y MODULES es un módulo
  // compartido con el resto de la aplicación.
  const modulosOrdenados = [...MODULES].sort((a, b) => a.order - b.order);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed z-40 flex h-[calc(100dvh-5rem)] w-72 flex-col gap-2 border-r border-border bg-surface p-4 transition-transform md:sticky md:top-20 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className={cn(
            "mb-2 flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors",
            pathname === "/dashboard"
              ? "bg-accent/10 text-accent"
              : "text-foreground hover:bg-surface-hover"
          )}
        >
          <Icon name="LayoutDashboard" size={22} />
          Panel Principal
        </Link>

        {/*
          El buzón no es un módulo del catálogo: es donde se entregan los
          señuelos de las campañas, y lo ve todo el mundo. Se deja aquí, como
          entrada fija, en vez de añadirlo a MODULES, porque eso obligaría a
          ampliar el enum ModuloClave del esquema y a darle un ModuleToggle
          por empresa para algo que no se contrata ni se desbloquea.
        */}
        <Link
          href="/dashboard/buzon"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors",
            pathname.startsWith("/dashboard/buzon")
              ? "bg-accent/10 text-accent"
              : "text-foreground hover:bg-surface-hover"
          )}
        >
          <Icon name="Inbox" size={22} />
          <span className="flex-1">Buzón</span>
          {senuelosPendientes > 0 && (
            <span
              className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-[#001015]"
              title="Mensajes sin revisar"
            >
              {senuelosPendientes}
            </span>
          )}
        </Link>

        <p className="mb-1 mt-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Módulos
        </p>

        {modulosOrdenados.map((mod) => {
          const unlocked = modulosDesbloqueados.includes(mod.key);
          const active = pathname.startsWith(mod.href);

          if (!unlocked) {
            return (
              <div
                key={mod.key}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3.5 text-base text-muted/60"
                title="Módulo bloqueado: completa los pasos previos para desbloquearlo"
              >
                <Icon name="Lock" size={20} />
                <span className="flex-1">{mod.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={mod.key}
              href={mod.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-foreground hover:bg-surface-hover"
              )}
            >
              <Icon name={mod.icon} size={22} />
              <span className="flex-1">{mod.label}</span>
              {active && <Icon name="ChevronRight" size={18} />}
            </Link>
          );
        })}

        <div className="mt-auto rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-sm font-semibold text-foreground">
            ¿Necesitas ayuda?
          </p>
          <p className="mt-1 text-sm text-muted">
            Escribe a soporte@nexusguard.ai
          </p>
        </div>
      </aside>
    </>
  );
}
