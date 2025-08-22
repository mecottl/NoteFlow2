# NoteFlow

Sistema de notas por usuario con **Node.js + Express**, **Supabase** y **JWT**.  
Frontend en HTML + CSS personalizado, servido por Express, con JS vanilla para consumir la API.

---

## Índice

1. [Arquitectura & Estructura de carpetas](#arquitectura--estructura-de-carpetas)  
2. [Instalación & arranque](#instalación--arranque)  
3. [Variables de entorno](#variables-de-entorno)  
4. [Modelo de datos (Supabase)](#modelo-de-datos-supabase)  
5. [Rutas de la API](#rutas-de-la-api)  
6. [Flujos principales](#flujos-principales)  
7. [Relaciones entre archivos](#relaciones-entre-archivos)  
8. [Notas de seguridad y RLS](#notas-de-seguridad-y-rls)  
9. [Problemas comunes](#problemas-comunes)  
10. [Roadmap breve](#roadmap-breve)

---

## Arquitectura & Estructura de carpetas

```bash
noteflow/
├─ package.json
├─ .env                      # variables de entorno (no subir a git)
├─ index.js                  # entrypoint del servidor (levanta app.js)
├─ app.js                    # configuración de Express (rutas, estáticos, montaje de /api)
└─ src/
   ├─ lib/
   │  └─ supabase.js         # cliente Supabase (Service Role) para CRUD seguro
   ├─ middleware/
   │  └─ auth.js             # middleware JWT (valida y rellena req.user)
   ├─ routes/
   │  ├─ users.js            # /api/register, /api/login, /api/username-availability
   │  └─ notes.js            # /api/notes CRUD (protegidas con authenticate)
   ├─ schemas/
   │  └─ users.js            # Zod: validateRegister, validateLogin
   └─ public/
      ├─ pages/
      │  ├─ index.html       # landing
      │  ├─ login.html       # login (email o username)
      │  ├─ register.html    # registro (email, password, username)
      │  ├─ notes.html       # listado de notas del usuario
      │  └─ note.html        # editor de nota (crear/editar)
      └─ js/
         ├─ login.js         # flujo de login; guarda token
         ├─ register.js      # registro + debounce de disponibilidad de username
         ├─ notes.js         # carga notas y “Hola, {username}” (decodifica JWT)
         └─ note.js          # editor neural con IA y borradores locales
      └─ css/
         ├─ global.css
         ├─ notes.css
         ├─ note.css
         └─ 404.css
      └─ images/
         └─ icon.svg, bg.svg, icons/
```

---

## Instalación & arranque

```bash
pnpm install
cp .env.example .env   # si tienes un ejemplo
pnpm run dev           # nodemon index.js
# server running on http://localhost:1234
```

---

## Variables de entorno

```env
PORT=1234
JWT_SECRET=pon_un_secreto_largo_y_aleatorio
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Modelo de datos (Supabase)

- Tabla `users`: id, email, username, password_hash, created_at
- Tabla `notes`: id, user_id, title, text, created_at, updated_at

---

## Rutas de la API

- `POST /api/register`  
- `POST /api/login`  
- `GET /api/username-availability?u=...`  
- `GET /api/notes`  
- `GET /api/notes/:id`  
- `POST /api/notes`  
- `PUT /api/notes/:id`  
- `DELETE /api/notes/:id`  

---

## Flujos principales

- **Registro:** Valida datos, chequea disponibilidad, crea usuario y autologin.
- **Login:** Email o username, devuelve JWT.
- **CRUD de notas:** Listar, crear, editar, eliminar notas protegidas por JWT.
- **Editor neural:** Sugerencias IA, borradores locales, sincronización visual.

---

## Relaciones entre archivos

- `index.js` → `app.js` → routers de `src/routes/`
- `app.js` sirve estáticos y páginas HTML desde `public/pages/`
- JS de frontend (`public/js/`) consume API y manipula DOM
- Rutas protegidas usan `middleware/auth.js`
- Validaciones con Zod en `schemas/users.js`
- Supabase client en `lib/supabase.js`

---

## Notas de seguridad y RLS

- JWT firmado con secreto fuerte.
- Service Role Key solo en backend.
- RLS en Supabase para proteger datos por usuario.

---

## Problemas comunes

- Error de autenticación: revisar JWT y variables de entorno.
- Problemas de CORS: revisar configuración en `app.js`.
- Errores de conexión a Supabase: revisar claves y URL.

---

## Roadmap breve

- Mejorar UI/UX en mobile.
- Añadir historial de versiones de notas.
- Integrar IA más avanzada.
- Tests automáticos para rutas y frontend.
- Mejorar manejo de errores y feedback visual.
