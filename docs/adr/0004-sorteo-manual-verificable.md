# 0004 — El sorteo lo hace la organizadora y es verificable

**Estado:** Aceptado · 2026-10-28

## Contexto

La confianza en una rifa depende de que nadie pueda arreglar el resultado, ni
la organizadora ni quien opera la app. Un sorteo automático a la hora de
término le quita a la organizadora el momento de sortear frente a su gente, y
falla si a esa hora faltan números por marcar.

## Decisión

El sorteo nunca es automático. La organizadora aprieta «Sortear» en la página
de la rifa, cuando quiera, también después de vencida.

Participan solo los números pagados, en el orden de los premios, sin repetir
ganador. El resultado tiene que poder reproducirlo cualquiera: o se publica el
hash de la semilla antes de sortear y la semilla después, o la semilla viene de
una fuente pública de aleatoriedad (por ejemplo una ronda futura de drand)
fijada de antemano. Cuál de las dos se usa se decide al implementar el sorteo,
en un ADR propio.

## Consecuencias

La lista de números participantes queda congelada y publicada al sortear, junto
con la semilla y el algoritmo, para que se pueda verificar. El resultado
público muestra el nombre abreviado de quien gana, sin su contacto.

## Qué la revertiría

Que las organizadoras pidan de forma consistente un sorteo programado, y que se
pueda hacer igual de verificable.
