// Administrar (organizadora) o vender (vendedora) una rifa. Es la única
// pantalla que lee y escribe datos de compradores, y solo con la clave que
// trae el link personal.

import {
  aceptarInvitacion,
  fijarSorteo,
  invitar,
  liberar,
  mensajeDeError,
  obtenerRifa,
  publicarSorteo,
  quitarVendedora,
  vendedoras as traerVendedoras,
  vender,
  ventas as traerVentas,
  type Rifa,
  type Sorteo,
  type Vendedora,
  type Venta,
} from "../lib/api.ts";
import {
  cifrar,
  cifrarTexto,
  codigoAlAzar,
  descifrar,
  descifrarTexto,
  sha256Hex,
  type Comprador,
} from "../lib/cifrado.ts";
import {
  claveDe,
  invitacionPendiente,
  linkOrganizadora,
  linkVendedora,
  olvidarInvitacion,
  textoDeClave,
  tomarDelLink,
} from "../lib/claves.ts";
import { crear } from "../lib/dom.ts";
import { grilla, leyenda } from "../lib/grilla.ts";
import { navegar } from "../lib/navegacion.ts";
import { abreviar, calcularGanadores, momentoDeRonda, traerRonda } from "../lib/sorteo.ts";
import { aviso, cajaDeLink, campo, enFecha, enPesos, seccionQueCarga } from "../lib/ui.ts";
import type { Contexto, Pantalla } from "./contexto.ts";
import { noEncontrada } from "./no-encontrada.ts";
import { botonEntrar } from "./portada.ts";

type Modo = "organizar" | "vender";

export const organizar: Pantalla = (contexto) => gestion(contexto, "organizar");
export const venderPantalla: Pantalla = (contexto) => gestion(contexto, "vender");

/** Todo lo que la pantalla necesita, ya descifrado si hay clave. */
type Estado = {
  rifa: Rifa;
  modo: Modo;
  clave: CryptoKey | null;
  ventas: Map<number, Venta>;
  compradores: Map<number, Comprador | null>;
  vendedoras: Vendedora[];
  volver: () => void;
};

function gestion(contexto: Contexto, modo: Modo): Node {
  const id = contexto.parametros.id ?? "";
  // Antes que nada: guardar la clave y sacarla de la barra de direcciones.
  tomarDelLink(id);

  if (!contexto.usuaria) {
    return crear("section", {}, [
      crear("h1", {}, [modo === "organizar" ? "Administra tu rifa" : "Vende números"]),
      crear("p", {}, ["Entra con Google para seguir."]),
      botonEntrar("Entrar con Google"),
    ]);
  }

  return seccionQueCarga(async (volver) => {
    let rifa = await obtenerRifa(id);
    if (!rifa) return noEncontrada(contexto);

    if (modo === "vender" && rifa.soy_duena) {
      queueMicrotask(() => navegar(`/${id}/organizar`));
      return crear("p", {}, ["Abriendo tu rifa…"]);
    }
    if (modo === "organizar" && !rifa.soy_duena) {
      return aviso(["Esta rifa no es tuya. ", crear("a", { href: `/${id}` }, ["Ver la rifa"])], "alerta");
    }
    if (modo === "vender" && !rifa.mi_vendedora) {
      const codigo = invitacionPendiente(id);
      if (!codigo) {
        return aviso("Para vender en esta rifa, abre el link que te mandó tu organizadora.", "alerta");
      }
      try {
        await aceptarInvitacion(id, codigo);
      } catch (error) {
        return aviso(`No pudimos aceptar la invitación: ${mensajeDeError(error)}`, "error");
      }
      olvidarInvitacion(id);
      rifa = (await obtenerRifa(id))!;
    }

    const clave = await claveDe(id);
    const lista = await traerVentas(id);
    const compradores = new Map<number, Comprador | null>();
    for (const venta of lista) {
      compradores.set(venta.numero, await leerComprador(clave, venta.comprador_cifrado));
    }

    return pintar({
      rifa,
      modo,
      clave,
      ventas: new Map(lista.map((v) => [v.numero, v])),
      compradores,
      vendedoras: rifa.soy_duena ? await traerVendedoras(id) : [],
      volver,
    });
  });
}

async function leerComprador(clave: CryptoKey | null, cifrado: string | null): Promise<Comprador | null> {
  if (!clave || !cifrado) return null;
  try {
    return await descifrar(clave, cifrado);
  } catch {
    return null;
  }
}

function pintar(estado: Estado): Node {
  const { rifa, modo, clave, ventas } = estado;
  const pagados = new Set(rifa.pagados);
  const ganadores = new Set(rifa.sorteo?.ganadores ?? []);

  return crear("section", { class: "gestion" }, [
    crear("h1", {}, [rifa.titulo]),
    crear("p", {}, [
      estadoDeRifa(rifa),
      " · ",
      crear("a", { href: `/${rifa.id}` }, ["Ver la página pública"]),
    ]),

    clave
      ? null
      : aviso(
          modo === "organizar"
            ? "Este dispositivo no tiene la clave de la rifa: abre tu link de organizadora para ver los nombres y vender."
            : "Este dispositivo no tiene la clave de la rifa: abre el link que te mandó tu organizadora para ver los nombres y vender.",
          "alerta",
        ),

    crear("p", { class: "resumen" }, [
      modo === "organizar"
        ? `${pagados.size} de ${rifa.cantidad_numeros} pagados · ${enPesos(pagados.size * rifa.valor)} recaudados`
        : `Vendiste ${ventas.size} ${ventas.size === 1 ? "número" : "números"} · ${pagados.size} de ${rifa.cantidad_numeros} pagados en total`,
    ]),

    crear("h2", {}, ["Números"]),
    rifa.abierta && clave ? crear("p", { class: "ayuda" }, ["Toca un número libre para marcarlo como pagado."]) : null,
    leyenda(modo === "organizar" ? ["libre", "mio"] : ["libre", "mio", "pagado"]),
    grilla(
      rifa.cantidad_numeros,
      (n) => (ganadores.has(n) ? "ganador" : ventas.has(n) ? "mio" : pagados.has(n) ? "pagado" : "libre"),
      (n) => tocarNumero(estado, n),
    ),

    listaDeVentas(estado),
    rifa.soy_duena ? seccionVendedoras(estado) : null,
    rifa.soy_duena ? seccionSorteo(estado) : null,
    rifa.soy_duena && clave ? seccionMiLink(rifa) : null,
  ]);
}

function estadoDeRifa(rifa: Rifa): string {
  if (rifa.sorteo?.ganadores) return "Sorteada";
  if (rifa.sorteo) return "Sorteo en curso";
  if (rifa.abierta) return `Abierta hasta el ${enFecha(rifa.fecha_termino)}`;
  return "Ya no se venden números";
}

// Números ---------------------------------------------------------------------

function tocarNumero(estado: Estado, numero: number): void {
  const { rifa, ventas, clave } = estado;
  const venta = ventas.get(numero);
  if (venta) return abrir(dialogoVenta(estado, venta));
  if (rifa.pagados.includes(numero)) return alert(`El número ${numero} ya lo vendió otra persona.`);
  if (!rifa.abierta) return alert("Esta rifa ya no vende números.");
  if (!clave) return alert("Abre tu link en este dispositivo para poder vender.");
  abrir(dialogoVender(estado, numero, clave));
}

function dialogoVender(estado: Estado, numero: number, clave: CryptoKey): HTMLDialogElement {
  const nombre = crear("input", { required: true, maxlength: "120", autocomplete: "off" });
  const contacto = crear("input", { required: true, maxlength: "200", autocomplete: "off" });
  const enviar = crear("button", { type: "submit", class: "boton" }, ["Marcar pagado"]);
  const mensaje = crear("div", {});

  const formulario = crear("form", { class: "formulario", method: "dialog" }, [
    crear("h2", {}, [`Número ${numero}`]),
    campo("Nombre de quien compra", nombre),
    campo("Contacto", contacto, "Teléfono o correo, para avisarle si gana."),
    crear("p", { class: "ayuda" }, [
      "Antes de anotarlos, cuéntale a quien compra que su nombre y contacto se usan solo para esta rifa, se guardan cifrados y se borran 3 meses después del término.",
    ]),
    mensaje,
    crear("div", { class: "acciones" }, [botonCerrar(), enviar]),
  ]);
  const dialogo = crear("dialog", {}, [formulario]);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    enviar.disabled = true;
    try {
      const cifrado = await cifrar(clave, { nombre: nombre.value.trim(), contacto: contacto.value.trim() });
      await vender(estado.rifa.id, numero, estado.modo === "vender" ? estado.rifa.mi_vendedora : null, cifrado);
      dialogo.close();
      estado.volver();
    } catch (error) {
      enviar.disabled = false;
      const texto = mensajeDeError(error);
      mensaje.replaceChildren(
        aviso(texto.includes("duplicate") ? "Alguien acaba de vender este número." : `No se pudo marcar: ${texto}`, "error"),
      );
    }
  });
  return dialogo;
}

function dialogoVenta(estado: Estado, venta: Venta): HTMLDialogElement {
  const comprador = estado.compradores.get(venta.numero) ?? null;
  const liberarBoton = crear("button", { type: "button", class: "peligro" }, ["Dejarlo libre"]);
  const dialogo = crear("dialog", {}, [
    crear("h2", {}, [`Número ${venta.numero}`]),
    comprador
      ? crear("dl", { class: "datos" }, [
          crear("dt", {}, ["Nombre"]),
          crear("dd", {}, [comprador.nombre]),
          crear("dt", {}, ["Contacto"]),
          crear("dd", {}, [comprador.contacto]),
        ])
      : crear("p", { class: "vacio" }, [
          venta.comprador_cifrado ? "Abre tu link en este dispositivo para ver quién lo compró." : "Los datos de quien compró ya se borraron.",
        ]),
    crear("p", { class: "ayuda" }, [
      `Marcado el ${enFecha(venta.marcado_en)}`,
      estado.rifa.soy_duena ? ` · ${nombreDeVendedora(estado, venta.vendedora_id)}` : "",
    ]),
    crear("div", { class: "acciones" }, [botonCerrar(), estado.rifa.abierta ? liberarBoton : null]),
  ]);

  liberarBoton.addEventListener("click", async () => {
    if (!confirm(`¿Dejar libre el número ${venta.numero}? Se borran los datos de quien lo compró.`)) return;
    liberarBoton.disabled = true;
    try {
      await liberar(estado.rifa.id, venta.numero);
      dialogo.close();
      estado.volver();
    } catch (error) {
      liberarBoton.disabled = false;
      alert(`No se pudo liberar: ${mensajeDeError(error)}`);
    }
  });
  return dialogo;
}

function nombreDeVendedora(estado: Estado, id: string | null): string {
  if (!id) return "lo vendiste tú";
  return `lo vendió ${estado.vendedoras.find((v) => v.id === id)?.nombre ?? "una vendedora que ya no está"}`;
}

function listaDeVentas(estado: Estado): Node {
  const ventas = [...estado.ventas.values()];
  if (ventas.length === 0) return crear("p", { class: "vacio" }, ["Todavía no hay ventas."]);
  return crear("div", {}, [
    crear("h2", {}, [estado.modo === "organizar" ? "Ventas" : "Tus ventas"]),
    crear(
      "ul",
      { class: "ventas" },
      ventas.map((venta) => {
        const comprador = estado.compradores.get(venta.numero);
        return crear("li", {}, [
          crear("strong", {}, [String(venta.numero)]),
          crear("span", {}, [comprador ? `${comprador.nombre} · ${comprador.contacto}` : "🔒"]),
          estado.rifa.soy_duena ? crear("span", { class: "ayuda" }, [nombreDeVendedora(estado, venta.vendedora_id)]) : null,
        ]);
      }),
    ),
  ]);
}

// Vendedoras ------------------------------------------------------------------

function seccionVendedoras(estado: Estado): Node {
  const { rifa, clave } = estado;
  const nombre = crear("input", { required: true, maxlength: "80", placeholder: "Por ejemplo: Juana" });
  const enviar = crear("button", { type: "submit", class: "secundario" }, ["Invitar"]);
  const resultado = crear("div", {});
  const lista = crear("div", {});
  const pintarLista = () =>
    lista.replaceChildren(
      estado.vendedoras.length === 0
        ? crear("p", { class: "vacio" }, ["Todavía no invitas a nadie."])
        : crear("ul", { class: "vendedoras" }, estado.vendedoras.map((v) => filaVendedora(estado, v))),
    );
  pintarLista();
  const formulario = crear("form", { class: "en-linea" }, [campo("Nombre de la vendedora", nombre), enviar]);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!clave) return;
    enviar.disabled = true;
    try {
      const codigo = codigoAlAzar();
      estado.vendedoras.push(
        await invitar(rifa.id, nombre.value.trim(), await sha256Hex(codigo), await cifrarTexto(clave, codigo)),
      );
      pintarLista();
      resultado.replaceChildren(linkParaVendedora(rifa, nombre.value.trim(), codigo));
      nombre.value = "";
      enviar.disabled = false;
    } catch (error) {
      enviar.disabled = false;
      resultado.replaceChildren(aviso(`No se pudo invitar: ${mensajeDeError(error)}`, "error"));
    }
  });

  return crear("section", {}, [
    crear("h2", {}, ["Vendedoras"]),
    crear("p", { class: "ayuda" }, [
      "Cada vendedora recibe su propio link. Lo abre, entra con Google y puede marcar números. Ve solo sus ventas.",
    ]),
    lista,
    rifa.abierta && clave ? formulario : null,
    resultado,
  ]);
}

function filaVendedora(estado: Estado, vendedora: Vendedora): Node {
  const link = crear("div", {});
  const copiar = crear("button", { type: "button", class: "enlace" }, ["Ver su link"]);
  const quitar = crear("button", { type: "button", class: "enlace" }, ["Quitar"]);

  copiar.addEventListener("click", async () => {
    if (!estado.clave) return;
    try {
      const codigo = await descifrarTexto(estado.clave, vendedora.codigo_cifrado);
      link.replaceChildren(linkParaVendedora(estado.rifa, vendedora.nombre, codigo));
    } catch {
      link.replaceChildren(aviso("No pudimos abrir este link con la clave de este dispositivo.", "error"));
    }
  });
  quitar.addEventListener("click", async () => {
    if (!confirm(`¿Quitar a ${vendedora.nombre}? Sus ventas quedan, pero ya no podrá vender ni verlas.`)) return;
    try {
      await quitarVendedora(vendedora.id);
      estado.volver();
    } catch (error) {
      alert(`No se pudo quitar: ${mensajeDeError(error)}`);
    }
  });

  return crear("li", {}, [
    crear("strong", {}, [vendedora.nombre]),
    crear("span", { class: "ayuda" }, [vendedora.aceptada_en ? " · ya entró" : " · todavía no abre su link"]),
    crear("div", { class: "acciones" }, [estado.clave ? copiar : null, quitar]),
    link,
  ]);
}

function linkParaVendedora(rifa: Rifa, nombre: string, codigo: string): Node {
  const link = linkVendedora(rifa.id, textoDeClave(rifa.id) ?? "", codigo);
  return crear("div", {}, [
    crear("p", {}, [`Link de ${nombre}. Mándaselo solo a ella: con él puede vender y ver a sus compradores.`]),
    cajaDeLink(link, `Hola ${nombre}, este es tu link para vender números de «${rifa.titulo}» en Rifita. Es solo para ti: ${link}`),
  ]);
}

function seccionMiLink(rifa: Rifa): Node {
  const link = linkOrganizadora(rifa.id, textoDeClave(rifa.id) ?? "");
  return crear("section", {}, [
    crear("h2", {}, ["Tu link de organizadora"]),
    crear("p", { class: "ayuda" }, ["Ábrelo en otro dispositivo para administrar la rifa desde ahí. No lo compartas."]),
    cajaDeLink(link, `Mi link de organizadora de «${rifa.titulo}» en Rifita. No lo compartas: ${link}`),
  ]);
}

// Sorteo ----------------------------------------------------------------------

function seccionSorteo(estado: Estado): Node {
  const { rifa } = estado;
  const contenido = crear("div", {});
  const seccion = crear("section", { class: "sorteo" }, [crear("h2", {}, ["Sorteo"]), contenido]);
  const sorteo = rifa.sorteo;

  if (sorteo?.ganadores) {
    contenido.replaceChildren(resultadoCompleto(estado, sorteo));
  } else if (sorteo) {
    const seguir = crear("button", { type: "button", class: "boton" }, ["Terminar el sorteo"]);
    seguir.addEventListener("click", () => void sortear(estado, sorteo, contenido));
    contenido.replaceChildren(crear("p", {}, ["El sorteo quedó a medias."]), seguir);
  } else if (rifa.pagados.length === 0) {
    contenido.replaceChildren(crear("p", { class: "vacio" }, ["Cuando haya números pagados vas a poder sortear."]));
  } else {
    const boton = crear("button", { type: "button", class: "boton" }, ["Sortear"]);
    boton.addEventListener("click", async () => {
      const texto =
        `Se sortean los ${rifa.pagados.length} números pagados, en el orden de los premios. ` +
        "Después ya no se pueden vender números ni volver a sortear. ¿Sortear ahora?";
      if (!confirm(texto)) return;
      boton.disabled = true;
      try {
        await sortear(estado, await fijarSorteo(rifa.id), contenido);
      } catch (error) {
        boton.disabled = false;
        contenido.append(aviso(`No se pudo sortear: ${mensajeDeError(error)}`, "error"));
      }
    });
    contenido.replaceChildren(
      crear("p", {}, [
        "El resultado sale de drand, una fuente pública de números al azar que nadie conoce de antemano, y cualquiera puede verificarlo.",
      ]),
      boton,
    );
  }
  return seccion;
}

async function sortear(estado: Estado, sorteo: Sorteo, contenido: HTMLElement): Promise<void> {
  const estadoTexto = crear("p", { role: "status" }, []);
  contenido.replaceChildren(estadoTexto);

  const momento = momentoDeRonda(sorteo.ronda).getTime() + 1000;
  while (Date.now() < momento) {
    estadoTexto.textContent = `Esperando el número al azar de drand… ${Math.ceil((momento - Date.now()) / 1000)} s`;
    await new Promise((listo) => setTimeout(listo, 500));
  }

  estadoTexto.textContent = "Trayendo el número al azar…";
  let aleatoriedad: string | null = null;
  for (let intento = 0; intento < 5 && !aleatoriedad; intento++) {
    try {
      aleatoriedad = await traerRonda(sorteo.ronda);
    } catch {
      await new Promise((listo) => setTimeout(listo, 3000));
    }
  }
  if (!aleatoriedad) {
    contenido.replaceChildren(aviso("No pudimos conectar con drand. Recarga la página y aprieta «Terminar el sorteo».", "error"));
    return;
  }

  const ganadores = await calcularGanadores(sorteo.participantes, aleatoriedad, estado.rifa.premios.length);
  const nombres = estado.clave
    ? ganadores.map((n) => abreviar(estado.compradores.get(n)?.nombre ?? ""))
    : null;

  try {
    await publicarSorteo(estado.rifa.id, aleatoriedad, ganadores, nombres);
    estado.volver();
  } catch (error) {
    contenido.replaceChildren(aviso(`No se pudo publicar el resultado: ${mensajeDeError(error)}`, "error"));
  }
}

function resultadoCompleto(estado: Estado, sorteo: Sorteo): Node {
  return crear("div", {}, [
    crear(
      "ol",
      { class: "ganadores" },
      (sorteo.ganadores ?? []).map((numero, i) => {
        const comprador = estado.compradores.get(numero);
        return crear("li", {}, [
          crear("strong", {}, [`Número ${numero}`]),
          estado.rifa.premios[i] ? ` · ${estado.rifa.premios[i]!.descripcion}` : "",
          crear("br", {}),
          comprador ? `${comprador.nombre} · ${comprador.contacto}` : "Abre tu link para ver quién ganó.",
        ]);
      }),
    ),
    crear("p", { class: "ayuda" }, ["En la página pública se ve solo el nombre abreviado, sin contacto."]),
    crear("a", { href: `/${estado.rifa.id}/verificar` }, ["Verificar el sorteo"]),
  ]);
}

// Diálogos --------------------------------------------------------------------

function abrir(dialogo: HTMLDialogElement): void {
  document.body.append(dialogo);
  dialogo.addEventListener("close", () => dialogo.remove());
  dialogo.showModal();
}

function botonCerrar(): HTMLButtonElement {
  const boton = crear("button", { type: "button", class: "secundario" }, ["Cancelar"]);
  boton.addEventListener("click", () => boton.closest("dialog")?.close());
  return boton;
}
