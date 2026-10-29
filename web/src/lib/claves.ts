// Dónde vive la clave de cada rifa: en el fragmento # de los links personales y,
// una vez abierto el link, en este dispositivo. Nunca en el servidor.

import { importarClave } from "./cifrado.ts";

export type Fragmento = { clave?: string; invitacion?: string };

/** Lee `#k=…&i=…`. */
export function leerFragmento(hash: string): Fragmento {
  const parametros = new URLSearchParams(hash.replace(/^#/, ""));
  const fragmento: Fragmento = {};
  const clave = parametros.get("k");
  const invitacion = parametros.get("i");
  if (clave) fragmento.clave = clave;
  if (invitacion) fragmento.invitacion = invitacion;
  return fragmento;
}

export function linkOrganizadora(rifa: string, clave: string): string {
  return `${location.origin}/${rifa}/organizar#k=${clave}`;
}

export function linkVendedora(rifa: string, clave: string, invitacion: string): string {
  return `${location.origin}/${rifa}/vender#k=${clave}&i=${invitacion}`;
}

export function linkPublico(rifa: string): string {
  return `${location.origin}/${rifa}`;
}

/**
 * Si el link trae una clave, la guarda en este dispositivo y la borra de la
 * barra de direcciones. El código de invitación queda guardado hasta que se
 * acepte, porque entrar con Google sale de la página y vuelve.
 */
export function tomarDelLink(rifa: string): void {
  const { clave, invitacion } = leerFragmento(location.hash);
  if (clave) guardarClave(rifa, clave);
  if (invitacion) guardar(`rifita:invitacion:${rifa}`, invitacion);
  if (location.hash) history.replaceState(null, "", location.pathname);
}

export function invitacionPendiente(rifa: string): string | null {
  return leer(`rifita:invitacion:${rifa}`);
}

export function olvidarInvitacion(rifa: string): void {
  try {
    localStorage.removeItem(`rifita:invitacion:${rifa}`);
  } catch {
    // Nada que borrar.
  }
  enMemoria.delete(`rifita:invitacion:${rifa}`);
}

export function guardarClave(rifa: string, clave: string): void {
  guardar(`rifita:clave:${rifa}`, clave);
}

export function textoDeClave(rifa: string): string | null {
  return leer(`rifita:clave:${rifa}`);
}

export async function claveDe(rifa: string): Promise<CryptoKey | null> {
  const texto = textoDeClave(rifa);
  if (!texto) return null;
  try {
    return await importarClave(texto);
  } catch {
    return null;
  }
}

// Sin localStorage (navegación privada estricta) lo guardado dura lo que dure
// la pestaña.
const enMemoria = new Map<string, string>();

function guardar(nombre: string, valor: string): void {
  enMemoria.set(nombre, valor);
  try {
    localStorage.setItem(nombre, valor);
  } catch {
    // Queda solo en memoria.
  }
}

function leer(nombre: string): string | null {
  try {
    return localStorage.getItem(nombre) ?? enMemoria.get(nombre) ?? null;
  } catch {
    return enMemoria.get(nombre) ?? null;
  }
}
