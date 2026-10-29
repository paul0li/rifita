// El único módulo que habla con Supabase.

export type Usuaria = { id: string; correo: string };

const cliente = supabase.createClient(RIFITA.supabaseUrl, RIFITA.supabaseClave, {
  auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
});

export async function entrarConGoogle(): Promise<void> {
  const { error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/panel` },
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
  cliente.auth.onAuthStateChange(() => alCambiar());
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
