import { getSupabase } from "./supabase";
import type { CycleGoal, WeeklyReview } from "./types";

export async function fetchWeeklyReview(
  userId: string,
  weekStart: string
): Promise<WeeklyReview | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return data as WeeklyReview | null;
}

// 只更新goals这一列，不动review_note（upsert只会DO UPDATE SET传入的列）
export async function saveWeeklyGoals(
  userId: string,
  weekStart: string,
  goals: CycleGoal[]
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(
      { user_id: userId, week_start: weekStart, goals, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    );
  if (error) throw error;
}

// 只更新review_note这一列，不动goals
export async function saveWeeklyReviewNote(
  userId: string,
  weekStart: string,
  reviewNote: string | null
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(
      { user_id: userId, week_start: weekStart, review_note: reviewNote, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    );
  if (error) throw error;
}
