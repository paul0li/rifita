import { crear } from "../lib/dom.ts";
import type { Pantalla } from "./contexto.ts";

export const noEncontrada: Pantalla = () =>
  crear("section", {}, [
    crear("h1", {}, ["No encontramos esta página"]),
    crear("a", { href: "/" }, ["Volver al inicio"]),
  ]);
