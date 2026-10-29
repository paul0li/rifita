import { darDeBaja, misRifas, salir, type ResumenRifa, type Usuaria } from "../lib/api.ts";
import { crear } from "../lib/dom.ts";
import { navegar } from "../lib/navegacion.ts";
import { enFecha, seccionQueCarga } from "../lib/ui.ts";
import type { Pantalla } from "./contexto.ts";
import { botonEntrar } from "./portada.ts";

export const panel: Pantalla = ({ usuaria }) => {
  if (!usuaria) {
    return crear("section", {}, [
      crear("h1", {}, ["Tus rifas"]),
      crear("p", {}, ["Entra con Google para ver tus rifas."]),
      botonEntrar("Entrar con Google"),
    ]);
  }

  return crear("section", { class: "panel" }, [
    crear("header", { class: "encabezado" }, [
      crear("h1", {}, ["Tus rifas"]),
      crear("p", { class: "correo" }, [usuaria.correo]),
    ]),
    seccionQueCarga(async () => listas(usuaria, await misRifas())),
    crear("footer", { class: "cuenta" }, [
      crear(
        "button",
        { type: "button", class: "secundario", onclick: () => void salir().then(() => navegar("/")) },
        ["Salir"],
      ),
      seccionBaja(),
    ]),
  ]);
};

function listas(usuaria: Usuaria, rifas: ResumenRifa[]): Node {
  const mias = rifas.filter((r) => r.dueno_id === usuaria.id);
  const dondeVendo = rifas.filter((r) => r.dueno_id !== usuaria.id);
  const tieneAbierta = mias.some((r) => new Date(r.fecha_termino) > new Date());

  return crear("div", {}, [
    crear("h2", {}, ["Mis rifas"]),
    mias.length === 0
      ? crear("p", { class: "vacio" }, ["Todavía no tienes rifas."])
      : lista(mias, "organizar"),
    tieneAbierta
      ? crear("p", { class: "ayuda" }, ["Puedes tener una rifa abierta a la vez."])
      : crear("a", { class: "boton", href: "/crear" }, ["Crear una rifa"]),
    crear("h2", {}, ["Rifas donde vendo"]),
    dondeVendo.length === 0
      ? crear("p", { class: "vacio" }, ["Todavía no vendes en ninguna rifa."])
      : lista(dondeVendo, "vender"),
  ]);
}

function lista(rifas: ResumenRifa[], accion: "organizar" | "vender"): Node {
  return crear(
    "ul",
    { class: "lista-rifas" },
    rifas.map((r) =>
      crear("li", {}, [
        crear("a", { href: `/${r.id}/${accion}` }, [r.titulo]),
        crear("span", { class: "ayuda" }, [
          new Date(r.fecha_termino) > new Date()
            ? ` · termina el ${enFecha(r.fecha_termino)}`
            : ` · terminó el ${enFecha(r.fecha_termino)}`,
        ]),
      ]),
    ),
  );
}

function seccionBaja(): Node {
  const confirmar = crear("button", { type: "button", class: "peligro" }, [
    "Sí, borrar mi cuenta",
  ]);
  const dialogo = crear("dialog", { "aria-labelledby": "titulo-baja" }, [
    crear("h2", { id: "titulo-baja" }, ["¿Borrar tu cuenta?"]),
    crear("p", {}, [
      "Se borran tu cuenta y todas tus rifas, con sus números y compradores. No se puede deshacer.",
    ]),
    crear("div", { class: "acciones" }, [
      crear("button", { type: "button", class: "secundario", onclick: () => dialogo.close() }, [
        "Cancelar",
      ]),
      confirmar,
    ]),
  ]);

  confirmar.addEventListener("click", async () => {
    confirmar.disabled = true;
    try {
      await darDeBaja();
      dialogo.close();
      navegar("/");
    } catch (error) {
      confirmar.disabled = false;
      alert(`No pudimos borrar tu cuenta. ${String(error)}`);
    }
  });

  return crear("div", {}, [
    crear("button", { type: "button", class: "enlace", onclick: () => dialogo.showModal() }, [
      "Dar de baja mi cuenta",
    ]),
    dialogo,
  ]);
}
