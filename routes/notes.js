// routes/notes.js
import express from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Listar notas del usuario (incluye title)
router.get('/notes', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('id, user_id, title, text, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Obtener una nota por id
router.get('/notes/:id', authenticate, async (req, res) => {
  const noteId = Number(req.params.id)
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('id, user_id, title, text, created_at, updated_at')
    .match({ id: noteId, user_id: req.user.id })
    .single()
  if (error) return res.status(404).json({ error: 'Nota no encontrada' })
  res.json(data)
})

// Crear nota (title + text)
router.post('/notes', authenticate, async (req, res) => {
  const { title, text } = req.body
  if (!title || !text) {
    return res.status(400).json({ error: 'title y text son requeridos' })
  }

  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert([{ user_id: req.user.id, title, text }])
    .select('id, user_id, title, text, created_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Actualizar nota (title + text)
router.put('/notes/:id', authenticate, async (req, res) => {
  const noteId = Number(req.params.id)
  const { title, text } = req.body
  if (!title || !text) {
    return res.status(400).json({ error: 'title y text son requeridos' })
  }

  const { data, error } = await supabaseAdmin
    .from('notes')
    .update({ title, text })
    .match({ id: noteId, user_id: req.user.id })
    .select('id, user_id, title, text, updated_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Note updated', note: data })
})

// Eliminar nota (ruta alineada con el front)
router.delete('/notes/:id', authenticate, async (req, res) => {
  const noteId = Number(req.params.id)
  const { error } = await supabaseAdmin
    .from('notes')
    .delete()
    .match({ id: noteId, user_id: req.user.id })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Note deleted' })
})

export default router
