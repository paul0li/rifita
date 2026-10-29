import { crearRifa, mensajeDeError } from "../lib/api.ts";
import { exportarClave, generarClave } from "../lib/cifrado.ts";
import { guardarClave, linkOrganizadora } from "../lib/claves.ts";
import { crear } from "../lib/dom.ts";
import { navegar } from "../lib/navegacion.ts";
import { aviso, cajaDeLink, campo } from "../lib/ui.ts";
import type { Pantalla } from "./contexto.ts";
import { botonEntrar } from "./portada.ts";

export const crearRifaPantalla: Pantalla = ({ usuaria }) => {
  if (!usuaria) {
    return crear("section", {}, [
      crear("h1", {}, ["Crea tu rifa"]),
      crear("p", {}, ["Entra con Google para crear tu rifa."]),
      botonEntrar("Entrar con Google", "/crear"),
    ]);
  }

  const hoy = new Date();
  const enUnMes = sumarDias(hoy, 30);
  const maximo = new Date(hoy);
  maximo.setMonth(maximo.getMonth() + 3);
  maximo.setDate(maximo.getDate() - 1);

  const titulo = crear("input", { name: "titulo", required: true, maxlength: "120" });
  const descripcion = crear("textarea", { name: "descripcion", rows: "3", maxlength: "2000" });
  const cantidad = crear("input", { name: "cantidad", type: "number", required: true, min: "1", max: "1000", value: "100", inputmode: "numeric" });
  const valor = crear("input", { name: "valor", type: "number", required: true, min: "1", value: "1000", inputmode: "numeric" });
  const transferencia = crear("textarea", { name: "transferencia", rows: "4", required: true, maxlength: "1000" });
  const termino = crear("input", { name: "termino", type: "date", required: true, value: comoFecha(enUnMes), min: comoFecha(sumarDias(hoy, 1)), max: comoFecha(maximo) });
  const premios = crear("textarea", { name: "premios", rows: "4", required: true });
  const enviar = crear("button", { type: "submit", class: "boton" }, ["Crear rifa"]);
  const mensaje = crear("div", {});

  const formulario = crear("form", { class: "formulario" }, [
    campo("Título", titulo, "Por ejemplo: Rifa para la operación de la Tati."),
    campo("Descripción", descripcion, "Opcional: para qué se junta la plata."),
    campo("Cantidad de números", cantidad, "Entre 1 y 1000."),
    campo("Valor de cada número, en pesos", valor),
    campo("Datos de transferencia", transferencia, "Nombre, RUT, banco, tipo y número de cuenta, y correo. Se muestran en la página de la rifa."),
    campo("Premios, uno por línea", premios, "En orden: el primero es el primer premio."),
    campo("Fecha de término", termino, "Hasta 3 meses. Después de esa fecha no se venden más números, pero puedes sortear."),
    mensaje,
    enviar,
  ]);

  const seccion = crear("section", {}, [crear("h1", {}, ["Crea tu rifa"]), formulario]);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    enviar.disabled = true;
    mensaje.replaceChildren();
    try {
      const clave = await generarClave();
      const textoClave = await exportarClave(clave);
      // La fecha elegida, hasta el final de ese día en la hora local.
      const fin = new Date(`${termino.value}T23:59:59`);
      const id = await crearRifa(
        {
          titulo: titulo.value.trim(),
          descripcion: descripcion.value.trim(),
          cantidad_numeros: Number(cantidad.value),
          valor: Number(valor.value),
          datos_transferencia: transferencia.value.trim(),
          fecha_termino: fin.toISOString(),
        },
        premios.value.split("\n").map((p) => p.trim()).filter((p) => p !== ""),
      );
      guardarClave(id, textoClave);
      seccion.replaceChildren(guardaTuLink(id, titulo.value.trim(), linkOrganizadora(id, textoClave)));
    } catch (error) {
      enviar.disabled = false;
      mensaje.replaceChildren(aviso(`No pudimos crear la rifa: ${mensajeDeError(error)}`, "error"));
    }
  });

  return seccion;
};

function guardaTuLink(id: string, titulo: string, link: string): Node {
  const listo = crear("input", { type: "checkbox", id: "ya-lo-guarde" });
  const seguir = crear("button", { type: "button", class: "boton", disabled: true, onclick: () => navegar(`/${id}/organizar`) }, [
    "Ir a mi rifa",
  ]);
  listo.addEventListener("change", () => (seguir.disabled = !listo.checked));

  return crear("div", {}, [
    crear("h1", {}, ["Guarda tu link de organizadora"]),
    crear("p", {}, [
      "Este link tiene la clave que cifra los nombres y contactos de quienes compran. ",
      crear("strong", {}, ["Nadie más la tiene, ni siquiera Rifita."]),
      " Si cambias de teléfono o se borran los datos del navegador, la vas a necesitar para ver los nombres.",
    ]),
    crear("p", {}, ["Mándatelo por WhatsApp o guárdalo en tus notas. No lo compartas: para vender, invita a tus vendedoras desde tu rifa."]),
    cajaDeLink(link, `Mi link de organizadora de «${titulo}» en Rifita. No lo compartas: ${link}`),
    crear("label", { class: "confirmar", for: "ya-lo-guarde" }, [listo, " Ya lo guardé"]),
    seguir,
  ]);
}

function sumarDias(fecha: Date, dias: number): Date {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

function comoFecha(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
