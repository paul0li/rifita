# 0002 — Licencia AGPL-3.0

**Estado:** Aceptado · 2026-10-28

## Contexto

El proyecto quiere seguir siendo gratuito para quien organiza una rifa. Con
una licencia permisiva (MIT, Apache), cualquiera podría tomar el código, armar
una versión cerrada con comisiones y servirla sin devolver nada. Como la app se
usa por la web, la GPL no alcanza: servirla no cuenta como distribuirla.

## Decisión

El código se publica con la GNU Affero General Public License v3.0. Quien sirva
una versión modificada tiene que ofrecer su código fuente a quienes la usen,
con la misma licencia.

## Consecuencias

Las contribuciones quedan bajo AGPL-3.0. Algunas empresas evitan usar o
contribuir a código AGPL; para este proyecto eso es aceptable. Las dependencias
tienen que ser compatibles con la AGPL.

## Qué la revertiría

Que una organización sin fines de lucro necesite integrar Rifita en un sistema
propio donde la AGPL no se pueda cumplir, y que eso pese más que el riesgo de
una versión cerrada.
