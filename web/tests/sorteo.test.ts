import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { abreviar, calcularGanadores, momentoDeRonda } from "../src/lib/sorteo.ts";

const aleatoriedad = "a".repeat(64);

describe("calcularGanadores", () => {
  it("con la misma aleatoriedad sale siempre lo mismo", async () => {
    const participantes = [3, 14, 15, 92, 65];
    assert.deepEqual(
      await calcularGanadores(participantes, aleatoriedad, 3),
      await calcularGanadores(participantes, aleatoriedad, 3),
    );
  });

  it("no depende del orden en que llegan los participantes", async () => {
    assert.deepEqual(
      await calcularGanadores([1, 2, 3, 4, 5], aleatoriedad, 2),
      await calcularGanadores([5, 3, 1, 4, 2], aleatoriedad, 2),
    );
  });

  it("un número no gana dos veces", async () => {
    const ganadores = await calcularGanadores([1, 2, 3], aleatoriedad, 3);
    assert.equal(new Set(ganadores).size, 3);
    assert.deepEqual([...ganadores].sort(), [1, 2, 3]);
  });

  it("si hay más premios que números pagados, gana cada número una vez", async () => {
    assert.equal((await calcularGanadores([7, 8], aleatoriedad, 5)).length, 2);
  });

  it("otra aleatoriedad da otro resultado", async () => {
    const participantes = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.notDeepEqual(
      await calcularGanadores(participantes, aleatoriedad, 3),
      await calcularGanadores(participantes, "b".repeat(64), 3),
    );
  });

  it("calza con un resultado conocido", async () => {
    // Fija el algoritmo: si este test cambia, los sorteos pasados dejan de
    // verificarse. El resultado se calculó aparte, con hashlib de Python.
    const participantes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.deepEqual(await calcularGanadores(participantes, aleatoriedad, 3), [8, 6, 9]);
  });
});

describe("momentoDeRonda", () => {
  it("la primera ronda es la génesis de quicknet", () => {
    assert.equal(momentoDeRonda(1).toISOString(), "2023-08-23T15:09:27.000Z");
  });

  it("cada ronda dura 3 segundos", () => {
    assert.equal(momentoDeRonda(11).getTime() - momentoDeRonda(1).getTime(), 30_000);
  });
});

describe("abreviar", () => {
  it("deja el primer nombre y la inicial del segundo", () => {
    assert.equal(abreviar("Pedro Soto Díaz"), "Pedro S.");
  });

  it("deja igual un nombre de una palabra", () => {
    assert.equal(abreviar("Pedro"), "Pedro");
  });

  it("ignora espacios de más", () => {
    assert.equal(abreviar("  ana   maría "), "ana M.");
  });
});
