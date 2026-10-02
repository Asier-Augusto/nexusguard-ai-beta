"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { DEPARTAMENTOS } from "@/lib/constants";
import { cambiarUsuarioActivo } from "@/app/actions/sesion";
import type { OpcionUsuario } from "@/lib/session";
import { cn } from "@/lib/utils";

const ETIQUETA_ROL: Record<string, string> = {
  EMPLEADO: "Empleado",
  DPO: "DPO",
  ADMIN: "Administrador",
};

/**
 * Selector "Ver como": cambia el punto de vista de la demo entre los empleados
 * de la empresa. Sustituye a los antiguos botones de rol, que permitían
 * autoconcederse permisos de DPO sin más.
 *
 * No es un inicio de sesión. El aviso del pie del desplegable lo deja claro en
 * la propia interfaz, no solo en el código.
 */
export function UserSwitcher({
  usuarioActivo,
  usuarios,
}: {
  usuarioActivo: { id: string; nombre: string; rol: string };
  usuarios: OpcionUsuario[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  // Con una sola empresa (el caso normal) nombrarla en cada fila es ruido.
  // Con varias -las de la demo comparativa- es justo lo que hay que ver.
  const variasEmpresas = new Set(usuarios.map((u) => u.empresa)).size > 1;

  function seleccionar(id: string) {
    setAbierto(false);
    if (id === usuarioActivo.id) return;
    iniciarTransicion(() => {
      void cambiarUsuarioActivo(id);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        disabled={pendiente}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pl-2.5 pr-3 text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-accent">
          <Icon name={pendiente ? "LoaderCircle" : "User"} size={17} />
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-foreground">
            {usuarioActivo.nombre}
          </span>
          <span className="block text-xs text-muted">
            {ETIQUETA_ROL[usuarioActivo.rol] ?? usuarioActivo.rol}
          </span>
        </span>
        <Icon name="ChevronDown" size={16} className="text-muted" />
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setAbierto(false)}
              aria-hidden
            />
            <motion.div
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
            >
              <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Ver la plataforma como
              </p>

              <div className="max-h-80 overflow-y-auto py-1">
                {usuarios.map((usuario) => {
                  const activo = usuario.id === usuarioActivo.id;
                  const departamento =
                    DEPARTAMENTOS.find((d) => d.key === usuario.departamento)?.label ??
                    usuario.departamento;

                  return (
                    <button
                      key={usuario.id}
                      role="option"
                      aria-selected={activo}
                      onClick={() => seleccionar(usuario.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        activo ? "bg-accent/10" : "hover:bg-surface-hover"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            activo ? "text-accent" : "text-foreground"
                          )}
                        >
                          {usuario.nombre}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {variasEmpresas && (
                            <b className="font-semibold text-foreground">
                              {usuario.empresa} ·{" "}
                            </b>
                          )}
                          {departamento} · {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
                        </span>
                      </span>
                      {activo && <Icon name="Check" size={16} className="text-accent" />}
                    </button>
                  );
                })}
              </div>

              <p className="border-t border-border px-4 py-2.5 text-xs leading-snug text-muted">
                Cambio de perspectiva para la demo. NexusGuard AI todavía no
                tiene inicio de sesión: esto no autentica a nadie.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
