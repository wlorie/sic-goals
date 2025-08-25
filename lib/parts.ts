// lib/parts.ts
import { supabase } from "./supabase";
import type { Parts } from "@/app/app/page";

export type PartName = "Part1" | "Part2" | "Part3" | "Part4";

// Helper type: payload should NOT carry identifiers
type PartsWithoutIds = Omit<Parts, "pair_id" | "part_name">;

export async function getParts(pair_id: string) {
  return supabase.from("parts").select("*").eq("pair_id", pair_id);
}

export async function savePart(
  pair_id: string,
  part_name: PartName,
  payload: Partial<PartsWithoutIds>
) {
  // Destructure to drop any accidental ids from the payload
  const { pair_id: _pi, part_name: _pn, ...rest } = (payload ?? {}) as Record<string, unknown>;
  const row: Parts = {
    pair_id,
    part_name,
    ...(rest as Partial<PartsWithoutIds>),
  };

  return supabase
    .from("parts")
    .upsert(row, { onConflict: "pair_id,part_name" })
    .select()
    .single();
}
