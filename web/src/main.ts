import { alCambiarSesion, usuariaActual, type Usuaria } from "./lib/api.ts";
import { escucharNavegacion } from "./lib/navegacion.ts";
import { buscar } from "./lib/rutas.ts";
import type { Pantalla } from "./pantallas/contexto.ts";
import { noEncontrada } from "./pantallas/no-encontrada.ts";
import { panel } from "./pantallas/panel.ts";
import { portada } from "./pantallas/portada.ts";

const rutas: { patron: string; valor: Pantalla }[] = [
  { patron: "/", valor: portada },
  { patron: "/panel", valor: panel },
];

const raiz = document.getElementById("app")!;
let usuaria: Usuaria | null = null;

function pintar(): void {
  const encontrada = buscar(rutas, location.pathname);
  const pantalla = encontrada?.valor ?? noEncontrada;
  raiz.replaceChildren(pantalla({ usuaria, parametros: encontrada?.parametros ?? {} }));
}

async function actualizarSesion(): Promise<void> {
  usuaria = await usuariaActual();
  // Al volver de Google, supabase-js ya canjeó el ?code= por la sesión.
  if (new URLSearchParams(location.search).has("code")) {
    history.replaceState(null, "", location.pathname);
  }
  pintar();
}

escucharNavegacion(pintar);
alCambiarSesion(() => void actualizarSesion());
await actualizarSesion();
