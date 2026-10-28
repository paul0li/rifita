# AGENTS.md

Guía para cualquiera, persona o agente, que trabaje en este repositorio.

## El proyecto

Rifita es una web gratuita y de código abierto para llevar rifas benéficas como
un talonario digital. La organizadora crea la rifa, invita a quienes venden,
cada vendedora marca los números que le pagaron y, al final, la organizadora
aprieta «Sortear» y el resultado queda publicado de forma verificable.

No es un negocio: sin comisiones, sin publicidad y **sin manejar pagos**. Quien
compra transfiere directo a la organizadora; la app solo anota qué número está
libre y cuál está pagado.

Los nombres y contactos de quienes compran se cifran en el navegador. La clave
viaja en el fragmento `#` del link y nunca llega al servidor.

Más en [`README.md`](README.md) y en la [especificación](docs/especificacion.md).

## Dónde está escrito cada cosa

- [`README.md`](README.md): qué hace la app y para quién.
- [`docs/especificacion.md`](docs/especificacion.md): el comportamiento
  esperado, decidido hasta ahora, y las preguntas que siguen abiertas.
- [`docs/adr/`](docs/adr/): registros de decisiones de arquitectura (ADR), una
  decisión por archivo. Léelos antes de cambiar cómo funciona algo.
  - [0001 — Una herramienta sin fines de lucro que no toca el dinero](docs/adr/0001-sin-fines-de-lucro-sin-pagos.md)
  - [0002 — Licencia AGPL-3.0](docs/adr/0002-licencia-agpl.md)
  - [0003 — Los datos de quienes compran se cifran en el navegador](docs/adr/0003-cifrado-en-el-navegador.md)
  - [0004 — El sorteo lo hace la organizadora y es verificable](docs/adr/0004-sorteo-manual-verificable.md)
  - [0005 — Supabase como backend](docs/adr/0005-supabase.md)
- `CLAUDE.local.md` / `AGENTS.local.md` (fuera de git, pueden no existir): datos
  de una instalación en particular. Léelos si existen; nunca los subas.

## Cómo trabajamos

### Este repositorio es público

En los archivos versionados, los commits, los nombres de rama y los PR no va
nada personal: ni nombres de personas u organizaciones reales, correos, claves,
URLs o IDs de proyectos de Supabase, nombres de máquinas, rutas de carpetas
personales ni detalles de otros repositorios privados. Las instrucciones y los
ejemplos se escriben de forma genérica («la organizadora», `example.supabase.co`).

Lo que es propio de una instalación va en:

- variables de entorno, documentadas con valores de ejemplo en `.env.example`
  y puestas en el `.env`, que no se versiona;
- `CLAUDE.local.md` o `AGENTS.local.md`, para notas que necesiten los agentes.

Ningún dato real de rifas, compradores o usuarios entra al repositorio, tampoco
como fixture. Antes de hacer commit, revisa el diff buscando cualquier cosa que
identifique a una persona.

### Idioma

**Todo** el repositorio está en **español de Chile, neutro**: código,
identificadores, comentarios, documentación, ADR, mensajes de commit, nombres
de rama y PR. Las únicas palabras en inglés son las que impone una herramienta
(palabras clave del lenguaje, APIs de librerías, nombres de archivo que exige un
framework, los tipos de Conventional Commits).

```ts
// bien
function marcarPagado(numero: Numero, comprador: DatosComprador) { … }
// mal
function markAsPaid(ticket: Ticket, buyer: BuyerData) { … }
```

En la base de datos, tablas y columnas también van en español y en
`snake_case`: `rifas`, `numeros`, `vendedoras`, `fecha_termino`.

### Ramas

Nunca se hace commit directo a `main`. Las ramas se llaman
`<tipo>/<descripcion-corta-en-kebab>`, con los mismos tipos de los commits:

```
feat/crear-rifa
fix/rango-de-numeros-solapado
docs/adr-reparto-de-la-clave
chore/actualizar-dependencias
```

### Commits

[Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), con el
resumen en español:

```
<tipo>(<ámbito opcional>): <resumen en imperativo, minúscula, sin punto>

<cuerpo opcional: el porqué, no el qué>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`,
`chore`, `revert`. Un cambio incompatible agrega `!` después del tipo y un pie
`BREAKING CHANGE:`. El resumen, de menos de ~72 caracteres.

```
feat(sorteo): publicar el hash de la semilla antes de sortear
fix(rls): impedir que una vendedora marque números fuera de su rango
```

### Pull requests

Título en forma de Conventional Commit, en español. El cuerpo dice qué cambió,
por qué y cómo se verificó (el comando que se corrió o lo que se miró).

### Decisiones (ADR)

- Un archivo por decisión en `docs/adr/`, llamado `NNNN-titulo-en-kebab.md`,
  numerado en orden. Copia la forma de uno existente: **Estado**, **Contexto**,
  **Decisión**, **Consecuencias**, **Qué la revertiría**.
- Escribe un ADR nuevo cuando una elección define cómo funciona el producto o el
  código y alguien podría razonablemente haber elegido otra cosa.
- No se reescribe la historia. Cuando una decisión deja de valer, se escribe un
  ADR nuevo y el antiguo se marca `Reemplazado por NNNN`.
- Sin reglas de producto numeradas ni ids de criterios. Los tests se nombran
  por el comportamiento que prueban, y cambian cuando cambia lo que se quiere.

### Privacidad y seguridad

La app guarda datos personales de terceros (quienes compran), así que esto no
es opcional:

- El servidor nunca recibe en claro el nombre ni el contacto de quien compra.
  Si un cambio necesita que los vea, es un ADR nuevo, no un atajo.
- Toda tabla expuesta tiene RLS activado y políticas explícitas. Cada política
  tiene un test que prueba lo que permite **y** lo que niega.
- El esquema de la base de datos son las migraciones numeradas de
  `supabase/migrations/`, aplicadas en orden. Nunca se edita una que ya se
  aplicó; se agrega la siguiente.
- Los plazos de borrado (datos de compradores a los 3 meses del cierre, la rifa
  al año) son comportamiento del producto y tienen tests.

### Rebanadas

Cada trabajo termina en algo que la persona usuaria pueda ver o usar, no en una
capa técnica. Antes de empezar, di qué se va a ver después, cómo se muestra que
funciona y qué queda fuera a propósito.
