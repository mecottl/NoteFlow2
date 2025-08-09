import { z } from 'zod'

// Schema for registration and login
export const authSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
    .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
    .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
    .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' }),
})

// Helper to parse and return errors
export function validateAuth(data) {
  const result = authSchema.safeParse(data)
  if (!result.success) {
    // ZodError.issues contiene los detalles de validación
    const errors = result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
    return { success: false, errors }
  }
  return { success: true, data: result.data }
}