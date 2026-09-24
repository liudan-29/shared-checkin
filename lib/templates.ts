import { getSupabase } from "./supabase";
import type { DayType, Slot, Template } from "./types";

export async function fetchTemplate(
  groupId: string,
  ownerId: string,
  dayType: DayType
): Promise<Template | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("group_id", groupId)
    .eq("owner_id", ownerId)
    .eq("day_type", dayType)
    .maybeSingle();
  if (error) throw error;
  return data as Template | null;
}

export async function upsertTemplate(
  groupId: string,
  ownerId: string,
  dayType: DayType,
  slots: Slot[]
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("templates")
    .upsert(
      { group_id: groupId, owner_id: ownerId, day_type: dayType, slots, updated_at: new Date().toISOString() },
      { onConflict: "group_id,owner_id,day_type" }
    );
  if (error) throw error;
}
