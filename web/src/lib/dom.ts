// La única forma de crear nodos en la app. El texto entra siempre con
// textContent: nunca innerHTML (ver AGENTS.md).

export type Hijo = Node | string | null | undefined | false;

type Atributo = string | boolean | ((evento: Event) => void) | null | undefined;

export function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Record<string, Atributo> = {},
  hijos: Hijo[] = [],
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (typeof valor === "function") {
      if (!nombre.startsWith("on")) throw new Error(`«${nombre}» no es un evento`);
      elemento.addEventListener(nombre.slice(2), valor);
    } else if (nombre.startsWith("on")) {
      throw new Error(`«${nombre}» tiene que ser una función, no texto`);
    } else {
      elemento.setAttribute(nombre, valor === true ? "" : valor);
    }
  }
  agregar(elemento, hijos);
  return elemento;
}

export function agregar(padre: Node, hijos: Hijo[]): void {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    padre.appendChild(typeof hijo === "string" ? document.createTextNode(hijo) : hijo);
  }
}
