import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buscar, coincidir } from "../src/lib/rutas.ts";

describe("coincidir", () => {
  it("reconoce la portada", () => {
    assert.deepEqual(coincidir("/", "/"), {});
  });

  it("ignora la barra final", () => {
    assert.deepEqual(coincidir("/panel", "/panel/"), {});
  });

  it("saca los parámetros de la ruta", () => {
    assert.deepEqual(coincidir("/:id/vender", "/abc-123/vender"), { id: "abc-123" });
  });

  it("no coincide si cambia un tramo fijo", () => {
    assert.equal(coincidir("/:id/vender", "/abc/organizar"), null);
  });

  it("no coincide si sobran o faltan tramos", () => {
    assert.equal(coincidir("/:id", "/abc/vender"), null);
    assert.equal(coincidir("/:id/vender", "/abc"), null);
  });
});

describe("buscar", () => {
  const rutas = [
    { patron: "/panel", valor: "panel" },
    { patron: "/:id", valor: "rifa" },
  ];

  it("prefiere la primera ruta que coincide", () => {
    assert.equal(buscar(rutas, "/panel")?.valor, "panel");
  });

  it("cae en la ruta con parámetro si ninguna fija coincide", () => {
    assert.deepEqual(buscar(rutas, "/abc"), { valor: "rifa", parametros: { id: "abc" } });
  });

  it("devuelve null si nada coincide", () => {
    assert.equal(buscar(rutas, "/abc/def"), null);
  });
});
