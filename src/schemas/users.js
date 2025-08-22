// schemas/users.js
import { z } from 'zod'

// Reglas comunes
const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
  .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
  .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' })

const USERNAME_STRICT_RE = /^(?=.{3,20}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/

// Identificador de login: email O username en el MISMO campo "email"
const identifierSchema = z.string()
  .trim()
  .transform(s => s.toLowerCase())
  .refine(v => (v.includes('@')
    ? z.string().email().safeParse(v).success
    : USERNAME_STRICT_RE.test(v)
  ), {
    message: 'Debe ser email válido o username (3–20, letras/números, - y _ solo entre caracteres)'
  })

export const loginSchema = z.object({
  email: identifierSchema,            // email O username
  password: passwordSchema,
  remember: z.coerce.boolean().optional()
})

// Para registro: aquí SÍ exige email real, no el union.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Email inválido' }),
  username: z.string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_STRICT_RE, {
      message: 'Username inválido: 3–20, letras/números, - y _ solo entre caracteres'
    }),
  password: passwordSchema
})

// --- helpers ---
function zodToResp(result) {
  if (!result.success) {
    const errors = result.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message
    }))
    return { success: false, errors }
  }
  return { success: true, data: result.data }
}

export function validateLogin(data) {
  return zodToResp(loginSchema.safeParse(data))
}

export function validateRegister(data) {
  return zodToResp(registerSchema.safeParse(data))
}

// Compat
export function validateAuth(data) {
  return validateLogin(data)
}
