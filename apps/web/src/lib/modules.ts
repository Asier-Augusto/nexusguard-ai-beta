export type ModuloKey =
  | "FORMACION"
  | "EVALUACION_ADAPTATIVA"
  | "SIMULADOR_PHISHING"
  | "COMMAND_CENTER_DPO";

export interface ModuloConfig {
  key: ModuloKey;
  order: number;
  label: string;
  description: string;
  icon: string;
  href: string;
  /** Roles que pueden ver este módulo desbloqueado */
  roles: Array<"EMPLEADO" | "DPO" | "ADMIN">;
}

export const MODULES: ModuloConfig[] = [
  {
    key: "FORMACION",
    order: 1,
    label: "Formación Inmersiva",
    description: "Píldoras de microlearning interactivas de 3, 5 y 10 minutos.",
    icon: "BookOpenCheck",
    href: "/dashboard/formacion",
    roles: ["EMPLEADO", "DPO", "ADMIN"],
  },
  {
    key: "EVALUACION_ADAPTATIVA",
    order: 2,
    label: "Evaluación Adaptativa",
    description: "Test inteligente que se ajusta a tu nivel en tiempo real.",
    icon: "BrainCircuit",
    href: "/dashboard/evaluacion",
    roles: ["EMPLEADO", "DPO", "ADMIN"],
  },
  {
    key: "SIMULADOR_PHISHING",
    order: 3,
    label: "Simulador de Phishing",
    description: "Campañas de correos trampa generadas con IA contextual.",
    icon: "Fish",
    href: "/dashboard/phishing",
    roles: ["DPO", "ADMIN"],
  },
  {
    key: "COMMAND_CENTER_DPO",
    order: 4,
    label: "Command Center DPO",
    description: "Risk Score de empleados y reportes de cumplimiento (ISO 42001 / RGPD).",
    icon: "ShieldAlert",
    href: "/dashboard/command-center",
    roles: ["DPO", "ADMIN"],
  },
];
