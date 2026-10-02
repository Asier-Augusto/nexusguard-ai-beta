export type SectorKey =
  | "LOGISTICA"
  | "SANIDAD"
  | "FINANZAS"
  | "RETAIL"
  | "HOSTELERIA"
  | "INDUSTRIA"
  | "TECNOLOGIA"
  | "EDUCACION"
  | "ADMINISTRACION_PUBLICA"
  | "OTRO";

export type DepartamentoKey =
  | "DIRECCION"
  | "RRHH"
  | "FINANZAS"
  | "IT"
  | "LOGISTICA"
  | "VENTAS"
  | "MARKETING"
  | "ATENCION_CLIENTE"
  | "LEGAL"
  | "OPERACIONES"
  | "OTRO";

export const SECTORES: { key: SectorKey; label: string; icon: string }[] = [
  { key: "LOGISTICA", label: "Logística y Transporte", icon: "Truck" },
  { key: "SANIDAD", label: "Sanidad", icon: "HeartPulse" },
  { key: "FINANZAS", label: "Finanzas y Banca", icon: "Landmark" },
  { key: "RETAIL", label: "Retail y Comercio", icon: "ShoppingBag" },
  { key: "HOSTELERIA", label: "Hostelería y Restauración", icon: "UtensilsCrossed" },
  { key: "INDUSTRIA", label: "Industria y Fabricación", icon: "Factory" },
  { key: "TECNOLOGIA", label: "Tecnología", icon: "Cpu" },
  { key: "EDUCACION", label: "Educación", icon: "GraduationCap" },
  { key: "ADMINISTRACION_PUBLICA", label: "Administración Pública", icon: "Building2" },
  { key: "OTRO", label: "Otro sector", icon: "Sparkles" },
];

export const DEPARTAMENTOS: { key: DepartamentoKey; label: string; icon: string }[] = [
  { key: "DIRECCION", label: "Dirección General", icon: "Crown" },
  { key: "RRHH", label: "Recursos Humanos", icon: "Users" },
  { key: "FINANZAS", label: "Finanzas y Contabilidad", icon: "Coins" },
  { key: "IT", label: "IT / Sistemas", icon: "Server" },
  { key: "LOGISTICA", label: "Logística", icon: "Truck" },
  { key: "VENTAS", label: "Ventas", icon: "TrendingUp" },
  { key: "MARKETING", label: "Marketing", icon: "Megaphone" },
  { key: "ATENCION_CLIENTE", label: "Atención al Cliente", icon: "Headset" },
  { key: "LEGAL", label: "Legal y Cumplimiento", icon: "Scale" },
  { key: "OPERACIONES", label: "Operaciones", icon: "Settings" },
  { key: "OTRO", label: "Otro departamento", icon: "Sparkles" },
];

// --- Catálogos del perfil de empresa ---------------------------------------
// Mismo formato que los de arriba: la clave es el valor literal del enum de
// Prisma, la etiqueta es el texto que ve el usuario y el icono es un nombre de
// componente de lucide-react. Ojo: `Icon` resuelve el nombre en tiempo de
// ejecución y devuelve null si no existe, sin error, así que cualquier icono
// nuevo hay que comprobarlo antes.

// Las claves se derivan de los enums generados por Prisma en vez de repetirse a
// mano (como sí ocurre arriba con SectorKey y DepartamentoKey). Es un import de
// solo tipos, así que desaparece al compilar y estas constantes se pueden seguir
// usando desde componentes de cliente. La ventaja: si alguien añade un valor al
// enum y olvida el catálogo, o al revés, lo caza el compilador en vez de
// aparecer como una tarjeta que no se puede seleccionar.
import type {
  HerramientaCorporativa,
  Normativa,
  ProcesoCritico,
  SistemaOperativo,
} from "@/generated/prisma/enums";

export type SistemaOperativoKey = SistemaOperativo;
export type ProcesoCriticoKey = ProcesoCritico;
export type HerramientaKey = HerramientaCorporativa;
export type NormativaKey = Normativa;

export interface EntradaCatalogo<K extends string> {
  key: K;
  label: string;
  icon: string;
}

/**
 * Convierte un diccionario indexado por los valores del enum en la lista que
 * consume la interfaz. Al declararse como `Record<Clave, …>`, TypeScript exige
 * que estén TODOS los valores del enum: si mañana se añade uno al esquema de
 * Prisma y se olvida aquí, el proyecto no compila.
 */
function aCatalogo<K extends string, V extends object>(
  diccionario: Record<K, V>
): ({ key: K } & V)[] {
  return (Object.keys(diccionario) as K[]).map((key) => ({ key, ...diccionario[key] }));
}

export const SISTEMAS_OPERATIVOS = aCatalogo<SistemaOperativoKey, { label: string; icon: string }>({
  WINDOWS: { label: "Windows", icon: "MonitorCog" },
  MACOS: { label: "macOS", icon: "Laptop" },
  LINUX: { label: "Linux", icon: "TerminalSquare" },
  ANDROID: { label: "Android", icon: "Smartphone" },
  IOS: { label: "iOS", icon: "Tablet" },
});

export const PROCESOS = aCatalogo<ProcesoCriticoKey, { label: string; icon: string }>({
  FACTURACION: { label: "Facturación", icon: "Receipt" },
  NOMINAS: { label: "Nóminas", icon: "Wallet" },
  COMPRAS_PROVEEDORES: { label: "Compras a proveedores", icon: "PackageCheck" },
  ATENCION_CLIENTE: { label: "Atención al cliente", icon: "Headset" },
  GESTION_ENVIOS: { label: "Gestión de envíos", icon: "Truck" },
  DESARROLLO_SOFTWARE: { label: "Desarrollo de software", icon: "Code2" },
  ADMINISTRACION_SISTEMAS: { label: "Administración de sistemas", icon: "ServerCog" },
  GESTION_DOCUMENTAL: { label: "Gestión documental", icon: "FolderKanban" },
  CONTRATACION: { label: "Contratación", icon: "FileSignature" },
  TRATAMIENTO_DATOS_PERSONALES: {
    label: "Tratamiento de datos personales",
    icon: "UserRoundCog",
  },
});

export const HERRAMIENTAS = aCatalogo<HerramientaKey, { label: string; icon: string }>({
  MICROSOFT_365: { label: "Microsoft 365", icon: "Mail" },
  GOOGLE_WORKSPACE: { label: "Google Workspace", icon: "Cloud" },
  SLACK: { label: "Slack", icon: "MessagesSquare" },
  TEAMS: { label: "Microsoft Teams", icon: "Video" },
  ZOOM: { label: "Zoom", icon: "Video" },
  SAP: { label: "SAP", icon: "Boxes" },
  SALESFORCE: { label: "Salesforce", icon: "ChartNoAxesCombined" },
  JIRA: { label: "Jira", icon: "SquareKanban" },
  DROPBOX: { label: "Dropbox", icon: "HardDriveDownload" },
  VPN_CORPORATIVA: { label: "VPN corporativa", icon: "ShieldEllipsis" },
  ERP_PROPIO: { label: "ERP propio", icon: "Building" },
  CRM_PROPIO: { label: "CRM propio", icon: "Contact" },
});

/** `nombreCompleto` se usa en el informe de cumplimiento, donde no vale la sigla. */
export const NORMATIVAS = aCatalogo<
  NormativaKey,
  { label: string; nombreCompleto: string; icon: string }
>({
  RGPD: {
    label: "RGPD",
    nombreCompleto: "Reglamento General de Protección de Datos",
    icon: "Scale",
  },
  LOPDGDD: {
    label: "LOPDGDD",
    nombreCompleto:
      "Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales",
    icon: "Landmark",
  },
  ENS: {
    label: "ENS",
    nombreCompleto: "Esquema Nacional de Seguridad",
    icon: "ShieldCheck",
  },
  ISO_27001: {
    label: "ISO/IEC 27001",
    nombreCompleto: "ISO/IEC 27001 — Gestión de la Seguridad de la Información",
    icon: "FileBadge",
  },
  ISO_42001: {
    label: "ISO/IEC 42001",
    nombreCompleto: "ISO/IEC 42001 — Sistema de Gestión de Inteligencia Artificial",
    icon: "BrainCircuit",
  },
  NIS2: {
    label: "NIS2",
    nombreCompleto: "Directiva NIS2 sobre ciberseguridad de redes y sistemas",
    icon: "Network",
  },
  PCI_DSS: {
    label: "PCI DSS",
    nombreCompleto: "PCI DSS — Seguridad de los datos de medios de pago",
    icon: "CreditCard",
  },
  DORA: {
    label: "DORA",
    nombreCompleto: "Reglamento DORA de resiliencia operativa digital",
    icon: "Banknote",
  },
});
