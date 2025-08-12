// src/routes/ai.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import iaService from '../services/ai.js';

const router = express.Router();

// POST /api/ai/complete  { prompt }
router.post('/complete', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Falta o tipo inválido de prompt' });
    }
    const suggestion = await iaService.getPrediction(prompt);
    return res.json({ suggestion });
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || 'Error IA';
    return res.status(502).json({ error: msg });
  }
});

export default router;
