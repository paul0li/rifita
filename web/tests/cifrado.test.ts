import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cifrar,
  codigoAlAzar,
  descifrar,
  exportarClave,
  generarClave,
  importarClave,
  sha256Hex,
} from "../src/lib/cifrado.ts";

describe("cifrado de compradores", () => {
  const pedro = { nombre: "Pedro Soto", contacto: "+56 9 1234 5678" };

  it("descifra lo que cifró", async () => {
    const clave = await generarClave();
    assert.deepEqual(await descifrar(clave, await cifrar(clave, pedro)), pedro);
  });

  it("la clave exportada para el link vuelve a servir", async () => {
    const clave = await generarClave();
    const texto = await exportarClave(clave);
    assert.match(texto, /^[A-Za-z0-9_-]{43}$/);
    const cifrado = await cifrar(clave, pedro);
    assert.deepEqual(await descifrar(await importarClave(texto), cifrado), pedro);
  });

  it("no descifra con otra clave", async () => {
    const cifrado = await cifrar(await generarClave(), pedro);
    await assert.rejects(descifrar(await generarClave(), cifrado));
  });

  it("dos cifrados del mismo comprador no se parecen", async () => {
    const clave = await generarClave();
    assert.notEqual(await cifrar(clave, pedro), await cifrar(clave, pedro));
  });

  it("el texto cifrado no contiene el nombre", async () => {
    const cifrado = await cifrar(await generarClave(), pedro);
    assert.ok(!cifrado.includes("Pedro"));
  });
});

describe("invitaciones", () => {
  it("cada código es distinto y cabe en un link", () => {
    const a = codigoAlAzar();
    assert.match(a, /^[A-Za-z0-9_-]{24}$/);
    assert.notEqual(a, codigoAlAzar());
  });

  it("el hash coincide con el que calcula Postgres", async () => {
    // encode(extensions.digest('codigo-de-juana', 'sha256'), 'hex') en Postgres.
    assert.equal(
      await sha256Hex("codigo-de-juana"),
      "d403cd32e7945b11fa9d9bd599622dea05c1b544e280806bc1b3c80a7aadabdb",
    );
  });
});
