"use server";

/**
 * Acciones de servidor de la sesión de demo.
 *
 * Recuerda: no hay autenticación real. Ver la cabecera de `src/lib/session.ts`
 * para el detalle de por qué esto es un mecanismo de demostración.
 */
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_ONBOARDING,
  COOKIE_USUARIO,
  OPCIONES_COOKIE,
} from "@/lib/session";
import type {
  DepartamentoKey,
  HerramientaKey,
  NormativaKey,
  ProcesoCriticoKey,
  SectorKey,
  SistemaOperativoKey,
} from "@/lib/constants";

/**
 * Cambia el usuario que se está "viendo como". Se limita a los usuarios que
 * existen en la base de datos para que la cookie nunca apunte a un id inventado.
 */
export async function cambiarUsuarioActivo(usuarioId: string): Promise<void> {
  const existe = await prisma.user.findUnique({
    where: { id: usuarioId },
    select: { id: true },
  });
  if (!existe) {
    throw new Error(`No existe ningún usuario con id ${usuarioId}`);
  }

  const almacen = await cookies();
  almacen.set(COOKIE_USUARIO, usuarioId, OPCIONES_COOKIE);

  // Todo el dashboard depende de quién seas: riesgo personal, progreso de
  // formación y qué módulos aparecen en el menú.
  revalidatePath("/dashboard", "layout");
}

export interface DatosOnboarding {
  nombreEmpresa: string;
  sector: SectorKey;
  departamento: DepartamentoKey;
  sistemasOperativos: SistemaOperativoKey[];
  procesos: ProcesoCriticoKey[];
  herramientas: HerramientaKey[];
  otrasHerramientas: string[];
  normativas: NormativaKey[];
}

/**
 * Cierra el onboarding: guarda la empresa con el perfil que ha declarado el DPO
 * y elige con qué empleado se entra a la plataforma.
 *
 * El usuario activo se resuelve buscando a alguien del departamento elegido, de
 * modo que la respuesta del formulario tenga consecuencias visibles. Si ese
 * departamento no tiene plantilla, se cae al usuario por defecto (un DPO).
 */
export async function completarOnboarding(datos: DatosOnboarding): Promise<void> {
  const perfil = {
    sistemasOperativos: datos.sistemasOperativos,
    procesos: datos.procesos,
    herramientas: datos.herramientas,
    otrasHerramientas: datos.otrasHerramientas.map((h) => h.trim()).filter(Boolean),
    normativas: datos.normativas,
  };
  const nombre = datos.nombreEmpresa.trim() || "Mi empresa";

  const existente = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existente) {
    await prisma.company.update({
      where: { id: existente.id },
      data: {
        name: nombre,
        sector: datos.sector,
        // upsert porque la empresa puede venir de antes de que existiera el
        // perfil, o de un onboarding anterior que ya lo dejó guardado.
        profile: { upsert: { create: perfil, update: perfil } },
      },
    });
  } else {
    // Antes este caso no hacía nada y el nombre, el sector y todo el perfil se
    // perdían en silencio: la acción solo actualizaba si ya existía una empresa.
    await prisma.company.create({
      data: { name: nombre, sector: datos.sector, profile: { create: perfil } },
    });
  }

  const delDepartamento = await prisma.user.findFirst({
    where: { department: datos.departamento },
    // Dentro del departamento se prefiere a quien tenga más permisos, para que
    // la demo arranque enseñando la plataforma completa siempre que se pueda.
    // El enum se declara EMPLEADO, DPO, ADMIN, así que "desc" pone delante a
    // los perfiles de gestión.
    orderBy: [{ role: "desc" }, { name: "asc" }],
    select: { id: true },
  });

  const almacen = await cookies();
  almacen.set(COOKIE_ONBOARDING, "1", OPCIONES_COOKIE);
  if (delDepartamento) {
    almacen.set(COOKIE_USUARIO, delDepartamento.id, OPCIONES_COOKIE);
  }

  revalidatePath("/dashboard", "layout");
}
