// app.js (en la raíz)
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

// importa routers desde src/
import usersRouter from './src/routes/users.js'
import notesRouter from './src/routes/notes.js'
import aiRouter from './src/routes/ai.js';

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())
app.disable('x-powered-by')

// Paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.join(__dirname, 'public')

// Servir estáticos (JS, imágenes, etc.)
app.use(express.static(PUBLIC_DIR))

// Páginas (HTML)
app.get('/',        (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', 'index.html')))
app.get('/login',   (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', 'login.html')))
app.get('/register',(req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', 'register.html')))
app.get('/notes',   (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', 'notes.html')))
app.get('/note',    (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', 'note.html')))

// API
app.use('/api', usersRouter)  // /api/login, /api/register
app.use('/api', notesRouter)  // /api/notes...
app.use('/api/ai', aiRouter);

// 404 para páginas
app.use((req,res)=>res.status(404).sendFile(path.join(PUBLIC_DIR,'pages','404.html')))

export default app
