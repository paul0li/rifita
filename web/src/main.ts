import { alCambiarSesion, usuariaActual, type Usuaria } from "./lib/api.ts";
import { escucharNavegacion } from "./lib/navegacion.ts";
import { buscar } from "./lib/rutas.ts";
import type { Pantalla } from "./pantallas/contexto.ts";
import { crearRifaPantalla } from "./pantallas/crear.ts";
import { organizar, venderPantalla } from "./pantallas/gestion.ts";
import { noEncontrada } from "./pantallas/no-encontrada.ts";
import { panel } from "./pantallas/panel.ts";
import { portada } from "./pantallas/portada.ts";
import { privacidad } from "./pantallas/privacidad.ts";
import { rifaPublica } from "./pantallas/rifa.ts";
import { verificar } from "./pantallas/verificar.ts";

const rutas: { patron: string; valor: Pantalla }[] = [
  { patron: "/", valor: portada },
  { patron: "/panel", valor: panel },
  { patron: "/crear", valor: crearRifaPantalla },
  { patron: "/privacidad", valor: privacidad },
  { patron: "/:id/organizar", valor: organizar },
  { patron: "/:id/vender", valor: venderPantalla },
  { patron: "/:id/verificar", valor: verificar },
  // Al final: cualquier otra ruta de un tramo es una rifa.
  { patron: "/:id", valor: rifaPublica },
];

const raiz = document.getElementById("app")!;
let usuaria: Usuaria | null = null;

function pintar(): void {
  const encontrada = buscar(rutas, location.pathname);
  const pantalla = encontrada?.valor ?? noEncontrada;
  raiz.replaceChildren(pantalla({ usuaria, parametros: encontrada?.parametros ?? {} }));
}

async function actualizarSesion(): Promise<void> {
  const antes = usuaria?.id;
  usuaria = await usuariaActual();
  // supabase-js avisa también al volver a la pestaña: repintar solo si cambió
  // quién está adentro, para no borrar un formulario a medio llenar.
  if (usuaria?.id !== antes) pintar();
}

usuaria = await usuariaActual();
// Al volver de Google, supabase-js ya canjeó el ?code= por la sesión.
if (new URLSearchParams(location.search).has("code")) {
  history.replaceState(null, "", location.pathname);
}
escucharNavegacion(pintar);
pintar();
alCambiarSesion(() => void actualizarSesion());
