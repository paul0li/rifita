// Arma la carpeta publicado/ que sirve Cloudflare Pages: solo lo que carga el
// navegador, más _headers con la CSP. Corre después de `npm run compilar`.
//
// Sin 404.html en la raíz, Pages sirve index.html para cualquier ruta que no
// sea un archivo, que es lo que necesitan las rutas de la app.

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cabecerasDeSeguridad } from "./csp.ts";

const raiz = join(import.meta.dirname, "..");
const web = join(raiz, "web");
const salida = join(raiz, "publicado");

try {
  process.loadEnvFile(join(raiz, ".env"));
} catch {
  // Sin .env se usan las variables del entorno.
}

await rm(salida, { recursive: true, force: true });
await mkdir(salida);
for (const archivo of ["index.html", "estilos.css", "configuracion.js", "vendor", "dist"]) {
  await cp(join(web, archivo), join(salida, archivo), { recursive: true });
}

const cabeceras = cabecerasDeSeguridad(process.env.SUPABASE_URL ?? "");
await writeFile(
  join(salida, "_headers"),
  `/*\n${Object.entries(cabeceras)
    .map(([nombre, valor]) => `  ${nombre}: ${valor}`)
    .join("\n")}\n`,
);
console.log("Listo: publicado/");
