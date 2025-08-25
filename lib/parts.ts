import { supabase } from './supabase';

export type PartName = 'Part1'|'Part2'|'Part3'|'Part4';

export async function getParts(pair_id: string) {
  return supabase.from('parts')
    .select('*')
    .eq('pair_id', pair_id);
}

export async function savePart(
  pair_id: string,
  part_name: PartName,
  payload: Record<string, any>
) {
  // Build the row enforcing (pair_id, part_name) PK
  const row = { pair_id, part_name, ...payload };
  return supabase.from('parts')
    .upsert(row, { onConflict: 'pair_id,part_name' })
    .select()
    .single();
}
