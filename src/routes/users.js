// routes/users.js
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../lib/supabase.js'
import { validateAuth } from '../schemas/users.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET 

// POST /register
router.post('/register', async (req, res) => {
  const validation = validateAuth(req.body)
  if (!validation.success) return res.status(400).json({ errors: validation.errors })
  const { email, password } = validation.data

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  if (fetchErr && fetchErr.code !== 'PGRST116') return res.status(500).json({ error: 'DB error' })
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: newUser, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert([{ email, password_hash: passwordHash }])
    .select('id, email')
    .single()
  if (insertErr) return res.status(500).json({ error: 'DB error' })

  const token = jwt.sign({ sub: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' })
  res.status(201).json({ message: 'Usuario registrado', token })
})

// POST /login
router.post('/login', async (req, res) => {
  const validation = validateAuth(req.body)
  if (!validation.success) return res.status(400).json({ errors: validation.errors })
  const { email, password } = validation.data

  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email)
    .single()
  if (fetchErr || !user) return res.status(401).json({ error: 'Credenciales inválidas' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' })
  res.json({ message: 'Acceso exitoso', token })
})

export default router
