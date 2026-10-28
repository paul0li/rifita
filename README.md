# Rifita

Talonario digital, gratuito y de código abierto, para rifas benéficas.

Rifita ayuda a organizar una rifa sin planillas ni talonarios de papel: creas la
rifa, invitas a quienes te ayudan a vender, cada una marca los números que le
pagaron y, cuando termina, sorteas desde la página con un resultado que
cualquiera puede verificar.

> **Estado:** en diseño. Todavía no hay código; el comportamiento acordado está
> en la [especificación](docs/especificacion.md).

## Qué hace

- **Rifas públicas o privadas.** Las públicas aparecen en la vitrina de la
  portada; las privadas solo se abren con su link.
- **Vendedoras con rangos de números.** La organizadora invita por correo y le
  asigna a cada una un rango (1–10, 11–20…), que puede cambiar después.
- **Dos estados por número:** libre o pagado. Al marcarlo pagado se anota quién
  compró y cómo contactarla, y queda registrado quién lo marcó y cuándo.
- **Sorteo verificable.** Nunca es automático: la organizadora aprieta
  «Sortear». Participan solo los números pagados, en el orden de los premios y
  sin repetir ganador.
- **Datos de compradores cifrados en tu navegador.** El servidor no puede
  leerlos, y se borran solos tres meses después del cierre.

## Qué no hace

- **No maneja dinero.** Quien compra transfiere directo a la organizadora.
- No cobra comisiones ni muestra publicidad.
- No valida comprobantes de pago.
- No se hace cargo de que la rifa cumpla la ley: eso le corresponde a quien la
  organiza. Habrá una página informativa sobre la Ley 20.851.

## Cómo está hecha

Con la menor cantidad de librerías posible: Supabase (login con Google,
Postgres con RLS y `pg_cron`) y un frontend en TypeScript sin framework ni
bundler, cuya única librería es `supabase-js`, servido como sitio estático. Así
cualquiera puede leer el código que corre en su navegador. Las razones están en
[`docs/adr/`](docs/adr/).

## Contribuir

Todo el proyecto, incluido el código, está en español. Antes de proponer un
cambio lee [`AGENTS.md`](AGENTS.md): explica cómo nombrar ramas, commits y PR, y
cómo se registran las decisiones.

## Licencia

[AGPL-3.0](LICENSE). Puedes usarla, modificarla y servirla; si sirves una versión
modificada, tienes que publicar su código con la misma licencia.
