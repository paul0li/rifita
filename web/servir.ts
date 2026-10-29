// Servidor local para desarrollar. Devuelve index.html para las rutas de la
// app, como Cloudflare Pages, y manda la misma CSP que producción.
//
//   npm run servir

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const raiz = import.meta.dirname;
const puerto = Number(process.env.PUERTO ?? 5180);

try {
  process.loadEnvFile(join(raiz, "..", ".env"));
} catch {
  // Sin .env se usan las variables del entorno.
}
const supabaseUrl = process.env.SUPABASE_URL ?? "";

const tipos: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Solo se sirve lo que está en estas carpetas o es uno de estos archivos.
const permitidos = ["/dist/", "/vendor/", "/estilos.css", "/configuracion.js"];

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  `connect-src 'self' ${supabaseUrl}`,
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
].join("; ");

createServer(async (pedido, respuesta) => {
  const ruta = normalize(new URL(pedido.url ?? "/", "http://local").pathname);
  const esArchivo = permitidos.some((p) => (p.endsWith("/") ? ruta.startsWith(p) : ruta === p));
  const archivo = esArchivo ? join(raiz, ruta) : join(raiz, "index.html");

  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      "Content-Type": tipos[extname(archivo)] ?? "application/octet-stream",
      "Content-Security-Policy": csp,
      "Cache-Control": "no-store",
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    respuesta.end("No encontrado");
  }
}).listen(puerto, "127.0.0.1", () => {
  console.log(`Rifita en http://127.0.0.1:${puerto}`);
});
