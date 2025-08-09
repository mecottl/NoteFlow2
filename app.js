import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import usersRouter from './routes/users.js'
import notesRouter from './routes/notes.js'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())
app.disable('x-powered-by')

// routes 
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Rutas de páginas estáticas
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'pages', 'index.html')))
app.get('/login',   (req, res) => res.sendFile(path.join(__dirname, 'pages', 'login.html')))
app.get('/register',(req, res) => res.sendFile(path.join(__dirname, 'pages', 'register.html')))
app.get('/notes',   (req, res) => res.sendFile(path.join(__dirname, 'pages', 'notes.html')))
app.get('/note', (req, res) => res.sendFile(path.join(__dirname, 'pages', 'note.html'))
)


// Api de routes
app.use('/api', usersRouter)  // /api/login, /api/register
app.use('/api', notesRouter)  // /api/notes


export default app
