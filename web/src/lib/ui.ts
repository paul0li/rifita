// Piezas de pantalla que se repiten.

import { mensajeDeError } from "./api.ts";
import { crear, type Hijo } from "./dom.ts";

const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });
const fecha = new Intl.DateTimeFormat("es-CL", { dateStyle: "long" });

export function enPesos(valor: number): string {
  return pesos.format(valor);
}

export function enFecha(iso: string): string {
  return fecha.format(new Date(iso));
}

/**
 * Muestra «Cargando…» y lo reemplaza por lo que pinte `cargar`, o por el error.
 * `volver` se pasa a `cargar` para repintar la misma sección después de un cambio.
 */
export function seccionQueCarga(cargar: (volver: () => void) => Promise<Node>): HTMLElement {
  const contenedor = crear("div", { class: "carga" }, [crear("p", { class: "vacio" }, ["Cargando…"])]);
  const volver = () => {
    cargar(volver).then(
      (nodo) => contenedor.replaceChildren(nodo),
      (error) => contenedor.replaceChildren(aviso(`Algo falló: ${mensajeDeError(error)}`, "error")),
    );
  };
  volver();
  return contenedor;
}

export function aviso(texto: Hijo | Hijo[], tipo: "info" | "alerta" | "error" = "info"): HTMLElement {
  return crear("div", { class: `aviso ${tipo}`, role: tipo === "error" ? "alert" : "status" }, Array.isArray(texto) ? texto : [texto]);
}

export function botonCopiar(texto: () => string, etiqueta = "Copiar"): HTMLButtonElement {
  const boton = crear("button", { type: "button", class: "secundario" }, [etiqueta]);
  boton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(texto());
      boton.textContent = "¡Copiado!";
    } catch {
      boton.textContent = "No se pudo copiar";
    }
    setTimeout(() => (boton.textContent = etiqueta), 2000);
  });
  return boton;
}

export function enlaceWhatsApp(mensaje: string, etiqueta = "Enviar por WhatsApp"): HTMLAnchorElement {
  return crear(
    "a",
    {
      class: "secundario",
      href: `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
      target: "_blank",
      rel: "noopener noreferrer",
    },
    [etiqueta],
  );
}

/** Un campo con su etiqueta. */
export function campo(etiqueta: string, control: HTMLElement, ayuda?: string): HTMLElement {
  return crear("label", { class: "campo" }, [
    crear("span", { class: "etiqueta" }, [etiqueta]),
    control,
    ayuda ? crear("span", { class: "ayuda" }, [ayuda]) : null,
  ]);
}

/** Un link con su clave, para mostrar y compartir sin perderlo. */
export function cajaDeLink(link: string, mensajeWhatsApp: string): HTMLElement {
  return crear("div", { class: "caja-link" }, [
    crear("input", { type: "text", readonly: true, value: link, "aria-label": "Link", onfocus: (e) => (e.target as HTMLInputElement).select() }),
    crear("div", { class: "acciones" }, [botonCopiar(() => link, "Copiar link"), enlaceWhatsApp(mensajeWhatsApp)]),
  ]);
}
