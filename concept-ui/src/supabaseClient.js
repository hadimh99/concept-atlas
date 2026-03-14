import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uyikzrdialvariconams.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aWt6cmRpYWx2YXJpY29uYW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDQzOTYsImV4cCI6MjA4OTAyMDM5Nn0.Q0ZlAPw_b_V9OQyY-NJ0OxicN9wgUYjaU8vssHZtANw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
