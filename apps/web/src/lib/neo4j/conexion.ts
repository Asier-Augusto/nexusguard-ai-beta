/**
 * Conexión con la base de grafos.
 *
 * NEO4J ES OPCIONAL Y ESO MANDA EN TODO ESTE FICHERO
 * ---------------------------------------------------
 * La aplicación funciona entera sin el grafo: es una capa de explotación de
 * datos que ya están en PostgreSQL, no una fuente de verdad. Así que aquí no
 * se lanza nunca hacia arriba y, sobre todo, **no se espera**: los tiempos por
 * defecto del driver son de decenas de segundos entre reintentos, y con el
 * contenedor parado eso dejaría el Command Center colgado hasta que Next
 * decidiera rendirse. Con estos topes, una página con el grafo caído tarda un
 * segundo y medio más de lo normal y enseña un aviso.
 *
 * Solo para código de servidor.
 */
import neo4j, { type Driver } from "neo4j-driver";

/** Cuánto se espera a que el grafo dé señales de vida. */
const ESPERA_CONEXION_MS = 800;

/**
 * Cuánto insiste el driver con una transacción que falla.
 *
 * Por defecto son 30 segundos de reintentos, pensados para un clúster que se
 * está recuperando. Aquí, si no contesta a la primera, es que el contenedor no
 * está: reintentar media docena de veces solo retrasa el aviso.
 */
const ESPERA_REINTENTOS_MS = 1000;

export interface ConfiguracionGrafo {
  uri: string;
  usuario: string;
  password: string;
}

export function configuracionGrafo(): ConfiguracionGrafo {
  return {
    uri: process.env.NEO4J_URI ?? "bolt://localhost:7688",
    usuario: process.env.NEO4J_USER ?? "neo4j",
    password: process.env.NEO4J_PASSWORD ?? "nexusguard_dev",
  };
}

/**
 * Un driver nuevo.
 *
 * `escritura` sube los topes: la ingesta corre desde la línea de órdenes, sin
 * nadie esperando delante de una pantalla, y ahí sí compensa insistir.
 */
export function crearDriver(escritura = false): Driver {
  const { uri, usuario, password } = configuracionGrafo();

  return neo4j.driver(uri, neo4j.auth.basic(usuario, password), {
    connectionTimeout: escritura ? 10_000 : ESPERA_CONEXION_MS,
    connectionAcquisitionTimeout: escritura ? 20_000 : ESPERA_CONEXION_MS,
    maxTransactionRetryTime: escritura ? 15_000 : ESPERA_REINTENTOS_MS,
    // El servidor de desarrollo de Next recarga módulos constantemente; sin
    // esto, cada recarga dejaría atrás un pool de conexiones abierto.
    maxConnectionPoolSize: 10,
  });
}

// El driver de lectura se reutiliza entre peticiones: abrir uno por carga de
// página costaría un saludo de protocolo cada vez. Se guarda en `globalThis`
// por lo mismo que el cliente de Prisma (`lib/prisma.ts`): en desarrollo, Next
// reevalúa el módulo en cada recarga.
const global = globalThis as unknown as { driverGrafo?: Driver };

function driverDeLectura(): Driver {
  if (!global.driverGrafo) global.driverGrafo = crearDriver();
  return global.driverGrafo;
}

/**
 * Ejecuta una consulta de solo lectura.
 *
 * Devuelve `null` si el grafo no responde: quien llama decide qué enseñar en
 * su lugar, y nunca tiene que envolver la llamada en un try/catch.
 */
export async function consultar<T>(
  cypher: string,
  parametros: Record<string, unknown> = {},
  transformar: (registro: Record<string, unknown>) => T
): Promise<T[] | null> {
  const consulta = driverDeLectura()
    .executeQuery(cypher, parametros, { routing: "READ" })
    .then(({ records }) => records.map((r) => transformar(r.toObject())))
    // Silencio a propósito: el grafo parado es un estado NORMAL de esta
    // aplicación, no un error que registrar en cada carga de página.
    .catch(() => null);

  // Tope propio, además de los del driver.
  //
  // No basta con configurar `connectionTimeout`: con el contenedor parado, la
  // pantalla del DPO tardaba entre 1,3 y 3,5 segundos porque el driver
  // reintenta por su cuenta con esperas crecientes. Aquí se corta en seco y se
  // responde `null`, que es justo lo que la pantalla sabe manejar. La promesa
  // de dentro se queda resolviéndose sola y su resultado se descarta.
  return Promise.race([
    consulta,
    new Promise<null>((resolver) => setTimeout(() => resolver(null), ESPERA_CONEXION_MS)),
  ]);
}

/**
 * Cierra el driver compartido.
 *
 * La web NO llama a esto: quiere el pool vivo entre peticiones. Lo necesitan
 * las herramientas de línea de órdenes, porque un pool abierto mantiene el
 * proceso de Node en pie y el comando se queda colgado al terminar.
 */
export async function cerrarDriverDeLectura(): Promise<void> {
  if (!global.driverGrafo) return;
  await global.driverGrafo.close();
  global.driverGrafo = undefined;
}

/**
 * ¿Responde el grafo?
 *
 * Existe para preguntarlo UNA vez antes de lanzar varias consultas. Sin esta
 * sonda, una pantalla con tres consultas y el contenedor parado se comía tres
 * tiempos de espera: medido, 3,5 segundos. Con ella, uno solo.
 */
export async function grafoDisponible(): Promise<boolean> {
  return (await consultar("RETURN 1 AS uno", {}, () => true)) !== null;
}

/** Si el grafo responde, cuántos nodos tiene dentro. */
export async function nodosDelGrafo(): Promise<number | null> {
  const filas = await consultar(
    "MATCH (n) RETURN count(n) AS nodos",
    {},
    (r) => Number(r.nodos)
  );

  return filas === null ? null : (filas[0] ?? 0);
}
