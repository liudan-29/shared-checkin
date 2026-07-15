// 全项目共享类型。时间约定：start_time/end_time 是 "HH:mm"，date 是 "YYYY-MM-DD"，均为本地时区

export type DayType = "weekday" | "weekend";

// 模板里的时段
export type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  task: string;
};

// 当天计划里的时段，比模板多打卡状态
export type PlanSlot = Slot & {
  done: boolean;
  checked_at: string | null;
  note: string | null;
  photo_url: string | null;
};

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type Template = {
  id: string;
  owner_id: string;
  day_type: DayType;
  slots: Slot[];
  updated_at: string;
};

export type DayPlan = {
  id: string;
  user_id: string;
  date: string;
  slots: PlanSlot[];
  updated_at: string;
};

// PDCA周期目标：整体完成率目标 或 针对具体任务的目标（按task文本匹配，v1只做"一次不落"）。
// NewCycleGoal单独定义（不用Omit<CycleGoal,"id">），因为Omit作用于联合类型时会按keyof的交集
// 塌缩掉判别字段以外的属性（Omit=Pick+Exclude，keyof对union取的是交集不是逐个成员的键），
// 导致target_rate/task_label"凭空消失"。分开定义能保住这个联合类型的结构。
export type NewCycleGoal =
  | { kind: "overall_rate"; target_rate: number }
  | { kind: "task_target"; task_label: string; target_type: "all" };

export type CycleGoal = { id: string } & NewCycleGoal;

export type WeeklyReview = {
  id: string;
  user_id: string;
  week_start: string;
  goals: CycleGoal[];
  review_note: string | null;
  updated_at: string;
};

// 留言板：双方互相鼓励的话，全部公开，只取最近的用
export type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
