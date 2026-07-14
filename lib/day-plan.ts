import { getSupabase } from "./supabase";
import { fetchTemplate } from "./templates";
import type { DayPlan, DayType, PlanSlot } from "./types";

// 只为当前登录用户自建当天计划（RLS只允许写自己的行）；查别人的当天计划若不存在直接返回 null
export async function fetchDayPlan(userId: string, date: string): Promise<DayPlan | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("day_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data as DayPlan | null;
}

export async function ensureDayPlan(
  userId: string,
  date: string,
  dayType: DayType
): Promise<DayPlan> {
  const existing = await fetchDayPlan(userId, date);
  if (existing) return existing;

  const template = await fetchTemplate(userId, dayType);
  const slots: PlanSlot[] = (template?.slots ?? []).map((s) => ({
    ...s,
    done: false,
    checked_at: null,
    note: null,
    photo_url: null,
  }));

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("day_plans")
    .insert({ user_id: userId, date, slots })
    .select("*")
    .single();
  if (error) throw error;
  return data as DayPlan;
}

export async function saveDayPlanSlots(dayPlanId: string, slots: PlanSlot[]): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("day_plans")
    .update({ slots, updated_at: new Date().toISOString() })
    .eq("id", dayPlanId)
    .select("id");
  if (error) throw error;
  // update匹配0行时error为null，必须靠返回行数判断是否真的写入了
  if (!data || data.length === 0) {
    throw new Error("day_plan未匹配到任何行，写入未生效");
  }
}
