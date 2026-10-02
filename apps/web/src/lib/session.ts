/**
 * ============================================================================
 *  ATENCIÓN: ESTO NO ES AUTENTICACIÓN.
 * ============================================================================
 *
 * NexusGuard AI no tiene login. Este módulo resuelve "quién es el usuario
 * actual" leyendo una cookie que guarda, en claro, el id de una fila de la
 * tabla `User`. La cookie NO va firmada ni cifrada: cualquiera que edite sus
 * cookies puede hacerse pasar por otro empleado, incluido el DPO.
 *
 * Es un mecanismo DE DEMOSTRACIÓN, pensado para poder enseñar en vivo cómo
 * cambia la plataforma según quién la mire (un empleado no ve el Command
 * Center, el DPO sí) sin montar un sistema de identidad completo. Antes de
 * cualquier uso real habría que sustituirlo por autenticación de verdad:
 * sesión firmada, contraseñas o SSO, y comprobación de permisos en servidor.
 *
 * Por eso el selector de la barra superior se llama "Ver como" y no "Iniciar
 * sesión": no se está autenticando a nadie, se está cambiando el punto de
 * vista de la demo.
 *
 * Este fichero solo debe importarse desde código de servidor (usa `cookies()`
 * de next/headers y el cliente de Prisma).
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { RolUsuario } from "@/lib/permisos";
import type { DepartamentoKey, SectorKey } from "@/lib/constants";

/** Id del usuario que se está "viendo como". */
export const COOKIE_USUARIO = "nexusguard_usuario";
/** Marca de que el onboarding se completó; sustituye al gate de localStorage. */
export const COOKIE_ONBOARDING = "nexusguard_onboarding";

const UN_MES_EN_SEGUNDOS = 60 * 60 * 24 * 30;

export const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: UN_MES_EN_SEGUNDOS,
} as const;

export interface UsuarioActivo {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: DepartamentoKey;
  riskScore: number;
  empresa: {
    id: string;
    nombre: string;
    sector: SectorKey;
  };
}

export interface Sesion {
  usuario: UsuarioActivo | null;
  /** Píldoras terminadas por el usuario activo; gobierna el desbloqueo. */
  pildorasCompletadas: number;
  onboardingCompleto: boolean;
}

const SELECCION_USUARIO = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  riskScore: true,
  company: { select: { id: true, name: true, sector: true } },
} as const;

type FilaUsuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  riskScore: number;
  company: { id: string; name: string; sector: string };
};

function aUsuarioActivo(fila: FilaUsuario): UsuarioActivo {
  return {
    id: fila.id,
    nombre: fila.name,
    email: fila.email,
    rol: fila.role as RolUsuario,
    departamento: fila.department as DepartamentoKey,
    riskScore: fila.riskScore,
    empresa: {
      id: fila.company.id,
      nombre: fila.company.name,
      sector: fila.company.sector as SectorKey,
    },
  };
}

/**
 * Usuario de respaldo cuando no hay cookie o apunta a alguien que ya no
 * existe: se prefiere un DPO, porque es el perfil que puede ver la plataforma
 * entera y hace la demo más completa desde el primer momento.
 */
async function usuarioPorDefecto(): Promise<FilaUsuario | null> {
  const dpo = await prisma.user.findFirst({
    where: { role: "DPO" },
    select: SELECCION_USUARIO,
    orderBy: { name: "asc" },
  });
  if (dpo) return dpo as FilaUsuario;

  return (await prisma.user.findFirst({
    select: SELECCION_USUARIO,
    orderBy: { name: "asc" },
  })) as FilaUsuario | null;
}

/** Usuario que se está "viendo como", o el de respaldo si no hay cookie. */
export async function obtenerUsuarioActivo(): Promise<UsuarioActivo | null> {
  const almacen = await cookies();
  const id = almacen.get(COOKIE_USUARIO)?.value;

  let fila: FilaUsuario | null = null;

  if (id) {
    fila = (await prisma.user.findUnique({
      where: { id },
      select: SELECCION_USUARIO,
    })) as FilaUsuario | null;
  }

  // Sin cookie, o con una que apunta a un usuario borrado (por ejemplo tras
  // resembrar la base de datos, que regenera los ids).
  if (!fila) {
    fila = await usuarioPorDefecto();
  }

  return fila ? aUsuarioActivo(fila) : null;
}

/** Estado completo que necesitan el layout y el menú lateral. */
export async function obtenerSesion(): Promise<Sesion> {
  const almacen = await cookies();
  const onboardingCompleto = almacen.get(COOKIE_ONBOARDING)?.value === "1";

  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    return { usuario: null, pildorasCompletadas: 0, onboardingCompleto };
  }

  const pildorasCompletadas = await prisma.trainingProgress.count({
    where: { userId: usuario.id, completedAt: { not: null } },
  });

  return { usuario, pildorasCompletadas, onboardingCompleto };
}

export interface OpcionUsuario {
  id: string;
  nombre: string;
  rol: RolUsuario;
  departamento: DepartamentoKey;
  /** Empresa a la que pertenece. Se enseña solo si hay más de una. */
  empresa: string;
}

/**
 * Plantilla completa, para alimentar el selector "Ver como" de la demo.
 *
 * No se filtra por empresa a propósito: cuando en la base de datos hay más de
 * una (por ejemplo tras generar las empresas de la demo comparativa), este
 * selector es la forma de saltar de una a otra y ver cómo cambia el contenido
 * de la formación según el perfil de cada una.
 */
export async function listarUsuariosSeleccionables(): Promise<OpcionUsuario[]> {
  const filas = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      department: true,
      company: { select: { name: true } },
    },
    // Primero por empresa, para que las de la demo comparativa salgan juntas.
    // Dentro de cada una, el enum se declara EMPLEADO, DPO, ADMIN, así que
    // "desc" agrupa arriba a los perfiles de gestión, que son los que abren la
    // plataforma completa.
    orderBy: [{ company: { name: "asc" } }, { role: "desc" }, { name: "asc" }],
  });

  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.name,
    rol: fila.role as RolUsuario,
    departamento: fila.department as DepartamentoKey,
    empresa: fila.company.name,
  }));
}
