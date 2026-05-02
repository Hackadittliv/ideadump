import { supabase } from '../supabase.js'

const TABLE = 'ideadump_user_data'

// Mergar två idé-listor by id med last-write-wins per idé.
// Tradeoff: deletes propagerar inte automatiskt (en idé som finns remote
// men inte local antas vara tillagd från annan enhet, inte raderad här).
// Användaren behöver re-radera på enheten som är online för att deleten
// ska sticka. Tystare data-loss är värre än stale undelete.
export function mergeIdeas(local = [], remote = []) {
  const byId = new Map()
  for (const r of remote) byId.set(r.id, r)
  for (const l of local) {
    const r = byId.get(l.id)
    if (!r) { byId.set(l.id, l); continue }
    const lU = l.updatedAt || l.createdAt || ''
    const rU = r.updatedAt || r.createdAt || ''
    byId.set(l.id, lU >= rU ? l : r)
  }
  // Sortera nyaste först (createdAt desc) — matchar UI-listans default
  return Array.from(byId.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

// Read-merge-write: läser remote först, mergar med local by id, skriver tillbaka.
// Förhindrar att en write från enhet A tyst skriver över en write från enhet B.
export async function saveToCloud(userId, ideas) {
  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (readErr && readErr.code !== 'PGRST116') throw new Error(readErr.message)

  const remote = existing?.data?.ideas || []
  const merged = remote.length === 0 ? ideas : mergeIdeas(ideas, remote)

  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    data: { ideas: merged },
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
  return merged
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
