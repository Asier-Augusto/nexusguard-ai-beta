"use client";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { construirInformeCumplimiento, descargarFichero, type DatosInforme } from "@/lib/report";

/**
 * Descarga el informe de cumplimiento. El HTML se construye en el navegador
 * porque la descarga necesita `Blob` y `URL.createObjectURL`, pero los datos
 * que recibe vienen ya resueltos desde el servidor.
 *
 * Ya no se llama "Reporte ISO/IEC 42001": el marco del informe es el que la
 * empresa haya declarado, y a una hostelería no le aplica esa norma.
 */
export function BotonInforme({
  datos,
  variante = "secondary",
}: {
  datos: DatosInforme;
  variante?: "primary" | "secondary";
}) {
  function descargar() {
    // Los acentos se descomponen y se eliminan las marcas diacríticas
    // (U+0300–U+036F) para que el nombre del fichero sea seguro en cualquier
    // sistema de ficheros.
    const nombreEmpresa = datos.nombreEmpresa
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    descargarFichero(
      `informe-cumplimiento-${nombreEmpresa || "empresa"}.html`,
      construirInformeCumplimiento(datos)
    );
  }

  return (
    <Button onClick={descargar} variant={variante}>
      <Icon name="FileDown" size={20} />
      Descargar informe
    </Button>
  );
}
