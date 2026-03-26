import { supabase } from '../supabase.js'

const TABLE = 'ideadump_user_data'

// Spara hela idé-arrayen till Supabase
export async function saveToCloud(userId, ideas) {
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    data: { ideas },
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

// Ladda idéer från Supabase (cloud är source of truth)
export async function loadFromCloud(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data?.data?.ideas ?? null
}
