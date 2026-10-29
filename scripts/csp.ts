// Cabeceras de seguridad que manda la app, las mismas en local (web/servir.ts)
// y en Cloudflare Pages (_headers, escrito por scripts/publicar.ts).

/** Servidores de drand de donde el navegador trae el número del sorteo. */
const drand = ["https://api.drand.sh", "https://drand.cloudflare.com"];

export function cabecerasDeSeguridad(supabaseUrl: string): Record<string, string> {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' ${supabaseUrl} ${drand.join(" ")}`,
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
