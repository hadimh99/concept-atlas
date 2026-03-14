import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uyikzrdialvariconams.supabase.co'
const supabaseAnonKey = 'PASTE_YOUR_COPIED_EYJ_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
