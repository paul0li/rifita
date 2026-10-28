// Rutas por path. El fragmento # queda libre para las claves.

export type Parametros = Record<string, string>;

/**
 * Compara una ruta como `/abc/vender` con un patrón como `/:id/vender`.
 * Devuelve los parámetros si coincide, o null.
 */
export function coincidir(patron: string, ruta: string): Parametros | null {
  const partesPatron = partir(patron);
  const partesRuta = partir(ruta);
  if (partesPatron.length !== partesRuta.length) return null;

  const parametros: Parametros = {};
  for (let i = 0; i < partesPatron.length; i++) {
    const esperado = partesPatron[i]!;
    const recibido = partesRuta[i]!;
    if (esperado.startsWith(":")) {
      parametros[esperado.slice(1)] = decodeURIComponent(recibido);
    } else if (esperado !== recibido) {
      return null;
    }
  }
  return parametros;
}

/** La primera ruta de la lista que coincide, en orden. */
export function buscar<T>(
  rutas: readonly { patron: string; valor: T }[],
  ruta: string,
): { valor: T; parametros: Parametros } | null {
  for (const { patron, valor } of rutas) {
    const parametros = coincidir(patron, ruta);
    if (parametros) return { valor, parametros };
  }
  return null;
}

function partir(ruta: string): string[] {
  return ruta.split("/").filter((parte) => parte !== "");
}
