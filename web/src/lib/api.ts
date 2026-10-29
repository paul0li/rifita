// El único módulo que habla con Supabase.

export type Usuaria = { id: string; correo: string };

export type Premio = { orden: number; descripcion: string };

export type Sorteo = {
  participantes: number[];
  ronda: number;
  aleatoriedad: string | null;
  ganadores: number[] | null;
  nombres_ganadores: string[] | null;
};

/** Lo que ve cualquiera con el link de la rifa. */
export type Rifa = {
  id: string;
  titulo: string;
  descripcion: string;
  cantidad_numeros: number;
  valor: number;
  datos_transferencia: string;
  fecha_termino: string;
  abierta: boolean;
  premios: Premio[];
  pagados: number[];
  sorteo: Sorteo | null;
  soy_duena: boolean;
  mi_vendedora: string | null;
};

export type ResumenRifa = { id: string; titulo: string; fecha_termino: string; dueno_id: string };

export type Venta = {
  numero: number;
  vendedora_id: string | null;
  comprador_cifrado: string | null;
  marcado_en: string;
};

export type Vendedora = {
  id: string;
  nombre: string;
  codigo_cifrado: string;
  aceptada_en: string | null;
};

export type NuevaRifa = {
  titulo: string;
  descripcion: string;
  cantidad_numeros: number;
  valor: number;
  datos_transferencia: string;
  fecha_termino: string;
};

const cliente = supabase.createClient(RIFITA.supabaseUrl, RIFITA.supabaseClave, {
  auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
});

/** Al volver de Google, la app abre `destino` (por defecto, el panel). */
export async function entrarConGoogle(destino = "/panel"): Promise<void> {
  const { error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}${destino}` },
  });
  if (error) throw error;
}

export async function usuariaActual(): Promise<Usuaria | null> {
  const { data, error } = await cliente.auth.getSession();
  if (error) throw error;
  const usuario = data.session?.user;
  return usuario ? { id: usuario.id, correo: usuario.email ?? "" } : null;
}

export function alCambiarSesion(alCambiar: () => void): void {
  cliente.auth.onAuthStateChange((evento) => {
    // Refrescar el token no cambia quién está adentro.
    if (evento !== "TOKEN_REFRESHED") alCambiar();
  });
}

export async function salir(): Promise<void> {
  const { error } = await cliente.auth.signOut();
  if (error) throw error;
}

/** Borra la cuenta y, en cascada, todas sus rifas. */
export async function darDeBaja(): Promise<void> {
  const { error } = await cliente.rpc("dar_de_baja");
  if (error) throw error;
  // La cuenta ya no existe en el servidor: basta con olvidar la sesión aquí.
  await cliente.auth.signOut({ scope: "local" });
}

// Rifas ---------------------------------------------------------------------

export async function obtenerRifa(id: string): Promise<Rifa | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await cliente.rpc("obtener_rifa", { p_id: id });
  if (error) throw error;
  return (data as Rifa | null) ?? null;
}

/** Las rifas propias y aquellas donde vende, de la más nueva a la más antigua. */
export async function misRifas(): Promise<ResumenRifa[]> {
  const { data, error } = await cliente
    .from("rifas")
    .select("id, titulo, fecha_termino, dueno_id")
    .order("creada_en", { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearRifa(rifa: NuevaRifa, premios: string[]): Promise<string> {
  const { data, error } = await cliente.from("rifas").insert(rifa).select("id").single();
  if (error) throw error;
  const filas = premios.map((descripcion, i) => ({ rifa_id: data.id, orden: i + 1, descripcion }));
  if (filas.length > 0) {
    const { error: errorPremios } = await cliente.from("premios").insert(filas);
    if (errorPremios) throw errorPremios;
  }
  return data.id;
}

// Ventas --------------------------------------------------------------------

/** Las ventas que esta persona puede ver: todas si es la dueña, o las suyas. */
export async function ventas(rifa: string): Promise<Venta[]> {
  const { data, error } = await cliente
    .from("ventas")
    .select("numero, vendedora_id, comprador_cifrado, marcado_en")
    .eq("rifa_id", rifa)
    .order("numero");
  if (error) throw error;
  return data;
}

export async function vender(
  rifa: string,
  numero: number,
  vendedora: string | null,
  compradorCifrado: string,
): Promise<void> {
  const { error } = await cliente.from("ventas").insert({
    rifa_id: rifa,
    numero,
    vendedora_id: vendedora,
    comprador_cifrado: compradorCifrado,
  });
  if (error) throw error;
}

export async function liberar(rifa: string, numero: number): Promise<void> {
  const { data, error } = await cliente
    .from("ventas")
    .delete()
    .eq("rifa_id", rifa)
    .eq("numero", numero)
    .select("numero");
  if (error) throw error;
  if (data.length === 0) throw new Error("No puedes liberar este número");
}

// Vendedoras ----------------------------------------------------------------

export async function vendedoras(rifa: string): Promise<Vendedora[]> {
  const { data, error } = await cliente
    .from("vendedoras")
    .select("id, nombre, codigo_cifrado, aceptada_en")
    .eq("rifa_id", rifa)
    .order("creada_en");
  if (error) throw error;
  return data;
}

export async function invitar(
  rifa: string,
  nombre: string,
  codigoHash: string,
  codigoCifrado: string,
): Promise<Vendedora> {
  const { data, error } = await cliente
    .from("vendedoras")
    .insert({ rifa_id: rifa, nombre, codigo_hash: codigoHash, codigo_cifrado: codigoCifrado })
    .select("id, nombre, codigo_cifrado, aceptada_en")
    .single();
  if (error) throw error;
  return data as Vendedora;
}

export async function quitarVendedora(id: string): Promise<void> {
  const { error } = await cliente.from("vendedoras").delete().eq("id", id);
  if (error) throw error;
}

export async function aceptarInvitacion(rifa: string, codigo: string): Promise<string> {
  const { data, error } = await cliente.rpc("aceptar_invitacion", { p_rifa: rifa, p_codigo: codigo });
  if (error) throw error;
  return data as string;
}

// Sorteo --------------------------------------------------------------------

export async function fijarSorteo(rifa: string): Promise<Sorteo> {
  const { data, error } = await cliente.rpc("fijar_sorteo", { p_rifa: rifa });
  if (error) throw error;
  return data as Sorteo;
}

export async function publicarSorteo(
  rifa: string,
  aleatoriedad: string,
  ganadores: number[],
  nombres: string[] | null,
): Promise<void> {
  const { error } = await cliente.rpc("publicar_sorteo", {
    p_rifa: rifa,
    p_aleatoriedad: aleatoriedad,
    p_ganadores: ganadores,
    p_nombres: nombres,
  });
  if (error) throw error;
}

/** El mensaje que vino del servidor, para mostrarlo tal cual. */
export function mensajeDeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error);
}
