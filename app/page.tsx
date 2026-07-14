"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";
import { fetchProfiles } from "@/lib/profiles";
import { ensureDayPlan, fetchDayPlan, saveDayPlanSlots } from "@/lib/day-plan";
import { getSlotStatus, getOverdueMinutes, formatOverdue, getTodayDateString, isWeekend } from "@/lib/slot-status";
import type { DayPlan, PlanSlot, Profile, Slot } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTicket } from "@/components/DateTicket";
import { PeerSummaryBar } from "@/components/PeerSummaryBar";
import { SlotCard } from "@/components/SlotCard";
import { AddSlotRow } from "@/components/AddSlotRow";
import { EmptyStateMine, EmptyStatePeer } from "@/components/EmptyState";
import { SlotEditorSheet } from "@/components/SlotEditorSheet";
import { CheckInDialog } from "@/components/CheckInDialog";

const TODAY = getTodayDateString();
const DAY_TYPE = isWeekend(new Date()) ? "weekend" : "weekday";

export default function MainPage() {
  const router = useRouter();
  const { session, user, loading: sessionLoading } = useSession();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myPlan, setMyPlan] = useState<DayPlan | null>(null);
  const [peerPlan, setPeerPlan] = useState<DayPlan | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"mine" | "peer">("mine");
  const [connected, setConnected] = useState(true);
  const [checkingSlotId, setCheckingSlotId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; slot?: PlanSlot }>({ open: false });
  const [checkinDialog, setCheckinDialog] = useState<{ open: boolean; slot?: PlanSlot }>({
    open: false,
  });

  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useMemo(() => profiles.find((p) => p.id === user?.id) ?? null, [profiles, user]);
  const peer = useMemo(() => profiles.find((p) => p.id !== user?.id) ?? null, [profiles, user]);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace("/login");
    }
  }, [sessionLoading, session, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const profileList = await fetchProfiles();
    setProfiles(profileList);

    const mine = await ensureDayPlan(user.id, TODAY, DAY_TYPE);
    setMyPlan(mine);

    const peerProfile = profileList.find((p) => p.id !== user.id);
    if (peerProfile) {
      const peerData = await fetchDayPlan(peerProfile.id, TODAY);
      setPeerPlan(peerData);
    }
    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // 每分钟重算一次状态和拖延时长
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // 实时订阅当天两人的 day_plans 变化
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`day_plans_${TODAY}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const updated = payload.new as DayPlan;
          if (updated.user_id === user.id) setMyPlan(updated);
          else setPeerPlan(updated);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const inserted = payload.new as DayPlan;
          if (inserted.user_id !== user.id) setPeerPlan(inserted);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
          setConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!disconnectTimer.current) {
            disconnectTimer.current = setTimeout(() => setConnected(false), 10_000);
          }
        }
      });

    return () => {
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick 只用来触发每分钟重算，无需读取
  const now = useMemo(() => new Date(), [tick]);

  async function handleCheck(slot: PlanSlot, note: string | null = null) {
    if (!myPlan) return;
    setCheckingSlotId(slot.id);
    const updatedSlots = myPlan.slots.map((s) =>
      s.id === slot.id ? { ...s, done: true, checked_at: new Date().toISOString(), note } : s
    );
    setMyPlan({ ...myPlan, slots: updatedSlots });
    try {
      await saveDayPlanSlots(myPlan.id, updatedSlots);
      toast.success(`已打卡·${new Date().toTimeString().slice(0, 5)}`);
    } catch {
      setMyPlan(myPlan);
      toast.error("打卡没同步上", {
        action: { label: "重试", onClick: () => handleCheck(slot, note) },
      });
    } finally {
      setCheckingSlotId(null);
    }
  }

  async function handleUncheck(slot: PlanSlot) {
    if (!myPlan) return;
    const updatedSlots = myPlan.slots.map((s) =>
      s.id === slot.id ? { ...s, done: false, checked_at: null } : s
    );
    const prev = myPlan;
    setMyPlan({ ...myPlan, slots: updatedSlots });
    try {
      await saveDayPlanSlots(myPlan.id, updatedSlots);
    } catch {
      setMyPlan(prev);
      toast.error("取消没同步上");
    }
  }

  async function handleSaveSlot(data: Omit<Slot, "id"> & { note?: string | null }) {
    if (!myPlan) return;
    const prev = myPlan;
    let updatedSlots: PlanSlot[];
    if (editor.slot) {
      updatedSlots = myPlan.slots.map((s) =>
        s.id === editor.slot!.id ? { ...s, ...data } : s
      );
    } else {
      const newSlot: PlanSlot = {
        id: crypto.randomUUID(),
        task: data.task,
        start_time: data.start_time,
        end_time: data.end_time,
        done: false,
        checked_at: null,
        note: data.note ?? null,
        photo_url: null,
      };
      updatedSlots = [...myPlan.slots, newSlot];
    }
    updatedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    setMyPlan({ ...myPlan, slots: updatedSlots });
    try {
      await saveDayPlanSlots(myPlan.id, updatedSlots);
      toast.success("已保存");
    } catch {
      setMyPlan(prev);
      toast.error("保存没同步上");
    }
  }

  async function handleDeleteSlot() {
    if (!myPlan || !editor.slot) return;
    const prev = myPlan;
    const updatedSlots = myPlan.slots.filter((s) => s.id !== editor.slot!.id);
    setMyPlan({ ...myPlan, slots: updatedSlots });
    try {
      await saveDayPlanSlots(myPlan.id, updatedSlots);
      toast.success("已删除");
    } catch {
      setMyPlan(prev);
      toast.error("删除没同步上");
    }
  }

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (sessionLoading || dataLoading || !myPlan) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-6">
        <Skeleton className="h-24 w-full" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    );
  }

  const myStatuses = myPlan.slots.map((s) => getSlotStatus(s, now));
  const doneCount = myPlan.slots.filter((s) => s.done).length;
  const peerSlots = peerPlan?.slots ?? [];
  const peerStatuses = peerSlots.map((s) => getSlotStatus(s, now));

  const peerOverdueSlot = peerSlots.find((s, i) => peerStatuses[i] === "overdue");
  const peerOverdueText = peerOverdueSlot
    ? formatOverdue(getOverdueMinutes(peerOverdueSlot, now))
    : null;
  const peerInProgress = peerSlots.find((s, i) => peerStatuses[i] === "in-progress");

  function renderSlotList(
    slots: PlanSlot[],
    statuses: ReturnType<typeof getSlotStatus>[],
    variant: "mine" | "peer"
  ) {
    if (slots.length === 0) {
      return variant === "mine" ? (
        <EmptyStateMine
          onAdd={() => setEditor({ open: true })}
          onEditTemplate={() => router.push("/template")}
        />
      ) : (
        <EmptyStatePeer />
      );
    }
    return (
      <div className="space-y-3">
        {slots.map((slot, i) => {
          const status = statuses[i];
          const overdueText =
            status === "overdue" ? formatOverdue(getOverdueMinutes(slot, now)) : null;
          return (
            <SlotCard
              key={slot.id}
              slot={slot}
              variant={variant}
              status={status}
              overdueText={overdueText}
              checking={checkingSlotId === slot.id}
              onCheck={variant === "mine" ? () => setCheckinDialog({ open: true, slot }) : undefined}
              onUncheck={variant === "mine" ? () => handleUncheck(slot) : undefined}
              onEdit={variant === "mine" ? () => setEditor({ open: true, slot }) : undefined}
            />
          );
        })}
        {variant === "mine" && <AddSlotRow onClick={() => setEditor({ open: true })} />}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[960px] px-4 py-6 pb-16">
      <DateTicket
        date={now}
        myStatuses={myStatuses}
        doneCount={doneCount}
        totalCount={myPlan.slots.length}
        onOpenTemplate={() => router.push("/template")}
        onLogout={handleLogout}
      />

      {!connected && (
        <div
          className="mt-3 flex h-9 items-center gap-2 rounded-md px-3 text-sm"
          style={{ backgroundColor: "var(--color-warning-subtle)", color: "var(--color-warning)" }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          连接断了，正在重连…
        </div>
      )}

      {/* 移动端：分段切换 */}
      <div className="mt-4 md:hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "mine" | "peer")}>
          <TabsList className="w-full">
            <TabsTrigger value="mine">我的</TabsTrigger>
            <TabsTrigger value="peer">
              {peer?.name ?? "TA"}的
              {peerOverdueText && (
                <span
                  className="ml-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--color-danger)" }}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <PeerSummaryBar
              name={peer?.name ?? "TA"}
              statuses={peerStatuses}
              overdueText={peerOverdueText}
              inProgressTask={peerInProgress?.task ?? null}
              onClick={() => setActiveTab("peer")}
            />
          </div>

          <TabsContent value="mine">{renderSlotList(myPlan.slots, myStatuses, "mine")}</TabsContent>
          <TabsContent value="peer">{renderSlotList(peerSlots, peerStatuses, "peer")}</TabsContent>
        </Tabs>
      </div>

      {/* 桌面端：双栏并列 */}
      <div className="mt-6 hidden gap-6 md:grid md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
              我
            </span>
            <span className="text-base text-foreground">{me?.name ?? "我"}</span>
          </div>
          {renderSlotList(myPlan.slots, myStatuses, "mine")}
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
              {(peer?.name ?? "TA").slice(0, 1)}
            </span>
            <span className="text-base text-foreground">{peer?.name ?? "TA"}</span>
          </div>
          {renderSlotList(peerSlots, peerStatuses, "peer")}
        </div>
      </div>

      <SlotEditorSheet
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        mode={editor.slot ? "edit" : "add"}
        target="today"
        initial={editor.slot}
        onSave={handleSaveSlot}
        onDelete={editor.slot ? handleDeleteSlot : undefined}
      />

      <CheckInDialog
        open={checkinDialog.open}
        onOpenChange={(open) => setCheckinDialog((d) => ({ ...d, open }))}
        taskName={checkinDialog.slot?.task}
        onConfirm={(note) => {
          if (checkinDialog.slot) handleCheck(checkinDialog.slot, note);
        }}
      />
    </main>
  );
}
