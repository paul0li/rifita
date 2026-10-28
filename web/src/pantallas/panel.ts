import { darDeBaja, salir } from "../lib/api.ts";
import { crear } from "../lib/dom.ts";
import { navegar } from "../lib/navegacion.ts";
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
    crear("h2", {}, ["Mis rifas"]),
    crear("p", { class: "vacio" }, ["Todavía no tienes rifas."]),
    crear("h2", {}, ["Rifas donde vendo"]),
    crear("p", { class: "vacio" }, ["Todavía no vendes en ninguna rifa."]),
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
