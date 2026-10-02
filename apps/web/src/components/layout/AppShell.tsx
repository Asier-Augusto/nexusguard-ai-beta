"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ModuloKey } from "@/lib/modules";
import type { OpcionUsuario, UsuarioActivo } from "@/lib/session";

/**
 * Estructura visual del dashboard. Ya no decide quién puede entrar: de eso se
 * encarga `src/app/dashboard/layout.tsx` en el servidor. Aquí solo queda el
 * estado que realmente pertenece al navegador, que es si el menú lateral está
 * desplegado en pantallas pequeñas.
 */
export function AppShell({
  usuario,
  usuarios,
  modulosDesbloqueados,
  senuelosPendientes,
  children,
}: {
  usuario: UsuarioActivo;
  usuarios: OpcionUsuario[];
  modulosDesbloqueados: ModuloKey[];
  senuelosPendientes: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        usuario={usuario}
        usuarios={usuarios}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          modulosDesbloqueados={modulosDesbloqueados}
          senuelosPendientes={senuelosPendientes}
        />
        <main className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
