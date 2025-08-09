// lib/supabase.js
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY} = process.env

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in .env')

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)
