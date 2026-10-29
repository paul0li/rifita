import { obtenerRifa, type Rifa } from "../lib/api.ts";
import { linkPublico } from "../lib/claves.ts";
import { crear } from "../lib/dom.ts";
import { grilla, leyenda } from "../lib/grilla.ts";
import { aviso, botonCopiar, enFecha, enPesos, enlaceWhatsApp, seccionQueCarga } from "../lib/ui.ts";
import type { Pantalla } from "./contexto.ts";
import { noEncontrada } from "./no-encontrada.ts";

/** La página pública de la rifa: la que se comparte con cualquiera. */
export const rifaPublica: Pantalla = (contexto) =>
  seccionQueCarga(async () => {
    const rifa = await obtenerRifa(contexto.parametros.id ?? "");
    if (!rifa) return noEncontrada(contexto);
    return paginaDeRifa(rifa);
  });

function paginaDeRifa(rifa: Rifa): Node {
  const pagados = new Set(rifa.pagados);
  const ganadores = new Set(rifa.sorteo?.ganadores ?? []);
  const link = linkPublico(rifa.id);
  const libres = rifa.cantidad_numeros - pagados.size;

  return crear("article", { class: "rifa" }, [
    crear("h1", {}, [rifa.titulo]),
    rifa.descripcion ? crear("p", { class: "bajada" }, [rifa.descripcion]) : null,
    crear("p", {}, [
      crear("strong", {}, [`${enPesos(rifa.valor)} el número`]),
      rifa.abierta
        ? ` · se vende hasta el ${enFecha(rifa.fecha_termino)}`
        : " · ya no se venden números",
    ]),

    rifa.soy_duena
      ? aviso([crear("a", { href: `/${rifa.id}/organizar` }, ["Administrar esta rifa"])])
      : rifa.mi_vendedora
        ? aviso([crear("a", { href: `/${rifa.id}/vender` }, ["Vender números"])])
        : null,

    resultado(rifa),

    crear("h2", {}, ["Premios"]),
    crear("ol", { class: "premios" }, rifa.premios.map((p) => crear("li", {}, [p.descripcion]))),

    rifa.abierta
      ? crear("section", { class: "comprar" }, [
          crear("h2", {}, ["Cómo comprar"]),
          crear("p", {}, [
            "Elige un número libre, transfiere a estos datos y avísale a quien te vendió la rifa para que lo marque como pagado.",
          ]),
          crear("pre", { class: "transferencia" }, [rifa.datos_transferencia]),
          botonCopiar(() => rifa.datos_transferencia, "Copiar datos de transferencia"),
        ])
      : null,

    crear("h2", {}, ["Números"]),
    crear("p", { class: "ayuda" }, [`${libres} libres de ${rifa.cantidad_numeros}.`]),
    leyenda(ganadores.size > 0 ? ["libre", "pagado", "ganador"] : ["libre", "pagado"]),
    grilla(rifa.cantidad_numeros, (n) => (ganadores.has(n) ? "ganador" : pagados.has(n) ? "pagado" : "libre")),

    crear("div", { class: "acciones compartir" }, [
      botonCopiar(() => link, "Copiar link de la rifa"),
      enlaceWhatsApp(`${rifa.titulo}: ${link}`, "Compartir por WhatsApp"),
    ]),
  ]);
}

function resultado(rifa: Rifa): Node | null {
  const sorteo = rifa.sorteo;
  if (!sorteo) return null;
  if (!sorteo.ganadores) {
    return aviso("El sorteo está en curso. Recarga la página en unos segundos.", "alerta");
  }
  return crear("section", { class: "resultado" }, [
    crear("h2", {}, ["Resultado del sorteo"]),
    crear(
      "ol",
      {},
      sorteo.ganadores.map((numero, i) =>
        crear("li", {}, [
          crear("strong", {}, [`Número ${numero}`]),
          sorteo.nombres_ganadores?.[i] ? ` · ${sorteo.nombres_ganadores[i]}` : "",
          rifa.premios[i] ? ` · ${rifa.premios[i]!.descripcion}` : "",
        ]),
      ),
    ),
    crear("a", { href: `/${rifa.id}/verificar` }, ["Verificar el sorteo"]),
  ]);
}
