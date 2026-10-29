import { obtenerRifa } from "../lib/api.ts";
import { crear } from "../lib/dom.ts";
import { calcularGanadores, DRAND, momentoDeRonda, traerRonda } from "../lib/sorteo.ts";
import { aviso, seccionQueCarga } from "../lib/ui.ts";
import type { Pantalla } from "./contexto.ts";
import { noEncontrada } from "./no-encontrada.ts";

/** Cualquiera puede rehacer el sorteo en su navegador y ver si calza. */
export const verificar: Pantalla = (contexto) =>
  seccionQueCarga(async () => {
    const rifa = await obtenerRifa(contexto.parametros.id ?? "");
    if (!rifa) return noEncontrada(contexto);
    const sorteo = rifa.sorteo;
    const volver = crear("a", { href: `/${rifa.id}` }, [`Volver a «${rifa.titulo}»`]);
    if (!sorteo?.ganadores || !sorteo.aleatoriedad) {
      return crear("section", {}, [crear("h1", {}, ["Verificar el sorteo"]), aviso("Esta rifa todavía no se sortea."), volver]);
    }

    const urlRonda = `${DRAND.servidores[0]}/${DRAND.cadena}/public/${sorteo.ronda}`;
    const deDrand = await traerRonda(sorteo.ronda);
    const recalculados = await calcularGanadores(sorteo.participantes, deDrand, rifa.premios.length);
    const calza =
      deDrand === sorteo.aleatoriedad && recalculados.join(",") === sorteo.ganadores.join(",");

    return crear("section", { class: "verificar" }, [
      crear("h1", {}, ["Verificar el sorteo"]),
      calza
        ? aviso(`El resultado calza. Ganadores, en orden de premios: ${recalculados.join(", ")}.`)
        : aviso(
            `El resultado publicado no calza con el que sale de drand. Publicado: ${sorteo.ganadores.join(", ")}. Recalculado: ${recalculados.join(", ")}.`,
            "error",
          ),

      crear("h2", {}, ["Cómo se sorteó"]),
      crear("ol", {}, [
        crear("li", {}, [
          `Al apretar «Sortear» se congelaron los ${sorteo.participantes.length} números pagados: `,
          sorteo.participantes.join(", "),
          ".",
        ]),
        crear("li", {}, [
          `Se fijó la ronda ${sorteo.ronda} de drand, que salió el ${momentoDeRonda(sorteo.ronda).toLocaleString("es-CL")}: nadie podía conocer su número antes. `,
          crear("a", { href: urlRonda, target: "_blank", rel: "noopener noreferrer" }, ["Ver la ronda en drand"]),
        ]),
        crear("li", {}, [
          "Para cada premio, en orden, el ganador sale del SHA-256 de «número de drand:número de premio», módulo la cantidad de números que quedan, ordenados de menor a mayor. Un número no gana dos veces.",
        ]),
      ]),
      crear("p", { class: "ayuda" }, [`Número de drand: ${deDrand}`]),
      volver,
    ]);
  });
