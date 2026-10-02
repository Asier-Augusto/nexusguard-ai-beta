/**
 * Las consultas Cypher que alimentan el Command Center del DPO.
 *
 * POR QUÉ EN UN GRAFO Y NO EN SQL
 * -------------------------------
 * Las tres preguntan por CAMINOS, no por filas. "Quién pica en el phishing
 * entre los que no han hecho la formación de correo" recorre empleado →
 * campaña y empleado → píldora → tema; "qué tema arrastra a más normativas"
 * recorre normativa → requisito → tema → píldora → empleado. En PostgreSQL
 * salen tres y cinco `JOIN`; aquí se leen casi como la frase en castellano.
 *
 * Los datos son los mismos que ya están en PostgreSQL: el grafo es una capa de
 * explotación, no una fuente de verdad. Por eso todo esto puede no estar
 * disponible sin que la aplicación se entere (ver `conexion.ts`).
 *
 * El Cypher se exporta junto a cada resultado a propósito: la pantalla lo
 * enseña plegado. Es un proyecto de máster y la consulta es parte de lo que
 * hay que demostrar.
 *
 * Solo para código de servidor.
 */
import { consultar } from "@/lib/neo4j/conexion";

/** Los enteros de Neo4j vienen como objetos; aquí se quieren números. */
function entero(valor: unknown): number {
  return typeof valor === "number" ? valor : Number(valor ?? 0);
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.map(String) : [];
}

// --- 1. Mayor riesgo por departamento --------------------------------------

export const CYPHER_RIESGO_POR_DEPARTAMENTO = `
MATCH (e:Empresa {id: $empresaId})-[:EMPLEA]->(p:Empleado)-[:PERTENECE_A]->(d:Departamento)
// Píldoras del itinerario de la empresa que esta persona NO ha completado.
// No hay aristas :PENDIENTE en el grafo: se pregunta por la ausencia.
OPTIONAL MATCH (e)-[:IMPARTE]->(pildora:Pildora)
  WHERE NOT (p)-[:COMPLETO]->(pildora)
WITH d.nombre AS departamento, p, count(pildora) AS pendientes
ORDER BY p.riskScore DESC, p.nombre
WITH departamento,
     collect({empleado: p.nombre, score: p.riskScore, pendientes: pendientes}) AS gente,
     avg(p.riskScore) AS media
RETURN departamento,
       gente[0].empleado   AS empleado,
       gente[0].score      AS score,
       gente[0].pendientes AS pendientes,
       size(gente)         AS plantilla,
       toInteger(round(media)) AS mediaDepartamento
ORDER BY score DESC
LIMIT 6`;

export interface RiesgoDepartamento {
  departamento: string;
  empleado: string;
  score: number;
  pendientes: number;
  plantilla: number;
  mediaDepartamento: number;
}

export function riesgoPorDepartamento(empresaId: string) {
  return consultar<RiesgoDepartamento>(
    CYPHER_RIESGO_POR_DEPARTAMENTO,
    { empresaId },
    (r) => ({
      departamento: String(r.departamento),
      empleado: String(r.empleado),
      score: entero(r.score),
      pendientes: entero(r.pendientes),
      plantilla: entero(r.plantilla),
      mediaDepartamento: entero(r.mediaDepartamento),
    })
  );
}

// --- 2. Formación no hecha frente a clics de phishing ----------------------

export const CYPHER_FORMACION_Y_CLICS = `
MATCH (e:Empresa {id: $empresaId})-[:IMPARTE]->(pildora:Pildora)-[:ENSENA]->(:Tema {clave: $tema})
MATCH (e)-[:EMPLEA]->(p:Empleado)-[reaccion:RECIBIO]->(:Campania)
// El caso de esta consulta: partir la plantilla en dos por si hizo o no la
// formación del tema, y comparar cómo reaccionó cada mitad.
WITH pildora, p,
     EXISTS { (p)-[:COMPLETO]->(pildora) } AS formado,
     count(reaccion) AS senuelos,
     sum(CASE WHEN reaccion.reaccion = 'CLIC' THEN 1 ELSE 0 END) AS clics
WITH formado,
     count(p)        AS personas,
     sum(senuelos)   AS senuelos,
     sum(clics)      AS clics,
     collect(p.nombre)[..4] AS ejemplos
RETURN formado, personas, senuelos, clics, ejemplos,
       CASE WHEN senuelos = 0 THEN 0
            ELSE toInteger(round(100.0 * clics / senuelos)) END AS tasaClic
ORDER BY formado`;

export interface FormacionYClics {
  formado: boolean;
  personas: number;
  senuelos: number;
  clics: number;
  tasaClic: number;
  ejemplos: string[];
}

/** Por defecto se mira la píldora de correo, que es la que enseña a no picar. */
export function formacionYClics(empresaId: string, tema = "EMAIL") {
  return consultar<FormacionYClics>(
    CYPHER_FORMACION_Y_CLICS,
    { empresaId, tema },
    (r) => ({
      formado: Boolean(r.formado),
      personas: entero(r.personas),
      senuelos: entero(r.senuelos),
      clics: entero(r.clics),
      tasaClic: entero(r.tasaClic),
      ejemplos: lista(r.ejemplos),
    })
  );
}

// --- 3. El tema con más impacto normativo ----------------------------------

export const CYPHER_IMPACTO_NORMATIVO = `
MATCH (e:Empresa {id: $empresaId})-[:SUJETA_A]->(norma:Normativa)
      -[:SE_MIDE_CON]->(req:Requisito)-[:EXIGE]->(tema:Tema)
MATCH (e)-[cumple:CUMPLE]->(req)
WITH e, tema,
     count(DISTINCT norma)            AS cuantas,
     collect(DISTINCT norma.etiqueta) AS normativas,
     toInteger(round(avg(cumple.porcentaje))) AS coberturaMedia
// Qué píldoras enseñan ese tema y a cuánta gente le faltan todavía.
OPTIONAL MATCH (e)-[:IMPARTE]->(pildora:Pildora)-[:ENSENA]->(tema)
OPTIONAL MATCH (e)-[:EMPLEA]->(p:Empleado)
  WHERE pildora IS NOT NULL AND NOT (p)-[:COMPLETO]->(pildora)
RETURN tema.clave AS tema,
       normativas,
       cuantas,
       coberturaMedia,
       collect(DISTINCT pildora.titulo) AS pildoras,
       count(DISTINCT p) AS personasPendientes
ORDER BY cuantas DESC, personasPendientes DESC`;

export interface ImpactoNormativo {
  tema: string;
  normativas: string[];
  cuantas: number;
  coberturaMedia: number;
  pildoras: string[];
  personasPendientes: number;
}

export function impactoNormativo(empresaId: string) {
  return consultar<ImpactoNormativo>(CYPHER_IMPACTO_NORMATIVO, { empresaId }, (r) => ({
    tema: String(r.tema),
    normativas: lista(r.normativas),
    cuantas: entero(r.cuantas),
    coberturaMedia: entero(r.coberturaMedia),
    pildoras: lista(r.pildoras),
    personasPendientes: entero(r.personasPendientes),
  }));
}
