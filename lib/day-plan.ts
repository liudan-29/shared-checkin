import { getSupabase } from "./supabase";
import { fetchTemplate } from "./templates";
import { dayTypeOf, parseDateString, slotsToPreviewPlanSlots } from "./preview-plan";
import type { DayPlan, DayType, PlanSlot, Slot } from "./types";

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

export type DaySlotsResult = { slots: PlanSlot[]; exists: boolean; planId: string | null };

// 只读辅助：过去的日期查真实记录、未来的日期按模板生成预览。不做建行副作用——
// ensureDayPlan的"今天首次访问建行"逻辑不在这里，调用方自己决定要不要写。
// 被主视图(过去/未来分支)和周报页面(整周7天读取)共用，避免两处各写一份同样的分支逻辑。
export async function fetchDaySlotsForDate(
  userId: string,
  date: string,
  mode: "past" | "current" | "future"
): Promise<DaySlotsResult> {
  if (mode === "future") {
    const tpl = await fetchTemplate(userId, dayTypeOf(parseDateString(date)));
    return { slots: slotsToPreviewPlanSlots(tpl?.slots ?? []), exists: false, planId: null };
  }
  const plan = await fetchDayPlan(userId, date);
  return { slots: plan?.slots ?? [], exists: !!plan, planId: plan?.id ?? null };
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

function slotContentEqual(
  a: { task: string; start_time: string; end_time: string },
  b: { task: string; start_time: string; end_time: string }
): boolean {
  return a.task === b.task && a.start_time === b.start_time && a.end_time === b.end_time;
}

// 按内容(任务名+起止时间)判断模板时段是不是已经存在于当天计划——模板和当天计划的slot id
// 各自独立生成互不相关，不能靠id比对，只能靠内容
export function isSlotAlreadyInDay(slot: Slot, daySlots: PlanSlot[]): boolean {
  return daySlots.some((d) => slotContentEqual(d, slot));
}

// 把模板同步到今天：只加不删。已经在当天计划里的(含已打卡的)一律不动，
// 只把选中且内容还不存在的模板时段追加进去，避免同步操作误删用户当天的临时安排或打卡记录
export function mergeTemplateSlotsIntoDay(daySlots: PlanSlot[], selected: Slot[]): PlanSlot[] {
  const toAdd = selected.filter((s) => !isSlotAlreadyInDay(s, daySlots));
  const newPlanSlots: PlanSlot[] = toAdd.map((s) => ({
    id: crypto.randomUUID(),
    task: s.task,
    start_time: s.start_time,
    end_time: s.end_time,
    done: false,
    checked_at: null,
    note: null,
    photo_url: null,
  }));
  return [...daySlots, ...newPlanSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
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
