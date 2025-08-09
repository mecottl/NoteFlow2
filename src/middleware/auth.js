// middlewares/auth.js
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' })

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token missing' })

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' })
    req.user = { id: payload.sub, email: payload.email }
    next()
  })
}
