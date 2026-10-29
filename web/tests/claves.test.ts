import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leerFragmento } from "../src/lib/claves.ts";

describe("leerFragmento", () => {
  it("lee la clave del link de organizadora", () => {
    assert.deepEqual(leerFragmento("#k=abc_-123"), { clave: "abc_-123" });
  });

  it("lee la clave y la invitación del link de vendedora", () => {
    assert.deepEqual(leerFragmento("#k=abc&i=xyz"), { clave: "abc", invitacion: "xyz" });
  });

  it("sin fragmento no hay nada", () => {
    assert.deepEqual(leerFragmento(""), {});
  });
});
