# 0003 — Los datos de quienes compran se cifran en el navegador

**Estado:** Aceptado · 2026-10-28

## Contexto

Cada número pagado lleva el nombre y el contacto de quien compró: datos
personales de terceros que no tienen cuenta en la app ni la eligieron. La Ley
21.719, vigente desde el 1 de diciembre de 2026, exige cuidarlos. Si el
servidor los guarda en claro, una filtración de la base de datos o un error de
RLS los expone, y quien opera la instalación también puede leerlos.

## Decisión

El nombre y el contacto se cifran en el navegador antes de enviarlos, con una
clave por rifa. La clave viaja en el fragmento `#` del link de la rifa, que los
navegadores nunca envían al servidor. Supabase guarda solo el texto cifrado.

Lo que tiene que ser público o lo necesita el servidor (estado de los números,
fechas, quién marcó) no se cifra. El nombre abreviado de quien gana se
publica al sortear, desde el navegador de la organizadora.

## Consecuencias

- Quien pierde el link con la clave pierde el acceso a esos datos; no hay
  recuperación desde el servidor.
- El servidor no puede buscar ni filtrar por nombre de comprador.
- Invitar vendedoras exige que la clave les llegue sin pasar por el servidor.
  Cómo se hace sigue abierto (ver [especificación](../especificacion.md#preguntas-abiertas)).
- Los correos de las cuentas sí quedan en claro en `auth.users`, porque lo
  exige el login de Google.

## Qué la revertiría

Que repartir la clave resulte tan engorroso que las organizadoras no logren
sumar vendedoras, y que exista otra forma de proteger los datos que la ley
acepte y sea más simple de usar.
