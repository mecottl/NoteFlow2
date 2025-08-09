// routes/users.js
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../lib/supabase.js'
import { validateRegister, validateLogin } from '../schemas/users.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

// reserva nombres obvios
const RESERVED = new Set([
  'admin','root','support','about','help','login','register',
  'notes','note','api','v1','system'
])

// POST /register
router.post('/register', async (req, res) => {
  const validation = validateRegister(req.body)
  if (!validation.success) return res.status(400).json({ errors: validation.errors })

  const email = validation.data.email.trim().toLowerCase()
  const password = validation.data.password
  const username = validation.data.username.trim().toLowerCase()

  if (RESERVED.has(username)) return res.status(400).json({ error: 'Username no disponible' })

  // ¿email ya existe?
  const { data: emailRow, error: emailErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (emailErr && emailErr.code !== 'PGRST116') {
    return res.status(500).json({ error: emailErr.message || 'DB error' })
  }
  if (emailRow) return res.status(409).json({ error: 'Email ya registrado' })

  // ¿username ya existe? (case-insensitive)
  const { data: userRow, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (userErr && userErr.code !== 'PGRST116') {
    return res.status(500).json({ error: userErr.message || 'DB error' })
  }
  if (userRow) return res.status(409).json({ error: 'Username no disponible' })

  // hash + insert
  const password_hash = await bcrypt.hash(password, 10)
  const { data: newUser, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert([{ email, username, password_hash }])
    .select('id, email, username')
    .single()

  // Por si hay carrera y salta la unique constraint
  if (insertErr) {
    if (insertErr.code === '23505') {
      return res.status(409).json({ error: 'Username no disponible' })
    }
    return res.status(500).json({ error: insertErr.message || 'DB error' })
  }

  // autologin: token con username
  const token = jwt.sign(
    { sub: newUser.id, email: newUser.email, username: newUser.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  res.status(201).json({ message: 'Usuario registrado', token })
})

// POST /login  (acepta email o username en el campo "email" del form)
router.post('/login', async (req, res) => {
  const validation = validateLogin(req.body)
  if (!validation.success) return res.status(400).json({ errors: validation.errors })

  const identifier = validation.data.email.trim().toLowerCase()
  const password = validation.data.password

  // Si contiene @ asumimos email, si no username
  let q = supabaseAdmin
    .from('users')
    .select('id, email, username, password_hash')
    .limit(1)

  if (identifier.includes('@')) q = q.eq('email', identifier)
  else q = q.ilike('username', identifier)

  const { data: user, error: fetchErr } = await q.single()
  if (fetchErr || !user) return res.status(401).json({ error: 'Credenciales inválidas' })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })

  const token = jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  res.json({ message: 'Acceso exitoso', token })
})

// --- disponibilidad de username ---
// GET /api/username-availability?u=loquesea
router.get('/username-availability', async (req, res) => {
  try {
    const raw = (req.query.u || '').toString().trim();
    const u = raw.toLowerCase();

    // misma regex que usas en el front / schema
    const USERNAME_RE = /^(?=.{3,20}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

    // cabeceras para evitar caché tonta del navegador/proxy
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    });

    if (!u || !USERNAME_RE.test(u)) {
      return res.json({ available: false, reason: 'invalid' });
    }

    // usa la misma lista que en /register
    const RESERVED = new Set([
      'admin','root','support','about','help','login','register',
      'notes','note','api','v1','system'
    ]);
    if (RESERVED.has(u)) {
      return res.json({ available: false, reason: 'reserved' });
    }

    // consulta en Supabase (case-insensitive)
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('username', u)
      .maybeSingle();

    if (error) {
      // si algo peta en DB, no tires el front: di server error
      return res.status(500).json({ available: false, reason: 'server' });
    }

    return res.json({ available: !data });
  } catch (e) {
    return res.status(500).json({ available: false, reason: 'server' });
  }
});


export default router
