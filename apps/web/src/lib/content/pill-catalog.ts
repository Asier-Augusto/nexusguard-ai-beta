export interface PillCatalogEntry {
  topicKey: string;
  label: string;
  icon: string;
  durations: number[];
  category: string;
  href?: string;
}

export const PILL_CATALOG: PillCatalogEntry[] = [
  { topicKey: "DOBLE_FACTOR", label: "Doble Factor (2FA)", icon: "KeyRound", durations: [3, 5, 10], category: "Identidad", href: "/dashboard/formacion/2fa" },
  { topicKey: "EMAIL", label: "Correo y Phishing", icon: "Mail", durations: [5, 10], category: "Comunicación" },
  { topicKey: "WINDOWS", label: "Seguridad en Windows", icon: "MonitorCog", durations: [5, 10], category: "Sistemas" },
  { topicKey: "MACOS", label: "Seguridad en macOS", icon: "Laptop", durations: [5, 10], category: "Sistemas" },
  { topicKey: "LINUX", label: "Seguridad en Linux", icon: "TerminalSquare", durations: [10], category: "Sistemas" },
  { topicKey: "ANDROID", label: "Seguridad en Android", icon: "Smartphone", durations: [3, 5], category: "Dispositivos" },
  { topicKey: "IOS", label: "Seguridad en iOS", icon: "Tablet", durations: [3, 5], category: "Dispositivos" },
  { topicKey: "IOT", label: "Dispositivos IoT", icon: "Router", durations: [5], category: "Dispositivos" },
  { topicKey: "SEGURIDAD_DATO", label: "Seguridad del Dato", icon: "Database", durations: [5, 10], category: "Datos" },
  { topicKey: "USO_IA", label: "Uso responsable de la IA", icon: "BrainCircuit", durations: [5, 10], category: "Inteligencia Artificial" },
  { topicKey: "CONTRASENAS", label: "Contraseñas seguras", icon: "LockKeyhole", durations: [5], category: "Identidad" },
];
