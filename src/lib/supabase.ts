import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// The publishable key is meant to be public: row level security only lets signed-in FSD staff read or write.
export const supabase = createClient<Database>(
  'https://ojmkekoxupjebwixhgil.supabase.co',
  'sb_publishable_97EMskuJxnrUfGLYCKIvfw_vQUpZOMc',
)
