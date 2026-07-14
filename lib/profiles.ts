import { getSupabase } from "./supabase";
import type { Profile } from "./types";

export async function fetchProfiles(): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("users").select("id, name, avatar_url");
  if (error) throw error;
  return data as Profile[];
}
