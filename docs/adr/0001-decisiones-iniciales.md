# 0001 — Decisiones iniciales

**Estado:** Aceptado · 2026-10-28

Las decisiones con las que arranca el proyecto, tomadas el mismo día y
agrupadas en un solo registro. Cada tema cuenta su contexto, lo que se sopesó,
la decisión, sus consecuencias y qué la revertiría.

- [Producto](#producto): una herramienta sin fines de lucro que no toca el dinero.
- [Licencia](#licencia): AGPL-3.0.
- [Privacidad](#privacidad): cada vendedora tiene su clave, y la clave vive en sus dispositivos.
- [Sorteo](#sorteo): lo hace la organizadora, con una ronda futura de drand.
- [Stack](#stack): la menor cantidad de librerías posible.

## Producto

### Contexto

Las rifas benéficas se llevan hoy en talonarios de papel o planillas
compartidas: se pierden números, dos personas venden el mismo, y el sorteo no
lo puede verificar nadie. Las plataformas que existen cobran comisión o
intermedian el pago, lo que para una rifa chica de un colegio o una junta de
vecinos es caro y obliga a confiar la plata a un tercero.

### Lo que se sopesó

1. **Cobrar una comisión o integrar una pasarela de pago.** Cubriría costos y
   evitaría marcar pagos a mano, pero obliga a manejar dinero ajeno y a cobrarle
   a causas benéficas. Descartado.
2. **Gratuita, sin tocar el dinero**: quien compra transfiere directo a la
   organizadora y la app solo anota qué número está pagado. **Elegido.**

### Decisión

Rifita es gratuita, de código abierto y sin fines de lucro: sin comisiones y
sin publicidad. Se acepta, a lo más, un botón discreto de donaciones
voluntarias para cubrir costos.

La app **no gestiona pagos**. Quien compra transfiere directo a la
organizadora con los datos de transferencia que ella publica, y la app solo
registra que el número está pagado. No hay comprobantes.

### Consecuencias

No hay pasarela de pago, ni conciliación, ni datos bancarios de quien compra.
Marcar un número como pagado es un acto de confianza de quien vende, y por eso
queda registrado quién lo marcó y cuándo, y la organizadora puede corregirlo.
La responsabilidad legal de la rifa es de quien la organiza.

### Qué la revertiría

Que las organizadoras no puedan usarla sin un cobro integrado, por ejemplo
porque los errores al marcar a mano superen lo que ahorra la app.

## Licencia

### Contexto

El proyecto quiere seguir siendo gratuito para quien organiza una rifa. Con
una licencia permisiva (MIT, Apache), cualquiera podría tomar el código, armar
una versión cerrada con comisiones y servirla sin devolver nada. Como la app se
usa por la web, la GPL no alcanza: servirla no cuenta como distribuirla.

### Lo que se sopesó

1. **MIT o Apache**: permiten versiones cerradas de pago. Descartadas.
2. **GPL-3.0**: no obliga a publicar el código de una versión que solo se sirve
   por la web. Descartada.
3. **AGPL-3.0**: obliga a publicar el código también al servirla. **Elegida.**

### Decisión

El código se publica con la GNU Affero General Public License v3.0. Quien sirva
una versión modificada tiene que ofrecer su código fuente a quienes la usen,
con la misma licencia.

### Consecuencias

Las contribuciones quedan bajo AGPL-3.0. Algunas empresas evitan usar o
contribuir a código AGPL; para este proyecto eso es aceptable. Las dependencias
tienen que ser compatibles con la AGPL.

### Qué la revertiría

Que una organización sin fines de lucro necesite integrar Rifita en un sistema
propio donde la AGPL no se pueda cumplir, y que eso pese más que el riesgo de
una versión cerrada.

## Privacidad

### Contexto

Cada número pagado lleva el nombre y el contacto de quien compró: datos
personales de terceros que no tienen cuenta en la app ni la eligieron. La Ley
21.719, vigente desde el 1 de diciembre de 2026, exige cuidarlos.

Lo que se quiere:

- La organizadora ve a todos los compradores de su rifa; cada vendedora, solo a
  los suyos.
- **Quien administra Rifita no puede leer nombres ni contactos aunque
  quisiera**: ni mirando la base de datos ni entrando a la cuenta de alguien.
  Así nadie puede pensar que la app existe para juntar datos.
- El link de la rifa (`rifita.cl/<uuid>`) se comparte con cualquiera, para que
  copien los datos de transferencia y vean los números.
- Tiene que funcionar en cualquier teléfono con navegador, también en los más
  antiguos.

### Lo que se sopesó

1. **Guardar los datos en claro, protegidos solo con RLS.** Lo más simple, pero
   quien administra Supabase se salta RLS y los lee. Descartado.
2. **Derivar la clave del login con Google.** El token de Google, y el JWT de
   Supabase, los recibe el servidor: cualquier clave derivada de ellos el
   servidor también puede derivarla. Además vencen cada hora. Con Google solo se
   puede hacer control de acceso, no cifrado. Descartado como clave; se usa
   como identidad.
3. **Una sola clave por rifa en el link de la rifa** (`/<uuid>#k=…`). Deja fuera
   al servidor, pero el link de la rifa tiene que ser público, y cualquiera que
   lo recibiera podría leer los datos; además cada vendedora leería a los
   compradores de las demás. Descartado.
4. **Passkeys con la extensión PRF.** Muy seguras y sin links, pero exigen
   teléfonos y navegadores recientes (iOS 18, Chrome moderno), y perder la
   passkey es perder el acceso. Dejan fuera a parte de la gente. Descartado por
   accesibilidad.
5. **Una password elegida por cada persona.** Sirve en cualquier dispositivo,
   pero la clave cifrada con la password quedaría en el servidor, y quien lo
   administre podría adivinar las débiles («1234», cumpleaños). Además se olvida
   entre una rifa y otra, y no puede haber «olvidé mi password». Descartado.
6. **Una clave por vendedora, en un link personal, guardada en sus
   dispositivos.** Deja fuera al servidor, funciona en cualquier navegador y no
   hay nada que memorizar: el link queda en el WhatsApp de cada una. **Elegido.**

### Decisión

#### Identidad y clave son cosas distintas

- **Google** dice quién eres. Con eso basta para ver la planilla, saber qué
  números están pagados, anotar ventas nuevas y sortear, desde cualquier
  dispositivo.
- **La clave** permite leer nombres y contactos. Viaja en el fragmento `#` de un
  link personal y queda guardada en el dispositivo donde se abre. El servidor
  nunca la recibe.

#### Las claves

WebCrypto con ECDH P-256 (disponible en teléfonos más antiguos que X25519),
HKDF y AES-GCM.

- Al crear la rifa, el navegador de la organizadora genera su par de claves. La
  pública se guarda en el servidor; la privada, solo en su dispositivo y en su
  **link de organizadora**.
- Al invitar a una vendedora, el navegador de la organizadora genera un par para
  ella. La pública se guarda en el servidor; la privada va en el **link de la
  vendedora**, y además se guarda cifrada para la organizadora, que así puede
  volver a copiar ese link cuando haga falta.
- Cada venta se cifra con una clave al azar, y esa clave se cifra para dos
  públicas: la de la organizadora y la de la vendedora a quien pertenece el
  número. Para anotar una venta bastan las claves públicas; por eso se puede
  vender desde cualquier dispositivo con sesión.

#### Los links

| Link | Quién lo tiene | Para qué |
|---|---|---|
| `/<uuid>` | Cualquiera | Ver la rifa, copiar los datos de transferencia, ver el sorteo |
| `/<uuid>/organizar#k=…` | Solo la organizadora | Leer todo en un dispositivo nuevo |
| `/<uuid>/vender#k=…` | Cada vendedora el suyo | Leer a sus compradores en un dispositivo nuevo |

- Al abrir un link con clave, el navegador la guarda y la borra de la barra de
  direcciones. El botón «Compartir rifa» siempre entrega `/<uuid>`.
- El servidor no envía links con clave. Los manda la organizadora desde su
  teléfono, por WhatsApp o desde su propio correo; la app le prepara el mensaje.
- Al crear la rifa, la app obliga a guardar el link de organizadora (un paso de
  «Ya lo guardé») y explica que es lo único que no se puede recuperar.
- Desde un dispositivo que ya tiene la clave se puede volver a ver el propio
  link. La organizadora puede volver a copiar el de cualquier vendedora.
- En un dispositivo sin clave, los nombres aparecen tapados con el aviso «Abre
  el link que te mandó tu organizadora». La vendedora tiene un botón «Pedirle mi
  link», que deja un aviso en el panel de la organizadora.

#### Vínculo de la vendedora

La organizadora escribe el correo de la vendedora; el servidor guarda solo su
HMAC, con una clave en Supabase Vault, para que no se pueda adivinar probando
correos. Al entrar con Google, `aceptar_invitacion(rifa_id)` compara el HMAC de
su correo y la vincula. Las políticas RLS entregan los datos cifrados de una
venta solo a la organizadora y a la vendedora para quien se cifró.

#### Lo demás

- Los correos de las cuentas quedan en claro en `auth.users`, porque lo exige el
  login de Google; la política de privacidad lo dice.
- Al registrar a quien compra se muestra un aviso de consentimiento. Hay
  política de privacidad y un canal para pedir el borrado.
- Los datos cifrados se borran 3 meses después del cierre.

### Consecuencias

- Quien administra Rifita ve rifas, números pagados, quién marcó cada uno,
  correos de las cuentas y texto cifrado. No ve nombres ni contactos, tampoco
  entrando a la cuenta de alguien, porque las claves no están en el servidor.
- Si la organizadora pierde su link y todos sus dispositivos, los nombres ya no
  se pueden leer. Los números pagados y el sorteo siguen funcionando.
- Si una vendedora deja de serlo, pierde el acceso al texto cifrado por RLS, y
  las ventas nuevas ya no se cifran para ella.
- Quien controle el servidor podría cambiar una clave pública por una propia
  para leer las ventas **futuras**. Los dispositivos con clave privada comprueban
  que su clave pública en el servidor coincida, y la organizadora comprueba las
  de sus vendedoras; si algo no cuadra, la app avisa y no cifra.
- Quien controle el JavaScript que se sirve puede leer los datos ya descifrados
  en el navegador. Se acota con una CSP estricta, sin scripts de terceros, con
  `main` protegido y dependencias fijadas (ver [Stack](#stack)). La promesa honesta es:
  «con el código publicado en este repositorio, nadie que administre Rifita
  puede leer estos datos».
- Pantallazos y reenvíos quedan fuera de lo que la app puede impedir.

### Qué la revertiría

Que abrir el link en cada dispositivo nuevo resulte demasiado engorroso. La
primera alternativa es un código de palabras generado por la app (por ejemplo
`pera-nube-lago-tren-sol`), opcional junto al link, para abrir los nombres en
dispositivos sin WhatsApp. Las passkeys vuelven a ser una opción si la mayoría
de los teléfonos llega a soportar PRF.

## Sorteo

### Contexto

La confianza en una rifa depende de que nadie pueda arreglar el resultado: ni
la organizadora ni quien administra la app. Además, sortear frente a su gente
es parte de la rifa para quien la organiza.

### Lo que se sopesó

1. **Sorteo automático a la hora de término.** Le quita a la organizadora el
   momento de sortear, y falla si a esa hora faltan números por marcar.
   Descartado.
2. **Semilla propia, publicando su hash antes de sortear.** Verificable, pero
   quien elige la semilla la conoce de antemano y, mientras la rifa esté
   abierta, puede marcar o desmarcar números hasta que el resultado le
   convenga. Descartado.
3. **Una ronda futura de [drand](https://drand.love)**, una red pública que
   publica un número aleatorio firmado cada pocos segundos, que nadie conoce
   antes de su ronda. **Elegido.**

### Decisión

El sorteo nunca es automático. La organizadora aprieta «Sortear» en la página de
la rifa, cuando quiera, también después de vencida, desde cualquier dispositivo
con sesión: el sorteo usa los números pagados, no los nombres.

Al apretar «Sortear»:

1. se congela y publica la lista de números pagados (`participantes`);
2. se fija una ronda de drand unos 30 segundos en el futuro;
3. la Edge Function `sortear` espera esa ronda, verifica su firma y calcula los
   ganadores con un algoritmo determinista publicado en
   `web/src/lib/sorteo.ts`: en orden de premios, cada ganador sale de un SHA-256
   de la aleatoriedad y el número de premio, sobre los participantes que quedan.
   Un número no gana dos veces.

La página `/<uuid>/verificar` vuelve a traer la ronda de drand y recalcula el
resultado en el navegador de cualquiera.

El resultado público muestra cada número ganador y su vendedora. El nombre
abreviado de quien ganó («Pedro S.»), sin contacto, lo publica el navegador de
la organizadora desde un dispositivo con su clave (ver [Privacidad](#privacidad)). El número es
verificable; el nombre no.

### Consecuencias

El sorteo depende de que drand esté disponible; si no lo está, se reintenta con
una ronda nueva, sin cambiar los participantes. La cadena de drand y su clave
pública quedan fijadas en el código. El algoritmo, una vez en uso, no se cambia
sin versionarlo, para que los sorteos pasados se sigan pudiendo verificar.

### Qué la revertiría

Que drand deje de funcionar o de ser confiable, que haga falta sortear sin
conexión, o que las organizadoras pidan de forma consistente un sorteo
programado que se pueda hacer igual de verificable.

## Stack

### Contexto

El proyecto no tiene presupuesto y lo mantiene poca gente. Necesita login con
Google, una base de datos con permisos por fila, tareas programadas para avisos
y borrados, y un hosting que no cueste. El cifrado y el sorteo corren en el
navegador (ver [Privacidad](#privacidad) y [Sorteo](#sorteo)), así que el frontend puede ser estático.

Toda la privacidad descansa en el código que corre en el navegador: quien
controle ese JavaScript puede leer los datos ya descifrados. Por eso importa
que el código servido tenga pocas dependencias, que se pueda auditar y que sea
fácil comparar lo que corre en el sitio con lo que está en el repositorio.

La app es chica: unas ocho pantallas, formularios y una grilla de números.

### Lo que se sopesó

- **Backend propio** (Python o Node en un servidor): más control, pero hay que
  mantenerlo, pagarlo y asegurarlo. Supabase da Auth, Postgres con RLS y
  `pg_cron` en un plan gratuito.
- **SvelteKit**: liviano, con rutas y formularios incluidos, pero poco conocido
  y con su propia cadena de build.
- **React con Vite y React Router**: lo más conocido para contribuir y escapa el
  texto por defecto, pero suma decenas de paquetes al código servido para una
  app de este tamaño.
- **TypeScript sin framework**: casi sin dependencias y fácil de auditar. Cuesta
  actualizar la pantalla a mano y obliga a cuidar el XSS nosotros. **Elegido.**
- **Vite como bundler**: cómodo (recarga al guardar, juntar paquetes,
  minificar), pero nada de eso hace falta aquí, y agrega su propio árbol de
  dependencias al build. **Descartado**: basta `tsc`.
- **vitest**: instala Vite por debajo. `node:test` viene con Node, que ya corre
  TypeScript y trae WebCrypto. **Descartado** a favor de `node:test`.
- **Hablar con Supabase directo por `fetch`**, sin `supabase-js`: el sitio no
  cargaría ninguna librería, pero habría que escribir y mantener el login PKCE,
  el refresco y el cierre de sesión, que es código delicado. **Descartado**:
  `supabase-js` es la única librería que vale la pena cargar.
- **ESLint y Prettier**: útiles, pero son decenas de paquetes. `tsc` en modo
  estricto ya atrapa la mayoría de los errores. **Descartados** por ahora.
- **GitHub Pages**: gratuito, pero no devuelve la app para rutas que no son
  archivos sin trucos con el `404.html`, y las rutas por path son necesarias
  porque el fragmento `#` lleva la clave. **Cloudflare Pages** lo resuelve y
  también es gratuito.

### Decisión

#### Backend

**Supabase**: Auth con Google (solo el correo), Postgres con Row Level Security
como única capa de permisos, `pg_cron` para avisos y borrados del ciclo de vida,
una Edge Function para el sorteo. La baja de cuenta es una función de
Postgres (`dar_de_baja`), que borra la cuenta y, en cascada, sus rifas.

#### Frontend

- **TypeScript estricto, compilado con `tsc`, sin bundler.** `tsc` solo quita
  los tipos: el JavaScript servido se lee igual que el fuente. Los imports se
  escriben con `.ts` y `tsc` los cambia a `.js`, así los mismos archivos corren
  en el navegador y en Node para los tests.
- **Sin framework.** Un router propio sobre la History API, con rutas por path
  (`/<uuid>`, `/<uuid>/vender`…), para dejar libre el fragmento `#`.
- **Cada pantalla** es un módulo con una función que recibe el estado y lo
  pinta. Los nodos se crean con un helper `crear(etiqueta, atributos, hijos)`
  que pone el texto siempre con `textContent`.
- **Nunca `innerHTML`** (ni `outerHTML`, `insertAdjacentHTML` o
  `document.write`) con datos. La CSP exige Trusted Types, así que el navegador
  bloquea cualquier uso que se escape.
- **Una sola librería en el código servido: `supabase-js`.** Se usa su versión
  de un solo archivo (`dist/umd/supabase.js`), copiada a `web/vendor/` con la
  versión fija y servida desde el propio dominio. El paquete queda como
  dependencia de desarrollo solo para sus tipos y para copiar ese archivo.
  Actualizarla es un PR que se revisa. Solo `web/src/lib/api.ts` la usa.
- **Tests con `node:test`**, para el cifrado, el sorteo, el router y las
  validaciones. Playwright solo si más adelante hacen falta recorridos
  completos.
- Un servidor local de unas pocas líneas con `node:http`, que devuelve
  `index.html` para las rutas de la app.

#### Hosting

**Cloudflare Pages**, con respaldo a `index.html` para las rutas de la app y
deploys solo desde `main`. El caché se invalida con `?v=<commit>` en los
scripts. El sitio se publica con una CSP estricta: scripts solo del propio
dominio, conexiones solo a Supabase y a drand, `require-trusted-types-for
'script'`, y sin scripts de terceros.

### Consecuencias

- El código que corre en el sitio se puede comparar, archivo por archivo, con
  el del repositorio.
- El sitio carga una sola librería, `supabase-js`. Las dependencias de
  desarrollo se reducen a `typescript`, `@supabase/supabase-js` (tipos) y la
  CLI de Supabase. Agregar una dependencia es una decisión que se justifica en
  el PR.
- Hay más código propio: router, helper de DOM y repintado de pantallas. Las
  convenciones para escribirlo están en `AGENTS.md`, para que todas las
  pantallas se escriban igual.
- Sin recarga automática al programar; se recarga a mano.
- La seguridad de los datos depende de que las políticas RLS estén bien: cada
  una tiene tests que prueban lo que permite y lo que niega. El esquema vive en
  migraciones numeradas en `supabase/migrations/`.
- El plan gratuito de Supabase impone límites de tamaño y pausa proyectos
  inactivos.
- Las cuentas de GitHub, Supabase y Cloudflare van con segundo factor. Los
  cambios a `main` entran solo por PR revisado, porque cada uno llega directo a
  producción.

### Qué la revertiría

Que repintar a mano se vuelva la fuente principal de errores a medida que la
app crece; entonces conviene una librería chica de vistas antes que un
framework completo. Que los planes gratuitos dejen de alcanzar o cambien de
condiciones, o que la lógica necesaria no quepa en RLS y funciones de Postgres.
