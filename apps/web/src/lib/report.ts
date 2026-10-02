/**
 * Generador del informe de cumplimiento en HTML autocontenido.
 *
 * Vivía en `src/lib/mock/report-mock.ts`, pero de mock no tenía nada: es el
 * generador de verdad. Lo que era falso eran los datos que recibía —dos
 * porcentajes escritos a mano, ISO/IEC 42001 al 87% y RGPD al 94%, para
 * cualquier empresa—. Ahora recibe la cobertura calculada sobre las normativas
 * que esa empresa declaró, requisito a requisito y con la evidencia detrás.
 *
 * El documento dice lo que mide y lo que no: es un informe de **concienciación**,
 * no un certificado de cumplimiento.
 */
import type { Cobertura, ResultadoNormativa } from "@/lib/data/cumplimiento";
import type { Narrativa } from "@/lib/data/informe";

export interface DatosInforme {
  nombreEmpresa: string;
  sector: string;
  riesgoGlobal: number;
  cobertura: Cobertura;
  /** Lo que escribió la IA, si está al día. Nulo si nadie lo ha pedido. */
  narrativa: Narrativa | null;
  /** Modelo que la escribió, para que conste en el documento. */
  modeloNarrativa: string | null;
  empleados: { nombre: string; departamento: string; score: number; nivel: string }[];
}

/**
 * Escapa el texto que se interpola en el HTML. Los nombres de empresa vienen
 * de un formulario, los de empleados de la base de datos y la narrativa de un
 * modelo de lenguaje, así que sin esto un valor con `<` o `"` rompería el
 * documento o inyectaría marcado.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Barra de cobertura dibujada con un div: el HTML tiene que valerse solo. */
function barra(porcentaje: number): string {
  const color = porcentaje >= 80 ? "#0ca30c" : porcentaje >= 50 ? "#fab219" : "#d03b3b";
  return (
    `<div class="barra"><div style="width:${porcentaje}%;background:${color}"></div></div>`
  );
}

function bloqueNormativa(normativa: ResultadoNormativa, narrativa: Narrativa | null): string {
  const parrafo = narrativa?.porNormativa.find((p) => p.clave === normativa.clave)?.texto;

  const filas = normativa.requisitos
    .map(
      (r) =>
        `<tr><td>${escapar(r.referencia)}</td><td>${escapar(r.titulo)}</td>` +
        `<td>${escapar(r.exige)}</td>` +
        `<td class="num">${r.numerador} / ${r.denominador} ${escapar(r.unidad)}</td>` +
        `<td class="num">${r.sinDatos ? "sin datos" : `${r.porcentaje}%`}</td></tr>`
    )
    .join("");

  return `
  <section class="normativa">
    <h3>${escapar(normativa.etiqueta)} — ${normativa.porcentaje}%</h3>
    <p class="fuente">${escapar(normativa.nombreCompleto)} · ${escapar(normativa.fuente)}</p>
    ${barra(normativa.porcentaje)}
    ${parrafo ? `<p>${escapar(parrafo)}</p>` : ""}
    <table>
      <thead><tr><th>Referencia</th><th>Requisito</th><th>Qué exige</th><th>Evidencia</th><th>Cobertura</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </section>`;
}

export function construirInformeCumplimiento(datos: DatosInforme): string {
  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const filasEmpleados = datos.empleados
    .map(
      (e) =>
        `<tr><td>${escapar(e.nombre)}</td><td>${escapar(e.departamento)}</td>` +
        `<td class="num">${e.score}</td><td>${escapar(e.nivel)}</td></tr>`
    )
    .join("");

  const { cobertura, narrativa } = datos;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Informe de concienciación y cumplimiento — ${escapar(datos.nombreEmpresa)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; background:#0a0e14; color:#f1f5f9; padding:40px; max-width:1000px; margin:0 auto; }
  h1 { color:#22d3ee; margin-bottom:4px; }
  h2 { color:#22d3ee; margin-top:36px; border-bottom:1px solid #1e293b; padding-bottom:6px; }
  h3 { margin-bottom:2px; }
  table { width:100%; border-collapse: collapse; margin-top:12px; font-size:14px; }
  th, td { text-align:left; padding:8px 12px; border-bottom:1px solid #1e293b; vertical-align:top; }
  th { color:#94a3b8; font-weight:600; }
  td.num { text-align:right; white-space:nowrap; }
  .kpi { display:inline-block; margin-right:32px; }
  .kpi b { display:block; font-size:28px; color:#22d3ee; }
  .barra { background:#1e293b; border-radius:4px; height:8px; overflow:hidden; margin:8px 0 12px; }
  .barra div { height:100%; }
  .normativa { margin-top:28px; }
  .fuente { color:#94a3b8; font-size:13px; margin:0; }
  .aviso { color:#94a3b8; font-size:13px; border-left:3px solid #1e293b; padding-left:12px; }
  ol li { margin-bottom:8px; }
</style></head>
<body>
  <h1>Informe de concienciación y cumplimiento</h1>
  <p>${escapar(datos.nombreEmpresa)} · Sector: ${escapar(datos.sector)} · Generado el ${fecha}</p>

  <p class="aviso">
    Este documento mide la <b>cobertura de concienciación</b> que exige cada normativa
    declarada por la organización: qué parte de su plantilla ha recibido la formación,
    la ha superado y resiste una simulación de fraude. No es un certificado de
    cumplimiento: las medidas técnicas, contractuales y organizativas que esas mismas
    normas exigen quedan fuera de lo que esta plataforma puede evidenciar.
  </p>

  <div style="margin-top:24px">
    <div class="kpi">Cobertura global<b>${cobertura.global}%</b></div>
    <div class="kpi">Riesgo global<b>${datos.riesgoGlobal}/100</b></div>
    <div class="kpi">Plantilla<b>${cobertura.plantilla}</b></div>
    <div class="kpi">Normativas<b>${cobertura.normativas.length}</b></div>
  </div>

  ${
    narrativa
      ? `<h2>Resumen ejecutivo</h2><p>${escapar(narrativa.resumen)}</p>`
      : `<h2>Resumen ejecutivo</h2><p class="aviso">Todavía no se ha redactado el resumen
         de este informe. Puede pedirse desde el panel de cumplimiento; las cifras de
         abajo no dependen de él.</p>`
  }

  <h2>Marco normativo aplicable</h2>
  ${
    cobertura.normativas.length > 0
      ? cobertura.normativas.map((n) => bloqueNormativa(n, narrativa)).join("")
      : `<p class="aviso">La organización no ha declarado su marco normativo en el perfil
         de empresa, así que no hay nada contra lo que medir la concienciación.</p>`
  }

  ${
    narrativa && narrativa.recomendaciones.length > 0
      ? `<h2>Recomendaciones</h2><ol>${narrativa.recomendaciones
          .map((r) => `<li>${escapar(r)}</li>`)
          .join("")}</ol>`
      : ""
  }

  <h2>Risk Score por empleado</h2>
  <table>
    <thead><tr><th>Empleado</th><th>Departamento</th><th>Risk Score</th><th>Nivel</th></tr></thead>
    <tbody>${filasEmpleados}</tbody>
  </table>

  <p style="margin-top:32px;color:#94a3b8;font-size:13px;">
    Documento generado automáticamente por NexusGuard AI a partir de los datos de la
    plataforma: formación completada, evaluaciones adaptativas y campañas de simulación.
    ${
      datos.modeloNarrativa
        ? `El resumen y las recomendaciones los redactó el modelo ${escapar(datos.modeloNarrativa)} sobre estas mismas cifras.`
        : ""
    }
  </p>
</body></html>`;
}

/** Descarga un texto como fichero. Usa API de navegador: solo en cliente. */
export function descargarFichero(
  nombre: string,
  contenido: string,
  mime = "text/html"
): void {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
