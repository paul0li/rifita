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

- La organizadora las invita por correo. Del correo se guarda solo su hash.
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
- Es verificable: se publica el hash de la semilla antes de sortear, o se usa
  una fuente externa de aleatoriedad pública (por ejemplo drand). Ver
  [ADR 0004](adr/0004-sorteo-manual-verificable.md).
- El resultado es público, con el nombre abreviado de quien ganó y sin su
  contacto.

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

- Los datos de quienes compran se cifran en el navegador. La clave va en el
  fragmento `#` del link y nunca llega al servidor, así que Supabase no puede
  leerlos. Ver [ADR 0003](adr/0003-cifrado-en-el-navegador.md).
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

1. ¿Cómo le llega la clave de cifrado a una vendedora si la invitación sale
   desde el servidor? Opciones: el link lo comparte a mano la organizadora, o
   el navegador arma un `mailto:` con el link completo.
2. ¿Cómo se comparte la clave con vendedoras invitadas después de creada la
   rifa?
3. Framework del frontend.
