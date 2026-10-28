// Escribe web/configuracion.js con la URL y la clave pública de Supabase, que
// la app lee como RIFITA. Lee .env si existe; si no, las variables del entorno
// (así se usa en el build de Cloudflare Pages).

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "..");

try {
  process.loadEnvFile(join(raiz, ".env"));
} catch {
  // Sin .env se usan las variables del entorno.
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseClave = process.env.SUPABASE_CLAVE_PUBLICA;
if (!supabaseUrl || !supabaseClave) {
  console.error("Faltan SUPABASE_URL o SUPABASE_CLAVE_PUBLICA (ver .env.example).");
  process.exit(1);
}

const configuracion = { supabaseUrl, supabaseClave };
await writeFile(
  join(raiz, "web", "configuracion.js"),
  `// Generado por scripts/configurar.ts. No editar.\nconst RIFITA = Object.freeze(${JSON.stringify(configuracion)});\n`,
);
