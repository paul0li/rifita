# Especificación

Lo que la app debe hacer, según lo decidido hasta ahora. Cuando algo de esto
cambie de fondo, va con un ADR en [`adr/`](adr/).

## Cuenta

- Login con Google, pidiendo solo el correo.
- La persona puede darse de baja cuando quiera. Al hacerlo, y tras confirmar,
  se borran todas sus rifas.
- El panel tiene dos listas, «Mis rifas» y «Rifas donde vendo», cada una con
  activas y pasadas.

## Rifa

- Cada rifa tiene un UUID v4. Las privadas solo se abren con su link.
- Campos: título, descripción, cantidad de números, valor del número, datos de
  transferencia, fecha de término, pública o privada, y premios en orden.
- Una persona puede tener como dueña **una sola rifa abierta** a la vez.
- Una rifa puede estar abierta **3 meses como máximo**.
- La portada muestra «Crea tu rifa» y la vitrina de rifas públicas.

## Vendedoras

- La organizadora escribe el correo de la vendedora (se guarda solo su hash) y
  le manda, desde su teléfono, un link personal con su clave. El servidor no
  manda correos. La organizadora puede volver a copiar ese link cuando quiera.
- La vendedora entra con Google. Con eso ve su planilla y puede vender desde
  cualquier dispositivo; los nombres de sus compradores los ve en los
  dispositivos donde abrió su link. Si no los ve, la app le dice que abra el
  link que le mandó su organizadora y le ofrece pedírselo.
- Cada vendedora ve solo a sus compradores; la organizadora ve a todos. Ver
  [ADR 0001, Privacidad](adr/0001-decisiones-iniciales.md#privacidad).
- Cada vendedora tiene uno o más rangos de números asignados (1–10, 11–20…),
  que la organizadora puede editar.
- Contacto opcional: un texto libre que se muestra en público solo si ella lo
  activa.

## Números

- Solo dos estados: **libre** y **pagado**.
- Para marcarlo pagado son obligatorios el nombre y el contacto de quien compra
  (un campo de texto libre cada uno).
- Lo marca quien vendió; queda registrado quién y cuándo. La organizadora puede
  corregir cualquier número.
- No se suben comprobantes.

## Sorteo

- Nunca es automático: la organizadora aprieta «Sortear» en la página de la
  rifa, también después de vencida.
- Participan solo los números pagados. Se sortea en el orden de los premios y
  un número no gana dos veces.
- Es verificable: la aleatoriedad sale de una ronda futura de drand, fijada al
  apretar «Sortear», y cualquiera puede recalcular el resultado. Ver
  [ADR 0001, Sorteo](adr/0001-decisiones-iniciales.md#sorteo).
- El sorteo usa solo los números pagados, no los nombres: se puede sortear
  desde cualquier dispositivo con sesión, aunque no tenga la clave.
- El resultado es público, con el nombre abreviado de quien ganó y sin su
  contacto. Ese nombre lo publica el navegador de la organizadora desde un
  dispositivo con su clave; hasta entonces el resultado muestra solo los
  números ganadores y la vendedora de cada uno.

## Ciclo de vida

1. **Abierta**, hasta 3 meses. Una semana antes del término se avisa a la
   organizadora.
2. **Cerrada** al vencer: ya no se pueden marcar números, pero sí sortear.
3. **3 meses después del cierre** se borran los nombres y contactos de quienes
   compraron.
4. **1 año después del cierre** se borra la rifa.

Los borrados los corre `pg_cron`.

## Privacidad

Pensada para la Ley 21.719 de protección de datos personales, vigente desde el
1 de diciembre de 2026.

- Los datos de quienes compran se cifran en el navegador, para la organizadora
  y para la vendedora de ese número. Las claves viajan en el fragmento `#` de
  links personales y quedan en los dispositivos; nunca llegan al servidor, así
  que ni Supabase ni quien administra Rifita pueden leerlos, tampoco entrando a
  una cuenta. Ver [ADR 0001, Privacidad](adr/0001-decisiones-iniciales.md#privacidad).
- El link de la rifa (`rifita.cl/<uuid>`) es público y se comparte libremente;
  no lleva clave.
- Al crear la rifa, la organizadora tiene que guardar su link de organizadora:
  si lo pierde junto con sus dispositivos, los nombres ya no se pueden leer.
- Los correos de las cuentas quedan en texto plano en `auth.users`: es
  inevitable con el login de Google, y se dice en la política de privacidad.
- RLS estricto y con tests.
- Política de privacidad, un canal para pedir el borrado de datos, y un aviso
  de consentimiento al registrar a quien compra.

## Legal

- La app es una herramienta; quien organiza responde por cumplir la ley. Así lo
  dicen los términos de uso.
- Página informativa sobre la Ley 20.851 (rifas de organizaciones sin fines de
  lucro).
- Botón para reportar una rifa en la vitrina pública.
- Pendiente: que una clínica jurídica revise los términos.

## Preguntas abiertas

1. Máximo de números por rifa. Propuesta: 1000, para que la grilla funcione
   bien en un teléfono.

Resueltas: cómo llega la clave a las vendedoras, también después de creada la
rifa ([ADR 0001, Privacidad](adr/0001-decisiones-iniciales.md#privacidad)), y el framework del
frontend ([ADR 0001, Stack](adr/0001-decisiones-iniciales.md#stack)).
