import { entrarConGoogle } from "../lib/api.ts";
import { crear } from "../lib/dom.ts";
import type { Pantalla } from "./contexto.ts";

export const portada: Pantalla = ({ usuaria }) =>
  crear("section", { class: "portada" }, [
    crear("h1", {}, ["Rifita"]),
    crear("p", { class: "bajada" }, [
      "Un talonario digital, gratuito y de código abierto, para rifas benéficas.",
    ]),
    usuaria
      ? crear("a", { class: "boton", href: "/panel" }, ["Ir a mis rifas"])
      : botonEntrar("Crea tu rifa", "/crear"),
    crear("ul", { class: "puntos" }, [
      crear("li", {}, ["Sin comisiones ni publicidad: la plata va directo a quien organiza."]),
      crear("li", {}, ["Los datos de quienes compran se cifran en tu teléfono."]),
      crear("li", {}, ["Un sorteo que cualquiera puede verificar."]),
    ]),
  ]);

/** Entra con Google y vuelve a `destino`; por defecto, a esta misma página. */
export function botonEntrar(texto: string, destino = location.pathname): HTMLButtonElement {
  const boton = crear("button", { class: "boton", type: "button" }, [texto]);
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    try {
      await entrarConGoogle(destino === "/" ? "/panel" : destino);
    } catch (error) {
      boton.disabled = false;
      alert(`No pudimos abrir el login de Google. ${String(error)}`);
    }
  });
  return boton;
}
