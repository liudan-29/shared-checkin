import { getSupabase } from "./supabase";
import type { Profile } from "./types";

export async function fetchProfiles(profileIds?: string[]): Promise<Profile[]> {
  const supabase = getSupabase();
  let query = supabase.from("users").select("id, name, avatar_url");
  if (profileIds) query = query.in("id", profileIds);
  const { data, error } = await query;
  if (error) throw error;
  return data as Profile[];
}
