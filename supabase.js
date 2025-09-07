// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co'
const SUPABASE_KEY = 'YOUR_ANON_KEY'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function fetchData(tbl, filters = {}) {
  let query = supabase.from(tbl).select('*')
  Object.entries(filters).forEach(([k, v]) => {
    query = Array.isArray(v) ? query.in(k, v) : query.eq(k, v)
  })
  const { data, error } = await query
  if (error) throw error
  return data
}
