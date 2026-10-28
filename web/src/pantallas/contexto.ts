import type { Usuaria } from "../lib/api.ts";
import type { Parametros } from "../lib/rutas.ts";

/** Lo que recibe cada pantalla para pintarse. */
export type Contexto = {
  usuaria: Usuaria | null;
  parametros: Parametros;
};

export type Pantalla = (contexto: Contexto) => Node;
