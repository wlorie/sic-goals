// lib/parts.ts
import { supabase } from "./supabase";
import type { Parts } from "@/app/app/page";

export type PartName = "Part1" | "Part2" | "Part3" | "Part4";

export async function getParts(pair_id: string) {
  // returns all parts rows for a given pair (caller can filter)
  return supabase.from("parts").select("*").eq("pair_id", pair_id);
}

export async function savePart(
  pair_id: string,
  part_name: PartName,
  payload: Partial<Parts>
) {
  const row: Parts = { pair_id, part_name, ...(payload as Parts) };
  // NOTE: select().single() after upsert is often useful to get canonical row back
  return supabase.from("parts").upsert(row, { onConflict: "pair_id,part_name" }).select().single();
}
