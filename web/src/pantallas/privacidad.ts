import { crear } from "../lib/dom.ts";
import type { Pantalla } from "./contexto.ts";

export const privacidad: Pantalla = () =>
  crear("article", { class: "legal" }, [
    crear("h1", {}, ["Privacidad"]),
    crear("p", {}, [
      "Rifita es una herramienta gratuita y de código abierto para llevar rifas benéficas. No cobra, no muestra publicidad y no maneja dinero: quien compra transfiere directo a quien organiza.",
    ]),

    crear("h2", {}, ["Qué datos guardamos"]),
    crear("ul", {}, [
      crear("li", {}, ["De quienes organizan y venden: el correo de su cuenta de Google, porque es como entran."]),
      crear("li", {}, ["De cada rifa: lo que escribe la organizadora (título, premios, datos de transferencia) y qué números están pagados."]),
      crear("li", {}, [
        "De quienes compran: nombre y contacto, ",
        crear("strong", {}, ["cifrados en el teléfono de quien vende"]),
        ". La clave viaja solo en los links de la organizadora y sus vendedoras, nunca llega a nuestros servidores, y quien administra Rifita no puede leer esos datos.",
      ]),
    ]),

    crear("h2", {}, ["Para qué"]),
    crear("p", {}, ["Solo para llevar la rifa: saber qué números están vendidos y avisar a quien gana. No se venden ni se comparten con nadie."]),

    crear("h2", {}, ["Cuánto tiempo"]),
    crear("ul", {}, [
      crear("li", {}, ["Los datos de quienes compran se borran 3 meses después del término de la rifa."]),
      crear("li", {}, ["La rifa completa se borra un año después de su término."]),
      crear("li", {}, ["Al dar de baja una cuenta se borran en el acto la cuenta y todas sus rifas."]),
    ]),

    crear("h2", {}, ["Lo que se publica"]),
    crear("p", {}, ["La página de cada rifa es pública para quien tenga su link: muestra los números pagados y, después del sorteo, el nombre abreviado de quien ganó (por ejemplo «Pedro S.»), nunca su contacto."]),

    crear("h2", {}, ["Tus derechos"]),
    crear("p", {}, [
      "Puedes pedir que se borren tus datos. Si compraste un número, pídeselo a quien te lo vendió: solo ella puede ver tus datos. Para todo lo demás, escribe a ",
      RIFITA.correoContacto
        ? crear("a", { href: `mailto:${RIFITA.correoContacto}` }, [RIFITA.correoContacto])
        : "quien administra este sitio",
      ".",
    ]),

    crear("h2", {}, ["Quién responde por cada rifa"]),
    crear("p", {}, ["Rifita es solo la herramienta. Cada organizadora responde por su rifa y por cumplir la ley, incluida la Ley 20.851 sobre rifas de organizaciones sin fines de lucro."]),
  ]);
