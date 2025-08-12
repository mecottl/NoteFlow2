// api/index.js (ESM)
import app from '../app.js';

// Adaptador a la firma Node de Vercel Functions
export default function handler(req, res) {
  return app(req, res);
}
