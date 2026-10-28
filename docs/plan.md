# Plan de implementación

Cómo vamos a construir lo que dice la [especificación](especificacion.md). Las
decisiones de fondo están en [`adr/`](adr/); este archivo se actualiza a medida
que avanzan las rebanadas.

## Estructura

```
rifita/
├── web/                      TypeScript sin framework ni bundler (ADR 0001, Stack)
│   ├── index.html
│   ├── src/
│   │   ├── main.ts           arranque: sesión y router
│   │   ├── lib/api.ts        único módulo que usa supabase-js
│   │   ├── lib/cifrado.ts    ECDH P-256 + HKDF + AES-GCM con WebCrypto (ADR 0001, Privacidad)
│   │   ├── lib/claves.ts     guardar claves en el dispositivo, leer y limpiar el `#`
│   │   ├── lib/sorteo.ts     algoritmo determinista, compartido con la verificación
│   │   ├── lib/router.ts     rutas por path con la History API
│   │   ├── lib/dom.ts        `crear(etiqueta, atributos, hijos)`, siempre con `textContent`
│   │   └── pantallas/        portada, panel, crear, rifa, organizar, vender,
│   │                         verificar, legal
│   ├── vendor/supabase.js    supabase-js en un archivo, versión fija
│   ├── tests/                `node:test`
│   └── servir.ts             servidor local con `node:http` y respaldo a index.html
├── supabase/
│   ├── migrations/           0001_esquema.sql, 0002_rls.sql, …
│   ├── functions/            sortear/, dar_de_baja/
│   └── tests/                pgTAP, un archivo por tabla
├── docs/
└── .github/workflows/ci.yml  tsc --noEmit, node --test, supabase test db
```

El sitio carga una sola librería, `supabase-js`; en desarrollo hacen falta
`typescript`, `@supabase/supabase-js` (tipos) y la CLI de Supabase.

## Esquema

| Tabla | Columnas principales | Restricciones |
|---|---|---|
| `rifas` | `id uuid`, `dueno_id → auth.users`, `titulo`, `descripcion`, `cantidad_numeros`, `valor`, `datos_transferencia`, `fecha_termino`, `publica`, `creada_en`, `cerrada_en`, `oculta`, `clave_publica_organizadora` | `cantidad_numeros` entre 1 y el máximo; `fecha_termino ≤ creada_en + 3 meses`; índice único parcial `(dueno_id) where cerrada_en is null` (una rifa abierta por persona) |
| `premios` | `rifa_id`, `orden`, `descripcion` | único `(rifa_id, orden)` |
| `vendedoras` | `id`, `rifa_id`, `hash_correo`, `usuario_id null`, `contacto`, `contacto_publico`, `clave_publica`, `clave_privada_para_organizadora`, `pide_link_en` | único `(rifa_id, hash_correo)` |
| `rangos` | `vendedora_id`, `rifa_id`, `desde`, `hasta` | `exclude using gist` sobre `int4range`: sin solapes dentro de una rifa |
| `ventas` | `rifa_id`, `numero`, `vendedora_id null`, `comprador_cifrado bytea null`, `iv`, `clave_para_organizadora`, `clave_para_vendedora null`, `marcado_por`, `marcado_en`, `corregido_por`, `corregido_en` | PK `(rifa_id, numero)`; un número libre es un número sin fila |
| `sorteos` | `rifa_id`, `participantes int[]`, `ronda_drand`, `aleatoriedad`, `ganadores jsonb`, `hecho_en` | uno por rifa |
| `reportes` | `rifa_id`, `motivo`, `reportado_por`, `creado_en` | — |

- Que un número esté pagado es visible para el servidor y para quien tenga el
  link. Lo único cifrado es el nombre y el contacto de quien compró.
- Cada venta se cifra con una clave al azar, guardada dos veces: cifrada para
  la clave pública de la organizadora (`clave_para_organizadora`) y para la de
  la vendedora del número (`clave_para_vendedora`). `vendedora_id` dice para
  quién se cifró, aunque después cambien los rangos.
- `clave_privada_para_organizadora` es la clave privada de la vendedora,
  cifrada para la organizadora: así ella puede volver a copiar su link.
- `hash_correo` es un HMAC del correo en minúsculas, con una clave guardada en
  Supabase Vault, para que no se pueda adivinar probando correos.
- El nombre abreviado de quien gana lo publica el navegador de la organizadora,
  que es quien puede descifrarlo. El número ganador es verificable; el nombre
  no.

## RLS

- **`rifas`**: la dueña, todo; una vendedora vinculada, lectura. Los visitantes
  anónimos no leen la tabla: un `select` por `id` dejaría listar las privadas.
  Lo hacen por funciones `security definer`: `obtener_rifa(id)` (quien tiene el
  UUID) y `listar_vitrina()` (solo públicas, no ocultas y abiertas).
- **`ventas`**: el estado de cada número se ve por `obtener_rifa`, sin los datos
  cifrados. Los datos cifrados los lee la dueña, y la vendedora solo los de las
  filas con su `vendedora_id`. Una vendedora inserta y borra solo dentro de sus rangos,
  con la rifa abierta y sin sorteo; la dueña, cualquier número. Un trigger
  llena `marcado_por` / `marcado_en` y `corregido_por` / `corregido_en`.
- **`rangos`, `premios`**: solo la dueña escribe.
- **`vendedoras`**: la dueña administra; la vendedora edita solo su contacto y
  `pide_link_en` («Pedirle mi link»). `clave_privada_para_organizadora` la lee
  solo la dueña. `aceptar_invitacion(rifa_id)` compara el HMAC de
  `auth.email()` con `hash_correo` y llena `usuario_id` (ADR 0001, Privacidad).
- **`sorteos`**: lectura pública; escribe solo la Edge Function `sortear`.
- **`reportes`**: inserta quien tiene sesión; nadie lee salvo la administración.

Cada política tiene tests pgTAP que prueban lo que permite y lo que niega, con
cinco roles: anónimo, dueña, vendedora, vendedora fuera de su rango y otra
persona con sesión.

## Tareas de `pg_cron`

Una vez al día:

- cerrar las rifas vencidas (`cerrada_en = now()`);
- a los 3 meses del cierre, poner en `null` los datos cifrados de las ventas
  (`comprador_cifrado`, `iv` y las dos claves);
- al año del cierre, borrar la rifa, en cascada.

El aviso de una semana antes del término es, al principio, un aviso en el
panel. Avisar por correo necesita un proveedor de correo y queda para después.

## Rebanadas, en orden

Cada una termina en algo que se puede usar.

1. **Andamiaje y login.** Entras con Google y ves «Mis rifas» vacío; puedes
   darte de baja. CI y Supabase local funcionando.
2. **Crear rifa.** Se generan las claves de la organizadora y se le obliga a
   guardar su link de organizadora; la página pública `/<uuid>` muestra la
   grilla de números libres.
3. **Marcar pagado**, solo la organizadora: cifrado, aviso de consentimiento y
   corrección. En un dispositivo sin clave, los nombres salen tapados y se
   puede seguir vendiendo.
4. **Vendedoras**: link personal, aceptación, rangos, «Rifas donde vendo»,
   volver a copiar el link, «Pedirle mi link» y contacto opcional.
5. **Sorteo** con drand y la página `/verificar`.
6. **Ciclo de vida**: tareas de `pg_cron` y aviso de término en el panel.
7. **Vitrina pública** y botón de reportar.
8. **Legal**: términos, privacidad, Ley 20.851 y canal para pedir borrado.
   Antes de cualquier lanzamiento público.
9. **Lanzamiento**: Supabase de producción, Cloudflare Pages, dominio y una
   política de seguridad de contenido (CSP) estricta.

## Fuera, a propósito

Correos automáticos, comprobantes, pagos, historial completo de cambios por
número y varias organizadoras en una misma rifa.
