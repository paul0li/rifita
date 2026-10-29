// Lo que cargan los <script> clásicos de index.html antes que la app.

declare global {
  /** supabase-js, desde web/vendor/supabase.js. */
  const supabase: typeof import("@supabase/supabase-js");

  /** Escrito por scripts/configurar.ts en web/configuracion.js. */
  const RIFITA: {
    readonly supabaseUrl: string;
    readonly supabaseClave: string;
    /** Correo para pedir el borrado de datos; puede venir vacío. */
    readonly correoContacto: string;
  };
}

export {};
