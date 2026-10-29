// Cifrado de los datos de quienes compran, con WebCrypto. La clave de la rifa
// se genera en el navegador de la organizadora y nunca llega al servidor (ver
// ADR 0001, Privacidad).

export type Comprador = { nombre: string; contacto: string };

const ALGORITMO = { name: "AES-GCM", length: 256 } as const;

export function generarClave(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(ALGORITMO, true, ["encrypt", "decrypt"]);
}

export async function exportarClave(clave: CryptoKey): Promise<string> {
  return aBase64url(new Uint8Array(await crypto.subtle.exportKey("raw", clave)));
}

export function importarClave(texto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", deBase64url(texto), ALGORITMO, true, ["encrypt", "decrypt"]);
}

export function cifrar(clave: CryptoKey, comprador: Comprador): Promise<string> {
  return cifrarTexto(clave, JSON.stringify(comprador));
}

export async function descifrar(clave: CryptoKey, cifrado: string): Promise<Comprador> {
  const { nombre, contacto } = JSON.parse(await descifrarTexto(clave, cifrado));
  return { nombre: String(nombre), contacto: String(contacto) };
}

/** Devuelve el iv y el texto cifrado juntos, en base64url. */
export async function cifrarTexto(clave: CryptoKey, texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = new TextEncoder().encode(texto);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, datos));
  const juntos = new Uint8Array(iv.length + cifrado.length);
  juntos.set(iv);
  juntos.set(cifrado, iv.length);
  return aBase64url(juntos);
}

export async function descifrarTexto(clave: CryptoKey, cifrado: string): Promise<string> {
  const juntos = deBase64url(cifrado);
  const datos = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: juntos.slice(0, 12) },
    clave,
    juntos.slice(12),
  );
  return new TextDecoder().decode(datos);
}

/** Un código al azar para una invitación. */
export function codigoAlAzar(): string {
  return aBase64url(crypto.getRandomValues(new Uint8Array(18)));
}

export async function sha256Hex(texto: string): Promise<string> {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function aBase64url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
