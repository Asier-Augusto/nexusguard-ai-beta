/**
 * Seed de datos de demo de NexusGuard AI.
 *
 * Genera una empresa completa y coherente: plantilla repartida por
 * departamentos, catálogo de formación, progreso, intentos de evaluación
 * adaptativa, campañas de phishing con sus resultados e histórico de Risk
 * Score. Sirve para que el dashboard tenga datos reales con los que trabajar
 * en la Fase 1 del ROADMAP, cuando se sustituyan los mocks por consultas.
 *
 * AVISO: es destructivo por diseño. Borra la empresa de demo y el catálogo de
 * píldoras antes de recrearlos, de modo que se puede ejecutar tantas veces
 * como haga falta y el resultado siempre es el mismo. Todo el azar viene de un
 * generador con semilla fija, así que dos ejecuciones producen datos idénticos.
 *
 * Los correos de las campañas son plantillas de SIMULACIÓN para formación
 * interna autorizada, no material para uso real.
 *
 * Ejecutar con:  npm run prisma:seed        (desde la raíz o desde apps/web)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CanalCampania,
  Departamento,
  DificultadSenuelo,
  EstadoCampania,
  HerramientaCorporativa,
  ModuloClave,
  Normativa,
  Prisma,
  PrismaClient,
  ProcesoCritico,
  RolUsuario,
  Sector,
  SistemaOperativo,
  TemaFormacion,
} from "../src/generated/prisma/client";
import { PILL_CONTENT } from "./seed-content";

// --- Infraestructura -------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Copia apps/web/.env.example a apps/web/.env antes de sembrar.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Identificador fijo de la empresa de demo, para que el seed sea repetible. */
const COMPANY_ID = "cmp-nexus-demo";
const COMPANY_DOMAIN = "transportesnexus.es";

/**
 * Generador pseudoaleatorio con semilla (mulberry32). Se usa en lugar de
 * Math.random para que el seed produzca exactamente los mismos datos en cada
 * ejecución y las capturas del dashboard sean reproducibles.
 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Token del enlace instrumentado de un resultado sembrado.
 *
 * Se construye con el generador con semilla que ya usa el resto del seed para
 * que dos ejecuciones den exactamente los mismos enlaces: si cambiaran, las
 * capturas y los ejemplos de la documentación dejarían de servir.
 */
function tokenSembrado(random: () => number): string {
  let token = "";
  while (token.length < 24) {
    token += Math.floor(random() * 16).toString(16);
  }
  return token;
}

/** Momento de referencia; las fechas del seed se calculan hacia atrás desde aquí. */
const NOW = new Date();

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Convierte "Sofía Rey" en "sofia.rey" para construir el correo. */
function toEmailLocalPart(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
}

// --- Modelo de Risk Score --------------------------------------------------

/**
 * Misma fórmula ponderada que ya implementan el servicio de inferencia
 * (apps/api/app/services/risk_logic.py) y el mock del front
 * (src/lib/mock/risk-mock.ts). Se reimplementa aquí en lugar de importarla
 * porque el alias "@/" del tsconfig solo lo resuelve el bundler, no el runner
 * del seed. Los pesos deben mantenerse sincronizados con esos dos ficheros.
 */
const W_PHISHING = 0.4;
const W_TRAINING = 0.25;
const W_QUIZ = 0.25;
const W_RECENCY = 0.1;
const RECENCY_HORIZON_DAYS = 90;

interface RiskInput {
  phishingClickRate: number;
  trainingCompletionRate: number;
  quizAvgScore: number;
  daysSinceLastActivity: number;
}

interface RiskOutput {
  score: number;
  breakdown: { phishing: number; formacion: number; evaluaciones: number; inactividad: number };
}

function computeRisk(input: RiskInput): RiskOutput {
  const recencyFactor = Math.min(input.daysSinceLastActivity / RECENCY_HORIZON_DAYS, 1);

  const phishing = W_PHISHING * input.phishingClickRate;
  const formacion = W_TRAINING * (1 - input.trainingCompletionRate);
  const evaluaciones = W_QUIZ * (1 - input.quizAvgScore / 100);
  const inactividad = W_RECENCY * recencyFactor;

  const score = clamp(Math.round((phishing + formacion + evaluaciones + inactividad) * 100), 0, 100);

  return {
    score,
    breakdown: {
      phishing: Math.round(phishing * 1000) / 10,
      formacion: Math.round(formacion * 1000) / 10,
      evaluaciones: Math.round(evaluaciones * 1000) / 10,
      inactividad: Math.round(inactividad * 1000) / 10,
    },
  };
}

// --- Plantilla de la empresa ----------------------------------------------

interface EmployeeSeed {
  name: string;
  department: Departamento;
  role: RolUsuario;
  /** Proporción de correos trampa en los que hizo clic (0-1). */
  clickRate: number;
  /** Proporción del catálogo de formación completada (0-1). */
  trainingRate: number;
  /** Nota media de las evaluaciones (0-100). */
  quizAvg: number;
  /** Días desde su última actividad en la plataforma. */
  inactivityDays: number;
}

/**
 * Los seis primeros reproducen exactamente la plantilla que hoy está
 * hardcodeada en el Command Center (src/app/dashboard/command-center/page.tsx),
 * con sus mismas métricas, para que al cablear la BBDD en la Fase 1 la pantalla
 * siga mostrando lo mismo. El resto completa la plantilla hasta 16 personas
 * cubriendo los diez departamentos del enum.
 */
const EMPLOYEES: EmployeeSeed[] = [
  { name: "Marta Gil", department: Departamento.RRHH, role: RolUsuario.EMPLEADO, clickRate: 0.4, trainingRate: 0.9, quizAvg: 82, inactivityDays: 3 },
  { name: "Javier Ruiz", department: Departamento.IT, role: RolUsuario.ADMIN, clickRate: 0.0, trainingRate: 1.0, quizAvg: 95, inactivityDays: 1 },
  { name: "Laura Saez", department: Departamento.VENTAS, role: RolUsuario.EMPLEADO, clickRate: 0.6, trainingRate: 0.3, quizAvg: 55, inactivityDays: 20 },
  { name: "Diego Pardo", department: Departamento.LOGISTICA, role: RolUsuario.EMPLEADO, clickRate: 0.2, trainingRate: 0.6, quizAvg: 70, inactivityDays: 45 },
  { name: "Ana Torres", department: Departamento.FINANZAS, role: RolUsuario.EMPLEADO, clickRate: 1.0, trainingRate: 0.4, quizAvg: 40, inactivityDays: 60 },
  { name: "Sofia Rey", department: Departamento.MARKETING, role: RolUsuario.EMPLEADO, clickRate: 0.1, trainingRate: 0.85, quizAvg: 88, inactivityDays: 5 },

  { name: "Elena Vidal", department: Departamento.DIRECCION, role: RolUsuario.DPO, clickRate: 0.0, trainingRate: 1.0, quizAvg: 92, inactivityDays: 2 },
  { name: "Carlos Nieto", department: Departamento.DIRECCION, role: RolUsuario.EMPLEADO, clickRate: 0.33, trainingRate: 0.5, quizAvg: 64, inactivityDays: 12 },
  { name: "Rocio Ibanez", department: Departamento.ATENCION_CLIENTE, role: RolUsuario.EMPLEADO, clickRate: 0.5, trainingRate: 0.7, quizAvg: 61, inactivityDays: 8 },
  { name: "Pablo Miranda", department: Departamento.ATENCION_CLIENTE, role: RolUsuario.EMPLEADO, clickRate: 0.66, trainingRate: 0.2, quizAvg: 48, inactivityDays: 34 },
  { name: "Nuria Alonso", department: Departamento.LEGAL, role: RolUsuario.EMPLEADO, clickRate: 0.0, trainingRate: 0.9, quizAvg: 86, inactivityDays: 6 },
  { name: "Ivan Cortes", department: Departamento.OPERACIONES, role: RolUsuario.EMPLEADO, clickRate: 0.25, trainingRate: 0.55, quizAvg: 58, inactivityDays: 27 },
  { name: "Beatriz Lozano", department: Departamento.OPERACIONES, role: RolUsuario.EMPLEADO, clickRate: 0.75, trainingRate: 0.35, quizAvg: 44, inactivityDays: 52 },
  { name: "Hugo Serrano", department: Departamento.IT, role: RolUsuario.EMPLEADO, clickRate: 0.0, trainingRate: 0.95, quizAvg: 90, inactivityDays: 4 },
  { name: "Lucia Prieto", department: Departamento.RRHH, role: RolUsuario.EMPLEADO, clickRate: 0.2, trainingRate: 0.75, quizAvg: 74, inactivityDays: 15 },
  { name: "Andres Bravo", department: Departamento.LOGISTICA, role: RolUsuario.EMPLEADO, clickRate: 0.5, trainingRate: 0.45, quizAvg: 52, inactivityDays: 40 },
];

// --- Campañas de phishing --------------------------------------------------

interface CampaignSeed {
  name: string;
  department: Departamento;
  canal: CanalCampania;
  dificultad: DificultadSenuelo;
  status: EstadoCampania;
  emailSubject: string;
  emailBody: string;
  senderName: string;
  senderEmail: string | null;
  /** Lo que delataba el señuelo; es lo que ve quien pica. */
  redFlags: string[];
  /** Días transcurridos desde el lanzamiento (para fechar los resultados). */
  launchedDaysAgo: number;
}

/**
 * Plantillas de simulación tomadas de las que ya usan el mock del front
 * (src/lib/mock/phishing-mock.ts) y el fallback determinista del servicio de
 * inferencia (apps/api/app/services/phishing_logic.py), para que los datos
 * sembrados y los generados en caliente sean del mismo estilo.
 *
 * El campo `department` indica el pretexto sobre el que se construye el
 * señuelo; la campaña se envía a toda la plantilla, que es como funcionan las
 * campañas de concienciación reales.
 */
const CAMPAIGNS: CampaignSeed[] = [
  {
    name: "Campana Q1 - Nominas",
    department: Departamento.RRHH,
    canal: CanalCampania.EMAIL,
    dificultad: DificultadSenuelo.MEDIA,
    status: EstadoCampania.FINALIZADA,
    emailSubject: "Actualizacion urgente de tu nomina - Accion requerida",
    emailBody:
      "Hola,\n\nDetectamos una incidencia en el procesamiento de tu ultima nomina. " +
      "Para evitar retrasos en el pago, confirma tus datos bancarios en el siguiente " +
      "enlace antes de las 17:00h:\n\nhttps://portal-rrhh-actualizacion.com/verificar\n\n" +
      "Gracias por tu rapida colaboracion.\nDepartamento de RRHH",
    senderName: "Soporte RRHH",
    senderEmail: "nomina@rrhh-corporativo-online.com",
    redFlags: [
      "El dominio del remitente no es el de la empresa: rrhh-corporativo-online.com.",
      "Mete prisa con una hora limite para que no te pares a comprobarlo.",
      "Pide datos bancarios por correo, algo que RRHH nunca hace.",
      "El enlace lleva a un dominio externo que no tiene que ver con la nomina.",
    ],
    launchedDaysAgo: 62,
  },
  {
    name: "Campana Q1 - Suspension de cuenta",
    department: Departamento.IT,
    canal: CanalCampania.EMAIL,
    dificultad: DificultadSenuelo.DIFICIL,
    status: EstadoCampania.ACTIVA,
    emailSubject: "Tu cuenta sera suspendida en 24 horas",
    emailBody:
      "Estimado usuario,\n\nHemos detectado actividad inusual en tu cuenta corporativa. " +
      "Verifica tu identidad ahora para evitar la suspension de tu acceso:\n\n" +
      "https://it-soporte-verificacion.net/login\n\nEquipo de Soporte IT",
    senderName: "Soporte IT",
    senderEmail: "soporte@it-helpdesk-corp.com",
    redFlags: [
      "El dominio it-helpdesk-corp.com no es el del departamento de IT.",
      "Amenaza con suspender la cuenta en 24 horas: urgencia fabricada.",
      "El saludo es generico, 'Estimado usuario', y no usa tu nombre.",
      "Te lleva a una pantalla de acceso fuera del dominio corporativo.",
    ],
    launchedDaysAgo: 9,
  },
  {
    name: "Campana Q2 - Factura pendiente",
    department: Departamento.FINANZAS,
    canal: CanalCampania.EMAIL,
    dificultad: DificultadSenuelo.FACIL,
    status: EstadoCampania.BORRADOR,
    emailSubject: "Factura pendiente de aprobacion - Vence hoy",
    emailBody:
      "Buenos dias,\n\nAdjuntamos la factura F-2024-0871 pendiente de aprobacion. " +
      "El plazo vence hoy a las 14:00h. Puedes revisarla y aprobarla desde el portal " +
      "de proveedores:\n\nhttps://proveedores-gestion-online.com/factura\n\n" +
      "Un saludo,\nGestion de Proveedores",
    senderName: "Gestion de Proveedores",
    senderEmail: "facturacion@proveedores-gestion-online.com",
    redFlags: [
      "El numero de factura no corresponde a ningun pedido registrado.",
      "El plazo vence 'hoy', para que apruebes sin revisar.",
      "El portal de proveedores real no esta en ese dominio.",
    ],
    launchedDaysAgo: 0,
  },
  {
    // Smishing: el mismo pretexto de reparto que veria una empresa de
    // logistica, pero por SMS. Sirve para que el panel, el grafo y el Excel
    // tengan mas de un canal desde el primer arranque.
    name: "Campana Q2 - Aviso de entrega (SMS)",
    department: Departamento.LOGISTICA,
    canal: CanalCampania.SMS,
    dificultad: DificultadSenuelo.MEDIA,
    status: EstadoCampania.FINALIZADA,
    emailSubject: "Aviso de entrega",
    emailBody:
      "NEXUS-ENVIOS: tu paquete 84213 esta retenido por una tasa de aduana " +
      "pendiente de 1,79 EUR. Regulariza en 24h: https://nexus-envios.info/tasa",
    senderName: "NEXUS-ENVIOS",
    senderEmail: null,
    redFlags: [
      "Un remitente alfanumerico no garantiza nada: cualquiera puede registrarlo.",
      "Una tasa ridicula de 1,79 EUR busca que pagues sin pensarlo.",
      "El dominio .info no es el de la empresa de transporte.",
      "Nadie te habia avisado de ese envio.",
    ],
    launchedDaysAgo: 21,
  },
];

// --- Siembra ---------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Sembrando datos de demo de NexusGuard AI...");
  console.log(`   Empresa de demo: ${COMPANY_ID}`);

  // 1. Limpieza. Borrar la empresa arrastra en cascada usuarios, modulos,
  //    campanas y, a traves de los usuarios, progreso, intentos, resultados y
  //    snapshots. El catalogo de pildoras no cuelga de la empresa, va aparte.
  const borradas = await prisma.company.deleteMany({ where: { id: COMPANY_ID } });
  const pildorasBorradas = await prisma.trainingPill.deleteMany({});
  if (borradas.count > 0 || pildorasBorradas.count > 0) {
    console.log(
      `   Limpieza previa: ${borradas.count} empresa(s) y ${pildorasBorradas.count} pildora(s) eliminadas.`,
    );
  }

  // 2. Empresa, perfil y modulos contratados.
  //    El perfil es el que declararia el DPO de una empresa de logistica:
  //    puestos Windows y moviles Android para la flota, Microsoft 365 mas un
  //    TMS propio, y sujeta a RGPD y NIS2 por ser infraestructura de transporte.
  const company = await prisma.company.create({
    data: {
      id: COMPANY_ID,
      name: "Transportes Nexus S.L.",
      sector: Sector.LOGISTICA,
      profile: {
        create: {
          sistemasOperativos: [SistemaOperativo.WINDOWS, SistemaOperativo.ANDROID],
          procesos: [
            ProcesoCritico.FACTURACION,
            ProcesoCritico.GESTION_ENVIOS,
            ProcesoCritico.COMPRAS_PROVEEDORES,
          ],
          herramientas: [
            HerramientaCorporativa.MICROSOFT_365,
            HerramientaCorporativa.VPN_CORPORATIVA,
          ],
          otrasHerramientas: ["TMS de flota"],
          normativas: [Normativa.RGPD, Normativa.NIS2, Normativa.ISO_27001],
        },
      },
      modules: {
        create: Object.values(ModuloClave).map((moduleKey) => ({
          moduleKey,
          enabled: true,
          unlockedAt: daysAgo(90),
        })),
      },
    },
    include: { profile: true },
  });
  console.log(`   Empresa creada: ${company.name} (${company.sector})`);
  console.log(
    `   Perfil: ${company.profile?.sistemasOperativos.length} SO, ` +
      `${company.profile?.procesos.length} procesos, ` +
      `${(company.profile?.herramientas.length ?? 0) + (company.profile?.otrasHerramientas.length ?? 0)} herramientas, ` +
      `${company.profile?.normativas.length} normativas`
  );

  // 3. Catalogo de formacion. Una pildora por tema del catalogo.
  const pills = await Promise.all(
    PILL_CONTENT.map((pill) =>
      prisma.trainingPill.create({
        data: {
          topic: pill.topicKey as TemaFormacion,
          title: pill.title,
          durationMinutes: pill.durationMinutes,
          summary: pill.subtitle,
          content: pill as unknown as Prisma.InputJsonObject,
        },
      }),
    ),
  );
  console.log(`   Pildoras de formacion creadas: ${pills.length}`);

  // 4. Plantilla, con su Risk Score calculado con la formula real.
  let progresoCreado = 0;
  let intentosCreados = 0;
  let snapshotsCreados = 0;

  const usuarios = [];

  for (const [indice, empleado] of EMPLOYEES.entries()) {
    const random = createRandom(1000 + indice);

    const riesgoActual = computeRisk({
      phishingClickRate: empleado.clickRate,
      trainingCompletionRate: empleado.trainingRate,
      quizAvgScore: empleado.quizAvg,
      daysSinceLastActivity: empleado.inactivityDays,
    });

    // Foto de hace un mes: menos formacion hecha, peor nota y mas inactividad.
    // Asi el historico muestra una mejora real en lugar de un valor inventado.
    const riesgoAnterior = computeRisk({
      phishingClickRate: empleado.clickRate,
      trainingCompletionRate: Math.max(0, empleado.trainingRate - 0.2),
      quizAvgScore: Math.max(0, empleado.quizAvg - 8),
      daysSinceLastActivity: empleado.inactivityDays + 30,
    });

    const usuario = await prisma.user.create({
      data: {
        companyId: company.id,
        name: empleado.name,
        email: `${toEmailLocalPart(empleado.name)}@${COMPANY_DOMAIN}`,
        role: empleado.role,
        department: empleado.department,
        riskScore: riesgoActual.score,
        createdAt: daysAgo(90),
      },
    });
    usuarios.push({ ...empleado, id: usuario.id, riesgo: riesgoActual });

    // 4a. Historico de Risk Score: dos fotos, hace un mes y hoy.
    await prisma.riskScoreSnapshot.createMany({
      data: [
        {
          userId: usuario.id,
          score: riesgoAnterior.score,
          breakdown: riesgoAnterior.breakdown,
          computedAt: daysAgo(30),
        },
        {
          userId: usuario.id,
          score: riesgoActual.score,
          breakdown: riesgoActual.breakdown,
          computedAt: daysAgo(0),
        },
      ],
    });
    snapshotsCreados += 2;

    // 4b. Progreso de formacion. Las completadas salen de su tasa de
    //     finalizacion; ademas deja dos pildoras empezadas y sin terminar.
    const completadas = Math.round(empleado.trainingRate * pills.length);
    const enCurso = Math.min(2, pills.length - completadas);

    for (let i = 0; i < completadas; i++) {
      await prisma.trainingProgress.create({
        data: {
          userId: usuario.id,
          pillId: pills[i].id,
          completedAt: daysAgo(empleado.inactivityDays + (completadas - i) * 3),
          score: clamp(empleado.quizAvg + ((i * 7) % 11) - 5, 0, 100),
        },
      });
      progresoCreado++;
    }

    for (let i = completadas; i < completadas + enCurso; i++) {
      await prisma.trainingProgress.create({
        data: { userId: usuario.id, pillId: pills[i].id, completedAt: null, score: null },
      });
      progresoCreado++;
    }

    // 4c. Evaluaciones adaptativas. Se simula el recorrido real del motor CAT:
    //     arranca en nivel 3 y sube o baja un nivel segun cada respuesta,
    //     acotado entre 1 y 5. La probabilidad de acertar sale de su nota media.
    if (completadas >= 2) {
      const temas: TemaFormacion[] = [TemaFormacion.DOBLE_FACTOR, TemaFormacion.EMAIL];
      for (const tema of temas) {
        const preguntas = 6;
        const probabilidadAcierto = empleado.quizAvg / 100;
        const camino: { level: number; correct: boolean }[] = [];
        let nivel = 3;
        let aciertos = 0;

        for (let i = 0; i < preguntas; i++) {
          const acierto = random() < probabilidadAcierto;
          if (acierto) aciertos++;
          camino.push({ level: nivel, correct: acierto });
          nivel = clamp(nivel + (acierto ? 1 : -1), 1, 5);
        }

        await prisma.quizAttempt.create({
          data: {
            userId: usuario.id,
            topic: tema,
            difficultyPath: camino as unknown as Prisma.InputJsonArray,
            finalLevel: nivel,
            score: Math.round((aciertos / preguntas) * 100),
            createdAt: daysAgo(empleado.inactivityDays + 1),
          },
        });
        intentosCreados++;
      }
    }
  }
  console.log(`   Usuarios creados: ${usuarios.length}`);
  console.log(`   Registros de progreso de formacion: ${progresoCreado}`);
  console.log(`   Intentos de evaluacion adaptativa: ${intentosCreados}`);
  console.log(`   Snapshots de Risk Score: ${snapshotsCreados}`);

  // 5. Campanas de phishing y sus resultados por empleado.
  let resultadosCreados = 0;

  for (const [indiceCampania, campania] of CAMPAIGNS.entries()) {
    const creada = await prisma.phishingCampaign.create({
      data: {
        companyId: company.id,
        name: campania.name,
        department: campania.department,
        canal: campania.canal,
        dificultad: campania.dificultad,
        emailSubject: campania.emailSubject,
        emailBody: campania.emailBody,
        senderName: campania.senderName,
        senderEmail: campania.senderEmail,
        redFlags: campania.redFlags,
        // Las campanas sembradas son plantillas escritas a mano, no salidas
        // del modelo: se declaran como tales para no dar por adaptado lo que
        // no lo esta.
        origen: "fallback",
        status: campania.status,
        createdAt: daysAgo(campania.launchedDaysAgo),
        launchedAt:
          campania.status === EstadoCampania.BORRADOR
            ? null
            : daysAgo(campania.launchedDaysAgo),
      },
    });

    // Una campana en borrador todavia no se ha enviado: no tiene resultados.
    if (campania.status === EstadoCampania.BORRADOR) continue;

    for (const [indiceUsuario, usuario] of usuarios.entries()) {
      const random = createRandom(5000 + indiceCampania * 100 + indiceUsuario);

      const hizoClic = random() < usuario.clickRate;
      // Quien no pica, en la mitad de los casos ademas lo reporta a seguridad.
      const loReporto = !hizoClic && random() < 0.5;
      // En una campana aun activa hay gente que todavia no ha reaccionado.
      const haRespondido = campania.status === EstadoCampania.FINALIZADA || random() < 0.7;

      const clico = haRespondido && hizoClic;
      const reporto = haRespondido && loReporto;
      const cuando = haRespondido ? daysAgo(campania.launchedDaysAgo - 1) : null;

      await prisma.phishingResult.create({
        data: {
          campaignId: creada.id,
          userId: usuario.id,
          // El token del enlace instrumentado sale del generador con semilla,
          // no de crypto: el seed tiene que producir los mismos datos en cada
          // ejecucion. En una campana lanzada desde la aplicacion si es
          // aleatorio de verdad (ver lanzarCampania).
          token: tokenSembrado(random),
          clicked: clico,
          reported: reporto,
          respondedAt: cuando,
          sentAt: daysAgo(campania.launchedDaysAgo),
          clickedAt: clico ? cuando : null,
          reportedAt: reporto ? cuando : null,
        },
      });
      resultadosCreados++;
    }
  }
  console.log(`   Campanas de phishing creadas: ${CAMPAIGNS.length}`);
  console.log(`   Resultados de phishing: ${resultadosCreados}`);

  // 6. Resumen final leido de vuelta desde la base de datos.
  const [
    empresas,
    modulos,
    totalUsuarios,
    totalPildoras,
    totalProgreso,
    totalIntentos,
    totalCampanias,
    totalResultados,
    totalSnapshots,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.moduleToggle.count(),
    prisma.user.count(),
    prisma.trainingPill.count(),
    prisma.trainingProgress.count(),
    prisma.quizAttempt.count(),
    prisma.phishingCampaign.count(),
    prisma.phishingResult.count(),
    prisma.riskScoreSnapshot.count(),
  ]);

  console.log("\nResumen de filas en la base de datos:");
  console.table({
    Company: empresas,
    ModuleToggle: modulos,
    User: totalUsuarios,
    TrainingPill: totalPildoras,
    TrainingProgress: totalProgreso,
    QuizAttempt: totalIntentos,
    PhishingCampaign: totalCampanias,
    PhishingResult: totalResultados,
    RiskScoreSnapshot: totalSnapshots,
  });

  const riesgoMedio = Math.round(
    usuarios.reduce((total, usuario) => total + usuario.riesgo.score, 0) / usuarios.length,
  );
  const enRiesgo = usuarios.filter((usuario) => usuario.riesgo.score >= 50).length;
  console.log(`\nRiesgo medio de la plantilla: ${riesgoMedio}/100`);
  console.log(`Empleados en riesgo alto o critico (>=50): ${enRiesgo} de ${usuarios.length}`);
  console.log("Seed completado.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("El seed ha fallado:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
