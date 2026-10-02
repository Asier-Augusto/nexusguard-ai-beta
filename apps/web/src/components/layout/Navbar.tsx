"use client";

import Link from "next/link";
import { NexusGuardLogo } from "@/components/logo/NexusGuardLogo";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { Icon } from "@/components/ui/Icon";
import { SECTORES } from "@/lib/constants";
import type { OpcionUsuario, UsuarioActivo } from "@/lib/session";

export function Navbar({
  usuario,
  usuarios,
  onToggleSidebar,
}: {
  usuario: UsuarioActivo;
  usuarios: OpcionUsuario[];
  onToggleSidebar?: () => void;
}) {
  const sector =
    SECTORES.find((s) => s.key === usuario.empresa.sector)?.label ??
    usuario.empresa.sector;

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="Menu" size={26} />
        </button>
        <NexusGuardLogo size={38} />
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <Link
          href="/dashboard/perfil"
          className="hidden rounded-lg px-2 py-1 text-right transition-colors hover:bg-surface-hover sm:block"
          title="Ver el perfil de la empresa"
        >
          <p className="text-sm font-medium text-foreground">{usuario.empresa.nombre}</p>
          <p className="text-xs text-muted">{sector}</p>
        </Link>

        <UserSwitcher
          usuarioActivo={{ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }}
          usuarios={usuarios}
        />
      </div>
    </header>
  );
}
