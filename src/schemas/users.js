import { z } from 'zod'

// --- reglas comunes ---
const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
  .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
  .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' })

// Username: 3–20, letras/números, guion o guion_bajo solo entre caracteres (sin espacios)
const USERNAME_STRICT_RE = /^(?=.{3,20}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/

// --- esquemas ---
export const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: passwordSchema
})

export const registerSchema = loginSchema.extend({
  username: z
    .string()
    .trim()
    .regex(USERNAME_STRICT_RE, {
      message: 'Username inválido: 3–20, letras/números, - y _ solo entre caracteres'
    })
    .transform((s) => s.toLowerCase()) // normaliza a minúsculas
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

// Compat: si tu código usa validateAuth para /login, se mantiene igual
export function validateAuth(data) {
  return validateLogin(data)
}
