"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DepartamentoKey,
  HerramientaKey,
  NormativaKey,
  ProcesoCriticoKey,
  SectorKey,
  SistemaOperativoKey,
} from "@/lib/constants";

/**
 * Estado del asistente de alta.
 *
 * Este store guarda ÚNICAMENTE lo que el usuario va tecleando mientras recorre
 * el asistente, para que no se pierda si recarga a mitad. En cuanto termina, los
 * datos se envían a la server action `completarOnboarding` y pasan a vivir en
 * PostgreSQL.
 *
 * Lo que antes vivía aquí y ya NO:
 *  - `role`: ahora es una columna de la tabla `User`. Se dejó de guardar en el
 *    navegador porque permitía autoconcederse permisos de DPO con un clic.
 *  - `trainingPillsCompleted`: era un contador ciego que se incrementaba sin
 *    saber qué píldora se había completado. Ahora son filas de `TrainingProgress`.
 *  - `onboardingComplete`: el control de acceso al dashboard lo hace el servidor
 *    con una cookie; ver `src/lib/session.ts`.
 */
interface OnboardingState {
  companyName: string;
  sector: SectorKey | null;
  department: DepartamentoKey | null;

  // Perfilado de la empresa (preguntas multirespuesta).
  sistemasOperativos: SistemaOperativoKey[];
  procesos: ProcesoCriticoKey[];
  herramientas: HerramientaKey[];
  otrasHerramientas: string[];
  normativas: NormativaKey[];

  setCompanyName: (name: string) => void;
  setSector: (sector: SectorKey) => void;
  setDepartment: (department: DepartamentoKey) => void;
  alternarSistemaOperativo: (clave: SistemaOperativoKey) => void;
  alternarProceso: (clave: ProcesoCriticoKey) => void;
  alternarHerramienta: (clave: HerramientaKey) => void;
  alternarNormativa: (clave: NormativaKey) => void;
  anadirOtraHerramienta: (nombre: string) => void;
  quitarOtraHerramienta: (nombre: string) => void;
  resetOnboarding: () => void;
}

/** Añade o quita un elemento de una lista, sin mutar la original. */
function alternar<T>(lista: T[], elemento: T): T[] {
  return lista.includes(elemento)
    ? lista.filter((x) => x !== elemento)
    : [...lista, elemento];
}

const ESTADO_INICIAL = {
  companyName: "",
  sector: null,
  department: null,
  sistemasOperativos: [],
  procesos: [],
  herramientas: [],
  otrasHerramientas: [],
  normativas: [],
} satisfies Partial<OnboardingState>;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...ESTADO_INICIAL,

      setCompanyName: (companyName) => set({ companyName }),
      setSector: (sector) => set({ sector }),
      setDepartment: (department) => set({ department }),

      alternarSistemaOperativo: (clave) =>
        set((s) => ({ sistemasOperativos: alternar(s.sistemasOperativos, clave) })),
      alternarProceso: (clave) => set((s) => ({ procesos: alternar(s.procesos, clave) })),
      alternarHerramienta: (clave) =>
        set((s) => ({ herramientas: alternar(s.herramientas, clave) })),
      alternarNormativa: (clave) =>
        set((s) => ({ normativas: alternar(s.normativas, clave) })),

      anadirOtraHerramienta: (nombre) =>
        set((s) => {
          const limpio = nombre.trim();
          if (!limpio || s.otrasHerramientas.includes(limpio)) return s;
          return { otrasHerramientas: [...s.otrasHerramientas, limpio] };
        }),
      quitarOtraHerramienta: (nombre) =>
        set((s) => ({
          otrasHerramientas: s.otrasHerramientas.filter((x) => x !== nombre),
        })),

      resetOnboarding: () => set(ESTADO_INICIAL),
    }),
    { name: "nexusguard-onboarding" }
  )
);

/** Indica si el estado persistido (localStorage) ya se ha rehidratado en el
 * cliente. Se apoya en `useSyncExternalStore` en vez de un efecto + setState
 * para evitar el falso "parpadeo" servidor/cliente sin renders en cascada. */
export function useOnboardingHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useOnboardingStore.persist.onFinishHydration(callback),
    () => useOnboardingStore.persist.hasHydrated(),
    () => false
  );
}
