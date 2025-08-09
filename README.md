Aquí tienes tu README listo como archivo `.md`:

[📄 Descargar README.md](sandbox:/README.md)

````markdown
# Noteflow

Sistema de notas por usuario con **Node.js + Express**, **Supabase** y **JWT**.  
Frontend en HTML + Tailwind, servido por Express, con JS vanilla para consumir la API.

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
├─ pnpm-lock.yaml
├─ .env                      # variables de entorno (no subir a git)
├─ index.js                  # entrypoint del servidor (levanta app.js)
├─ app.js                 # configuración de Express (rutas, estáticos, montaje de /api)
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
         └─ notes.js         # carga notas y “Hola, {username}” (decodifica JWT)
````

### ¿Para qué sirve cada archivo y con cuál se relaciona?

* **index.js**
  Arranca el servidor: `import app from './src/app.js'` y hace `app.listen(...)`.
  ➜ Relación: **src/app.js**.

* **app.js**
  Configura Express (`cors`, `express.json`, deshabilita `x-powered-by`).
  Sirve páginas estáticas: `/`, `/login`, `/register`, `/notes`, `/note`.
  Monta API bajo `/api`: `app.use('/api', usersRouter)` y `app.use('/api', notesRouter)`.
  (Opcional) sirve estáticos con `express.static` desde `src/public`.
  ➜ Relación: **routes/users.js**, **routes/notes.js**, **public/pages**, **public/js**.

* **src/lib/supabase.js**
  Crea el cliente **supabaseAdmin** con `SUPABASE_SERVICE_ROLE_KEY`.
  Se importa desde rutas para operar con DB sin chocar con RLS.
  ➜ Relación: **routes/users.js**, **routes/notes.js**.

* **src/middleware/auth.js**
  Lee `Authorization: Bearer <JWT>`, valida con `JWT_SECRET`, añade `req.user = { id, email, username }`.
  ➜ Relación: **routes/notes.js** (todas las rutas protegidas), opcional en **routes/users.js** si agregas endpoints privados.

* **src/routes/users.js**

  * `POST /api/register`: valida con Zod, chequea email/username, hashea password, inserta, devuelve **JWT** (autologin).
  * `POST /api/login`: acepta **email o username** en el campo `email`, devuelve **JWT**.
  * `GET /api/username-availability?u=...`: UX para registro (disponibilidad en tiempo real).
    ➜ Relación: **schemas/users.js**, **lib/supabase.js**, **middleware/auth.js** (si añades endpoints privados).

* **src/routes/notes.js**
  CRUD de notas protegido con `authenticate`.

  * `GET /api/notes`, `GET /api/notes/:id`
  * `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`
    ➜ Relación: **middleware/auth.js**, **lib/supabase.js**.

* **src/schemas/users.js**
  `validateRegister` (email, password fuerte, username) y `validateLogin`.
  Se usa en **routes/users.js** para validar inputs.
  ➜ Relación: **routes/users.js**.

* **src/public/pages/**
  HTMLs servidos por Express en rutas “públicas”:

  * `index.html` landing
  * `login.html` formulario de login
  * `register.html` formulario de registro con `<input name="username" ... pattern=...>`
  * `notes.html` listado de notas + botón “Nueva nota”
  * `note.html` editor de nota (crear/editar; envía `title` y `text`)
    ➜ Relación: **public/js/** correspondientes y **routes** vía fetch.

* **src/public/js/**

  * `login.js`: envía credenciales, guarda token en `localStorage`.
  * `register.js`: valida/normaliza `username`, **debounce** a `/api/username-availability`, registra y (si autologin) guarda token y redirige.
  * `notes.js`: decodifica **JWT**, muestra saludo `Hola, {username}`, consulta `/api/notes` y pinta tarjetas.
    ➜ Relación: **routes/users.js**, **routes/notes.js**.

---

## Instalación & arranque

```bash
# 1) Instala dependencias
pnpm install

# 2) Crea .env (ver sección Variables de entorno)
cp .env.example .env   # si tienes un ejemplo

# 3) Desarrollo
pnpm run dev           # nodemon index.js
# server running on http://localhost:1234
```

---

## Variables de entorno

`.env` (ejemplo):

```env
PORT=1234
JWT_SECRET=pon_un_secreto_largo_y_aleatorio
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Modelo de datos (Supabase)

*(Sección con definiciones SQL para users y notes)*

---

## Rutas de la API

*(Listado completo con ejemplos de request/response)*

---

## Flujos principales

*(Explicación paso a paso de Registro, Login y CRUD de notas)*

---

## Relaciones entre archivos (detallado)

*(Mapa de dependencias y conexiones entre módulos)*

---

## Notas de seguridad y RLS

*(Advertencias sobre uso de Service Role y JWT)*

---

## Problemas comunes

*(Errores típicos y soluciones)*

---

## Roadmap breve

*(Lista de mejoras futuras)*
