# Desplegar Rifita

Rifita en producción son tres cuentas: un proyecto de **Supabase** (base de
datos y login), un cliente OAuth de **Google** (para entrar) y un proyecto de
**Cloudflare Pages** (el sitio). Todas tienen plan gratuito suficiente.

En esta guía, `<sitio>` es la dirección del sitio (por ejemplo
`mi-rifita.pages.dev`) y `<ref>` es el identificador del proyecto de Supabase
(lo que va antes de `.supabase.co`).

## 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com). Para Chile, la
   región más cercana es São Paulo. Guarda la contraseña de la base de datos.
2. Aplica las migraciones desde este repositorio:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   La migración `0002` activa `pg_cron` y programa la limpieza diaria de datos
   de compradores.
3. En **Authentication → URL Configuration**:
   - *Site URL*: `https://<sitio>`
   - *Redirect URLs*: `https://<sitio>/**`
4. En **Authentication → Sign In / Providers**, desactiva **Email**: en Rifita
   solo se entra con Google.
5. En **Project Settings → API keys**, copia la URL del proyecto y la clave
   *publishable*. Son públicas: van al navegador.

## 2. Google

En [Google Cloud Console](https://console.cloud.google.com), con un proyecto
nuevo:

1. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*,
   nombre «Rifita», un correo de soporte y el dominio `<sitio>`. Los permisos
   son los básicos (`openid`, `email`, `profile`), que no requieren revisión de
   Google. Publica la app («En producción») para que pueda entrar cualquiera y
   no solo las cuentas de prueba.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo
   *Aplicación web*:
   - *Orígenes de JavaScript autorizados*: `https://<sitio>`
   - *URI de redireccionamiento autorizados*:
     `https://<ref>.supabase.co/auth/v1/callback`
3. Copia el ID y el secreto del cliente en Supabase, en **Authentication →
   Sign In / Providers → Google**, y actívalo.

## 3. Cloudflare Pages

1. En Cloudflare, **Workers & Pages → Crear → Pages → Conectar a Git** y elige
   este repositorio.
2. Configuración de build:
   - *Rama de producción*: `main`
   - *Comando de build*: `npm run publicar`
   - *Directorio de salida*: `publicado`
3. Variables de entorno (las mismas de `.env.example`):
   - `SUPABASE_URL`: `https://<ref>.supabase.co`
   - `SUPABASE_CLAVE_PUBLICA`: la clave *publishable*
   - `CORREO_CONTACTO`: el correo que muestra la página de privacidad
4. Guarda y despliega. La versión de Node sale de `.node-version`.

`npm run publicar` deja en `publicado/` solo lo que carga el navegador, más
`_headers` con la CSP. Como no hay `404.html`, Pages devuelve `index.html` en
cualquier otra ruta y la app resuelve `/<rifa>`, `/<rifa>/organizar`, etc.

## 4. Revisar que quedó bien

```bash
curl -sI https://<sitio>/ | grep -i content-security-policy
```

La CSP debe nombrar `https://<ref>.supabase.co` en `connect-src`. Después,
en el sitio: entra con Google, crea una rifa de prueba, marca un número y
bórrala dando de baja la cuenta desde el panel.

## Cosas a tener en cuenta

- Un proyecto gratuito de Supabase se pausa tras una semana sin uso. Mientras
  haya rifas activas no pasa; si se pausa, se reactiva desde el panel.
- Cada migración nueva se aplica con `supabase db push` **antes** de desplegar
  el sitio que la usa.
- Las claves de las rifas no pasan por ninguno de estos servicios: viajan en
  el fragmento `#` de los links, que el navegador no envía al servidor.
