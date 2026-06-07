<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d4835054-2f13-4ee1-b9c9-c928a5ca6189

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Enlaces De Un Solo Uso

- En modo administrador, usa el boton `Generar Link de 1 Uso`.
- Ese enlace se envia al cliente.
- Cuando el cliente completa su giro, el token queda marcado como `used`.
- Si intenta abrir de nuevo el mismo enlace (incluso con atras/recargar), el sistema lo bloquea.

## Produccion (Servidor Real)

Para publicar con API incluida (tokens de un solo uso):

1. Compila la app:
   `npm run build`
2. Inicia servidor Express:
   `npm run start`

Tambien puedes hacer ambos pasos con:
`npm run prod`

### Desplegar en Render

Este proyecto ya incluye [render.yaml](render.yaml) para desplegar como web service.

1. Sube el repo a GitHub.
2. Crea un Web Service en Render o usa el blueprint del `render.yaml`.
3. Configura estas variables en Render:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` o `ADMIN_PASSWORD`
- `ADMIN_SESSION_TTL_HOURS`
- `ADMIN_COOKIE_SECURE=auto`
- `SUPABASE_URL` si vas a usar Supabase
- `SUPABASE_SERVICE_ROLE_KEY` si vas a usar Supabase
- `SUPABASE_TABLE=one_time_links`
- `LINK_TTL_HOURS=24`

4. Build command: `npm install && npm run build`
5. Start command: `npm run start`

Render usará el backend Express de `server.js` y servirá el frontend compilado desde `dist/`.

### Desplegar en Vercel

Este repo ya incluye [vercel.json](vercel.json) para desplegar la app completa (frontend + API).

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel.
3. En Settings > Environment Variables configura:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` o `ADMIN_PASSWORD`
- `ADMIN_SESSION_TTL_HOURS`
- `ADMIN_COOKIE_SECURE=auto`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE=one_time_links`
- `LINK_TTL_HOURS=24`

4. Deploy.

Notas importantes para links de un uso en Vercel:

- Para que funcionen de forma confiable entre multiples equipos, usa Supabase.
- No dependas de almacenamiento local (`.data`) en serverless para estados de links.
- El backend calcula automaticamente la URL base usando el host recibido, por lo que los links generados usarán el dominio publico de Vercel.

### Activar Supabase para enlaces de un uso

Si quieres que los links funcionen entre varias maquinas/instancias:

1. Crea esta tabla en Supabase (SQL Editor):

```sql
create table if not exists public.one_time_links (
   token text primary key,
   status text not null check (status in ('active', 'used', 'expired')),
   created_at timestamptz not null,
   expires_at timestamptz not null,
   used_at timestamptz,
   result_text text,
   participant_name text
);
```

2. Configura variables en tu entorno de despliegue:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE` (opcional, por defecto `one_time_links`)
- `LINK_TTL_HOURS` (opcional, por defecto `24`)

3. Inicia con:

`npm run prod`

Si no configuras estas variables, el sistema usa almacenamiento local en `.data/one-time-links.json`.

### Proteger panel administrador (recomendado)

Ahora el acceso admin se valida en el servidor (ya no en el frontend). Configura en tu `.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH` (recomendado en produccion)
- `ADMIN_SESSION_TTL_HOURS` (opcional, por defecto `8`)
- `ADMIN_COOKIE_SECURE` (`auto` recomendado; usa `false` en local HTTP si hace falta)

Cuando el admin inicia sesión, el servidor crea una cookie `HttpOnly` con expiración.

Si defines `ADMIN_PASSWORD_HASH`, el servidor lo usa en prioridad y deja de usar `ADMIN_PASSWORD`.

Comando rapido para generar hash en PowerShell (reemplaza `TuClaveSegura`):

```powershell
node -e "const { randomBytes, scryptSync } = require('crypto'); const pass='TuClaveSegura'; const salt=randomBytes(16).toString('hex'); const hash=scryptSync(pass, Buffer.from(salt,'hex'), 64).toString('hex'); console.log(`scrypt$${salt}$${hash}`);"
```

Atajo recomendado dentro del proyecto:

`npm run admin:hash`

### Endpoints admin útiles

- `POST /api/admin/login` -> autentica admin y crea sesión.
- `GET /api/admin/session` -> valida si la sesión admin sigue activa.
- `POST /api/admin/logout` -> cierra la sesión admin.
- `GET /api/one-time-links?limit=20` -> lista últimos links con estado (`active`, `used`, `expired`).
- `GET /api/one-time-links/:token/status` -> estado puntual del link.
