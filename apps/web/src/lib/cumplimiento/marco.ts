/**
 * Qué exige cada normativa EN MATERIA DE CONCIENCIACIÓN, y cómo se mide.
 *
 * POR QUÉ ESTO ES UN DATO EN CÓDIGO Y NO LO ESCRIBE LA IA
 * ------------------------------------------------------
 * Un modelo de 7B al que le pides "los artículos del RGPD sobre formación" se
 * inventa la numeración con total aplomo. En un informe de cumplimiento eso no
 * es un texto flojo: es una cita falsa de una norma delante de un cliente. El
 * marco vive aquí, declarado y revisable; la IA solo escribe la narrativa a
 * partir de las cifras que ya ha calculado la plataforma. Es el mismo reparto
 * que en la formación adaptada: el esqueleto lo pone el código, el texto el
 * modelo.
 *
 * QUÉ ES UNA "COBERTURA" Y QUÉ NO
 * -------------------------------
 * Esta plataforma NO puede decir si una empresa cumple el RGPD: eso depende de
 * su registro de tratamientos, sus contratos, sus medidas técnicas y media
 * docena de cosas más que aquí no se ven. Lo que sí puede evidenciar es la
 * parte de **concienciación y formación** que esas normas exigen, que es
 * exactamente lo que mide. Por eso en toda la aplicación se llama "cobertura
 * de concienciación" y no "cumplimiento": medir una parte y llamarlo el todo
 * sería el tipo de cifra inflada que este proyecto lleva un bloque entero
 * quitando de en medio.
 *
 * Módulo puro (sin Prisma ni React): lo usan el cálculo del servidor, la
 * pantalla del DPO y el informe.
 */
import type { NormativaKey } from "@/lib/constants";

/**
 * Con qué se mide un requisito. Los cinco salen de datos que la plataforma ya
 * tiene: no hay ninguno que dependa de un inventario de controles que no
 * existe.
 */
export type TipoIndicador =
  | "FORMACION"
  | "EVALUACION"
  | "FORMACION_DIRECCION"
  | "PHISHING_COBERTURA"
  | "PHISHING_RESISTENCIA";

/** Nombre corto del indicador, para tablas y cabeceras. */
export const ETIQUETA_INDICADOR: Record<TipoIndicador, string> = {
  FORMACION: "Formación completada",
  EVALUACION: "Evaluación superada",
  FORMACION_DIRECCION: "Formación de la dirección",
  PHISHING_COBERTURA: "Simulación recibida",
  PHISHING_RESISTENCIA: "No picó en la simulación",
};

export const DESCRIPCION_INDICADOR: Record<TipoIndicador, string> = {
  FORMACION:
    "Porcentaje de la plantilla que ha completado las píldoras de los temas exigidos.",
  EVALUACION:
    "Porcentaje de la plantilla que ha superado una evaluación de esos temas.",
  FORMACION_DIRECCION:
    "Porcentaje del equipo de dirección que ha completado esa formación.",
  PHISHING_COBERTURA:
    "Porcentaje de la plantilla que ha recibido al menos una simulación.",
  PHISHING_RESISTENCIA:
    "Porcentaje de quienes recibieron una simulación y no picaron.",
};

export interface Requisito {
  /** Estable: se usa como clave en la caché y en el exportador. */
  id: string;
  /** El artículo, cláusula o control concreto. Se enseña tal cual. */
  referencia: string;
  titulo: string;
  /** Qué pide la norma, en una frase, sin jerga. */
  exige: string;
  indicador: TipoIndicador;
  /** Temas de formación que evidencian este requisito. */
  temas?: string[];
  /** Nota mínima para dar por superada una evaluación (indicador EVALUACION). */
  umbral?: number;
  /** Cuánto pesa dentro de su normativa. Lo formativo pesa más que lo demás. */
  peso: number;
}

/**
 * El marco de cada normativa.
 *
 * Las referencias son verificables en la fuente citada. Si alguna cambia con
 * una revisión de la norma, se corrige AQUÍ y se arrastra sola a la pantalla,
 * al informe y al grafo.
 */
export const MARCO: Record<NormativaKey, { fuente: string; requisitos: Requisito[] }> = {
  RGPD: {
    fuente: "Reglamento (UE) 2016/679",
    requisitos: [
      {
        id: "rgpd-39-1-b",
        referencia: "art. 39.1.b",
        titulo: "Formación del personal que trata datos personales",
        exige:
          "El delegado de protección de datos supervisa la formación del personal que participa en las operaciones de tratamiento.",
        indicador: "FORMACION",
        temas: ["SEGURIDAD_DATO", "EMAIL", "CONTRASENAS"],
        peso: 3,
      },
      {
        id: "rgpd-32-1",
        referencia: "art. 32.1",
        titulo: "Medidas organizativas apropiadas al riesgo",
        exige:
          "El responsable aplica medidas organizativas apropiadas; que la plantilla demuestre lo aprendido es una de ellas.",
        indicador: "EVALUACION",
        temas: ["SEGURIDAD_DATO", "EMAIL"],
        umbral: 60,
        peso: 2,
      },
      {
        id: "rgpd-5-1-f",
        referencia: "art. 5.1.f",
        titulo: "Integridad y confidencialidad",
        exige:
          "Los datos se tratan de forma que se garantice su seguridad; el fraude por correo es la vía de fuga más común.",
        indicador: "PHISHING_RESISTENCIA",
        peso: 1,
      },
    ],
  },

  LOPDGDD: {
    fuente: "Ley Orgánica 3/2018",
    requisitos: [
      {
        id: "lopdgdd-34-37",
        referencia: "arts. 34 a 37",
        titulo: "Delegado de protección de datos",
        exige:
          "La figura del DPD y sus funciones, que incluyen velar por la formación del personal.",
        indicador: "FORMACION",
        temas: ["SEGURIDAD_DATO", "CONTRASENAS"],
        peso: 3,
      },
      {
        id: "lopdgdd-conocimiento",
        referencia: "art. 5",
        titulo: "Deber de confidencialidad",
        exige:
          "Quien intervenga en el tratamiento está sujeto al deber de confidencialidad, y tiene que saberlo.",
        indicador: "EVALUACION",
        temas: ["SEGURIDAD_DATO"],
        umbral: 60,
        peso: 2,
      },
    ],
  },

  ENS: {
    fuente: "Real Decreto 311/2022, Anexo II",
    requisitos: [
      {
        id: "ens-mp-per-3",
        referencia: "mp.per.3",
        titulo: "Concienciación",
        exige:
          "Recordar con regularidad las normas de seguridad y los riesgos, con acciones para toda la plantilla.",
        indicador: "FORMACION",
        temas: ["EMAIL", "CONTRASENAS", "SEGURIDAD_DATO"],
        peso: 3,
      },
      {
        id: "ens-mp-per-4",
        referencia: "mp.per.4",
        titulo: "Formación",
        exige:
          "Formar al personal en lo que necesita para su puesto: configuración de sistemas, gestión de incidentes y tratamiento de la información.",
        indicador: "EVALUACION",
        temas: ["SEGURIDAD_DATO", "DOBLE_FACTOR", "CONTRASENAS"],
        umbral: 60,
        peso: 2,
      },
      {
        id: "ens-mp-per-3-simulacion",
        referencia: "mp.per.3",
        titulo: "Ejercicios de concienciación",
        exige: "Las acciones de concienciación se comprueban, no solo se imparten.",
        indicador: "PHISHING_COBERTURA",
        peso: 1,
      },
    ],
  },

  ISO_27001: {
    fuente: "ISO/IEC 27001:2022",
    requisitos: [
      {
        id: "iso27001-7-3",
        referencia: "cláusula 7.3",
        titulo: "Toma de conciencia",
        exige:
          "Las personas que trabajan bajo el control de la organización conocen la política de seguridad y su contribución a ella.",
        indicador: "FORMACION",
        temas: ["EMAIL", "CONTRASENAS", "DOBLE_FACTOR", "SEGURIDAD_DATO"],
        peso: 3,
      },
      {
        id: "iso27001-a-6-3",
        referencia: "control A.6.3",
        titulo: "Concienciación, educación y capacitación",
        exige:
          "El personal recibe formación y actualizaciones periódicas apropiadas a su función.",
        indicador: "EVALUACION",
        temas: ["EMAIL", "CONTRASENAS", "DOBLE_FACTOR", "SEGURIDAD_DATO"],
        umbral: 60,
        peso: 2,
      },
      {
        id: "iso27001-a-6-3-practica",
        referencia: "control A.6.3",
        titulo: "Comprobación de lo aprendido",
        exige: "La eficacia de la concienciación se evalúa con ejercicios prácticos.",
        indicador: "PHISHING_RESISTENCIA",
        peso: 1,
      },
    ],
  },

  ISO_42001: {
    fuente: "ISO/IEC 42001:2023",
    requisitos: [
      {
        id: "iso42001-7-3",
        referencia: "cláusula 7.3",
        titulo: "Toma de conciencia sobre el uso de IA",
        exige:
          "Quien trabaja con sistemas de IA conoce la política de la organización y las consecuencias de no seguirla.",
        indicador: "FORMACION",
        temas: ["USO_IA"],
        peso: 3,
      },
      {
        id: "iso42001-7-2",
        referencia: "cláusula 7.2",
        titulo: "Competencia",
        exige:
          "La organización determina y evidencia la competencia de quien afecta al desempeño del sistema de gestión de IA.",
        indicador: "EVALUACION",
        temas: ["USO_IA", "SEGURIDAD_DATO"],
        umbral: 60,
        peso: 2,
      },
    ],
  },

  NIS2: {
    fuente: "Directiva (UE) 2022/2555",
    requisitos: [
      {
        id: "nis2-20-2",
        referencia: "art. 20.2",
        titulo: "Formación de los órganos de dirección",
        exige:
          "Los miembros de la dirección tienen que seguir formación en ciberseguridad, y se anima a ofrecerla al resto del personal.",
        indicador: "FORMACION_DIRECCION",
        temas: ["EMAIL", "SEGURIDAD_DATO", "DOBLE_FACTOR"],
        peso: 3,
      },
      {
        id: "nis2-21-2-g",
        referencia: "art. 21.2.g",
        titulo: "Ciberhigiene y formación en ciberseguridad",
        exige:
          "Las medidas de gestión de riesgos incluyen prácticas básicas de ciberhigiene y formación para toda la plantilla.",
        indicador: "FORMACION",
        temas: ["EMAIL", "CONTRASENAS", "DOBLE_FACTOR", "IOT"],
        peso: 3,
      },
      {
        id: "nis2-21-2-g-simulacion",
        referencia: "art. 21.2.g",
        titulo: "Comprobación de la ciberhigiene",
        exige: "La formación se contrasta con la reacción real de la plantilla.",
        indicador: "PHISHING_RESISTENCIA",
        peso: 1,
      },
    ],
  },

  PCI_DSS: {
    fuente: "PCI DSS v4.0",
    requisitos: [
      {
        id: "pci-12-6-3",
        referencia: "req. 12.6.3",
        titulo: "Programa de concienciación al menos anual",
        exige:
          "Todo el personal recibe formación de seguridad al incorporarse y al menos una vez al año.",
        indicador: "FORMACION",
        temas: ["SEGURIDAD_DATO", "CONTRASENAS", "EMAIL"],
        peso: 3,
      },
      {
        id: "pci-12-6-3-1",
        referencia: "req. 12.6.3.1",
        titulo: "Phishing e ingeniería social en el programa",
        exige:
          "La formación cubre expresamente el phishing y la ingeniería social.",
        indicador: "PHISHING_COBERTURA",
        peso: 2,
      },
      {
        id: "pci-12-6-3-eficacia",
        referencia: "req. 12.6.3.1",
        titulo: "Eficacia frente al fraude",
        exige:
          "La plantilla reconoce un intento de fraude cuando lo tiene delante.",
        indicador: "PHISHING_RESISTENCIA",
        peso: 2,
      },
    ],
  },

  DORA: {
    fuente: "Reglamento (UE) 2022/2554",
    requisitos: [
      {
        id: "dora-13-6",
        referencia: "art. 13.6",
        titulo: "Concienciación en seguridad de las TIC",
        exige:
          "Programas obligatorios de concienciación y formación en resiliencia digital para todo el personal.",
        indicador: "FORMACION",
        temas: ["EMAIL", "SEGURIDAD_DATO", "DOBLE_FACTOR", "CONTRASENAS"],
        peso: 3,
      },
      {
        id: "dora-13-6-direccion",
        referencia: "art. 13.6",
        titulo: "Incluida la alta dirección",
        exige:
          "Los programas alcanzan expresamente a los miembros de la alta dirección.",
        indicador: "FORMACION_DIRECCION",
        temas: ["EMAIL", "SEGURIDAD_DATO"],
        peso: 2,
      },
      {
        id: "dora-13-6-evaluacion",
        referencia: "art. 13.6",
        titulo: "Nivel de conocimiento acreditado",
        exige:
          "El resultado de la formación se evalúa, no se da por hecho por haberla impartido.",
        indicador: "EVALUACION",
        temas: ["EMAIL", "SEGURIDAD_DATO"],
        umbral: 60,
        peso: 2,
      },
    ],
  },
};

/** Cuántos requisitos tiene declarados una normativa. */
export function requisitosDe(normativa: NormativaKey): Requisito[] {
  return MARCO[normativa]?.requisitos ?? [];
}

/** Todos los temas de formación que alguna de estas normativas exige. */
export function temasExigidos(normativas: NormativaKey[]): string[] {
  const temas = new Set<string>();
  for (const normativa of normativas) {
    for (const requisito of requisitosDe(normativa)) {
      for (const tema of requisito.temas ?? []) temas.add(tema);
    }
  }
  return [...temas];
}

export type NivelCobertura = "ALTA" | "MEDIA" | "BAJA";

/**
 * Cómo se lee un porcentaje de cobertura.
 *
 * Los cortes son de la plataforma, no de ninguna norma: ninguna de las ocho
 * dice "con un 80% cumples". Sirven para pintar y para ordenar por dónde
 * empezar, y así está dicho en la pantalla.
 */
export function nivelCobertura(porcentaje: number): NivelCobertura {
  if (porcentaje >= 80) return "ALTA";
  if (porcentaje >= 50) return "MEDIA";
  return "BAJA";
}

export const META_NIVEL: Record<
  NivelCobertura,
  { label: string; variante: "good" | "warning" | "critical" }
> = {
  ALTA: { label: "Cobertura alta", variante: "good" },
  MEDIA: { label: "Cobertura parcial", variante: "warning" },
  BAJA: { label: "Cobertura insuficiente", variante: "critical" },
};
