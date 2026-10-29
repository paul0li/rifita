// La grilla de números de una rifa.

import { crear } from "./dom.ts";

export type EstadoNumero = "libre" | "pagado" | "mio" | "ganador";

const textos: Record<EstadoNumero, string> = {
  libre: "libre",
  pagado: "pagado",
  mio: "pagado, lo vendiste tú",
  ganador: "ganador",
};

export function grilla(
  cantidad: number,
  estado: (numero: number) => EstadoNumero,
  alTocar?: (numero: number) => void,
): HTMLElement {
  const numeros = [];
  for (let numero = 1; numero <= cantidad; numero++) {
    const actual = estado(numero);
    const atributos = { class: `numero ${actual}`, "aria-label": `Número ${numero}, ${textos[actual]}` };
    numeros.push(
      alTocar
        ? crear("button", { ...atributos, type: "button", onclick: () => alTocar(numero) }, [String(numero)])
        : crear("span", { ...atributos, role: "img" }, [String(numero)]),
    );
  }
  return crear("div", { class: "grilla" }, numeros);
}

export function leyenda(estados: EstadoNumero[]): HTMLElement {
  return crear(
    "ul",
    { class: "leyenda" },
    estados.map((e) => crear("li", {}, [crear("span", { class: `numero ${e}`, "aria-hidden": "true" }, [""]), textos[e]])),
  );
}
