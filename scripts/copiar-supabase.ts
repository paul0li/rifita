// Copia supabase-js, en su versión de un solo archivo, a web/vendor/. Se corre
// después de cambiar su versión en package.json, y el resultado se revisa en
// el PR como cualquier otro cambio.
//
//   npm install && npm run copiar-supabase

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "..");
const paquete = join(raiz, "node_modules", "@supabase", "supabase-js");
const { version } = JSON.parse(await readFile(join(paquete, "package.json"), "utf8"));

await mkdir(join(raiz, "web", "vendor"), { recursive: true });
await copyFile(join(paquete, "dist", "umd", "supabase.js"), join(raiz, "web", "vendor", "supabase.js"));
console.log(`supabase-js ${version} copiado a web/vendor/supabase.js`);
