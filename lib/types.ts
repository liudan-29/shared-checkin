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
