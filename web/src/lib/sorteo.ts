// El sorteo con drand (ver ADR 0001, Sorteo). Este algoritmo no se cambia sin
// versionarlo: los sorteos pasados se tienen que poder verificar.

import { sha256Hex } from "./cifrado.ts";

/** drand quicknet: una ronda cada 3 segundos desde su génesis. */
export const DRAND = {
  cadena: "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971",
  genesis: 1692803367,
  periodo: 3,
  servidores: ["https://api.drand.sh", "https://drand.cloudflare.com"],
} as const;

export function momentoDeRonda(ronda: number): Date {
  return new Date((DRAND.genesis + (ronda - 1) * DRAND.periodo) * 1000);
}

/** La aleatoriedad de una ronda, en hexadecimal. Prueba cada servidor. */
export async function traerRonda(ronda: number): Promise<string> {
  let ultimoError: unknown;
  for (const servidor of DRAND.servidores) {
    try {
      const respuesta = await fetch(`${servidor}/${DRAND.cadena}/public/${ronda}`);
      if (!respuesta.ok) throw new Error(`drand respondió ${respuesta.status}`);
      const datos = await respuesta.json();
      if (datos.round !== ronda || !/^[0-9a-f]{64}$/.test(datos.randomness)) {
        throw new Error("drand devolvió otra ronda");
      }
      return datos.randomness;
    } catch (error) {
      ultimoError = error;
    }
  }
  throw new Error(`No pudimos traer la ronda ${ronda} de drand: ${String(ultimoError)}`);
}

/**
 * Los números ganadores, en orden de premios. Para el premio i, el ganador sale
 * de SHA-256(`aleatoriedad:i`) módulo la cantidad de participantes que quedan,
 * ordenados de menor a mayor. Un número no gana dos veces.
 */
export async function calcularGanadores(
  participantes: readonly number[],
  aleatoriedad: string,
  premios: number,
): Promise<number[]> {
  const quedan = [...participantes].sort((a, b) => a - b);
  const ganadores: number[] = [];
  for (let premio = 1; premio <= premios && quedan.length > 0; premio++) {
    const resumen = BigInt(`0x${await sha256Hex(`${aleatoriedad}:${premio}`)}`);
    const posicion = Number(resumen % BigInt(quedan.length));
    ganadores.push(quedan.splice(posicion, 1)[0]!);
  }
  return ganadores;
}

/** «Pedro Soto Díaz» → «Pedro S.». Lo que se publica de quien gana. */
export function abreviar(nombre: string): string {
  const [primero, segundo] = nombre.trim().split(/\s+/);
  if (!primero) return "";
  return segundo ? `${primero} ${segundo[0]!.toUpperCase()}.` : primero;
}
