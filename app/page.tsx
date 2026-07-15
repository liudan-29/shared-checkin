"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";
import { fetchProfiles } from "@/lib/profiles";
import { ensureDayPlan, fetchDaySlotsForDate, saveDayPlanSlots } from "@/lib/day-plan";
import {
  getSlotStatus,
  getSlotStatusForDate,
  getOverdueMinutes,
  getLateMinutes,
  formatOverdue,
  getTodayDateString,
} from "@/lib/slot-status";
import {
  getDateMode,
  addDays,
  dayTypeOf,
  parseDateString,
  type DateMode,
} from "@/lib/preview-plan";
import { computeDaySummary } from "@/lib/day-summary";
import type { DayPlan, Message, PlanSlot, Profile, Slot } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTicket } from "@/components/DateTicket";
import { PeerSummaryBar } from "@/components/PeerSummaryBar";
import { SlotCard } from "@/components/SlotCard";
import { AddSlotRow } from "@/components/AddSlotRow";
import {
  EmptyStateMine,
  EmptyStatePeer,
  EmptyStateReadonlyMine,
  EmptyStateReadonlyPeer,
  EmptyStatePreviewMine,
  EmptyStatePreviewPeer,
} from "@/components/EmptyState";
import { SlotEditorSheet } from "@/components/SlotEditorSheet";
import { CheckInDialog } from "@/components/CheckInDialog";
import { SummarySheet } from "@/components/SummarySheet";
import { DateJumpSheet } from "@/components/DateJumpSheet";
import { MessageBoard, type MessageView } from "@/components/MessageBoard";
import { MessageComposerDialog } from "@/components/MessageComposerDialog";
import { MessageHistoryDialog } from "@/components/MessageHistoryDialog";
import { fetchRecentMessages, postMessage, subscribeNewMessages, deleteMessage } from "@/lib/messages";
import type { NoteEntry } from "@/components/SummaryNotesList";

const TODAY = getTodayDateString();
const MIN_DATE = addDays(TODAY, -180);
const MAX_DATE = addDays(TODAY, 90);

// 一侧的视图数据：显示用 slots + 该天是否有真实记录 + 今天可写时的 planId
type SideView = { slots: PlanSlot[]; exists: boolean; planId: string | null };
const EMPTY_VIEW: SideView = { slots: [], exists: false, planId: null };

export default function MainPage() {
  const router = useRouter();
  const { session, user, loading: sessionLoading } = useSession();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [viewDate, setViewDate] = useState(TODAY);
  const [myView, setMyView] = useState<SideView>(EMPTY_VIEW);
  const [peerView, setPeerView] = useState<SideView>(EMPTY_VIEW);
  const [dataLoading, setDataLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"mine" | "peer">("mine");
  const [connected, setConnected] = useState(true);
  const [checkingSlotId, setCheckingSlotId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; slot?: PlanSlot }>({ open: false });
  const [checkinDialog, setCheckinDialog] = useState<{ open: boolean; slot?: PlanSlot }>({
    open: false,
  });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [dateJumpOpen, setDateJumpOpen] = useState(false);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useMemo(() => profiles.find((p) => p.id === user?.id) ?? null, [profiles, user]);
  const peer = useMemo(() => profiles.find((p) => p.id !== user?.id) ?? null, [profiles, user]);
  const dateMode: DateMode = getDateMode(viewDate, TODAY);
  const viewedDayType = dayTypeOf(parseDateString(viewDate));
  const isToday = dateMode === "today";

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace("/login");
    }
  }, [sessionLoading, session, router]);

  // 载入某一侧某天的数据。今天可写用 ensureDayPlan 建行；过去只读取；未来从模板生成预览
  // 只读分支复用 fetchDaySlotsForDate（和周报页面共用同一份"历史/未来怎么取数据"的逻辑）
  const loadSide = useCallback(
    async (uid: string, date: string, mode: DateMode, writable: boolean): Promise<SideView> => {
      if (mode === "today" && writable) {
        const plan = await ensureDayPlan(uid, date, dayTypeOf(parseDateString(date)));
        return { slots: plan.slots, exists: true, planId: plan.id };
      }
      return fetchDaySlotsForDate(uid, date, mode === "today" ? "current" : mode);
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const profileList = await fetchProfiles();
    setProfiles(profileList);
    const peerProfile = profileList.find((p) => p.id !== user.id);

    const mode = getDateMode(viewDate, TODAY);
    const mine = await loadSide(user.id, viewDate, mode, true);
    setMyView(mine);

    if (peerProfile) {
      const peerData = await loadSide(peerProfile.id, viewDate, mode, false);
      setPeerView(peerData);
    } else {
      setPeerView(EMPTY_VIEW);
    }
    setDataLoading(false);
  }, [user, viewDate, loadSide]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // 每分钟重算一次状态和拖延时长
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // 实时订阅只对"今天"生效：查看历史/未来时不需要实时推送
  useEffect(() => {
    if (!user || !isToday) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`day_plans_${TODAY}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const updated = payload.new as DayPlan;
          if (updated.user_id === user.id)
            setMyView({ slots: updated.slots, exists: true, planId: updated.id });
          else setPeerView({ slots: updated.slots, exists: true, planId: updated.id });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const inserted = payload.new as DayPlan;
          if (inserted.user_id !== user.id)
            setPeerView({ slots: inserted.slots, exists: true, planId: inserted.id });
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
  }, [user, isToday]);

  // 留言板：跟viewDate/dateMode完全无关，固定加载，不随翻看历史/未来变化
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setMessagesLoading(true);
    fetchRecentMessages()
      .then((data) => {
        if (!cancelled) setRawMessages(data);
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeNewMessages((msg) => {
      // 自己发的留言会先被本地乐观更新加进去，Realtime广播会给发送者自己也推一份，
      // 这里按id去重，避免同一条留言在列表里出现两次
      setRawMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev].slice(0, 20)));
    });
  }, [user]);

  const messageViews: MessageView[] = useMemo(
    () =>
      rawMessages.map((m) => ({
        id: m.id,
        content: m.content,
        authorLabel: user && m.sender_id === user.id ? "我" : peer?.name ?? "TA",
        isMine: user ? m.sender_id === user.id : false,
        createdAt: m.created_at,
      })),
    [rawMessages, user, peer]
  );

  async function handlePostMessage(content: string) {
    if (!user) return;
    setComposerSubmitting(true);
    try {
      const created = await postMessage(user.id, content);
      setRawMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [created, ...prev].slice(0, 20)));
      setComposerOpen(false);
      toast.success("已发布");
    } catch {
      toast.error("发布没同步上", { action: { label: "重试", onClick: () => handlePostMessage(content) } });
    } finally {
      setComposerSubmitting(false);
    }
  }

  async function handleDeleteMessage(id: string) {
    const prev = rawMessages;
    setRawMessages((cur) => cur.filter((m) => m.id !== id));
    try {
      await deleteMessage(id);
      toast.success("已删除");
    } catch {
      setRawMessages(prev);
      toast.error("删除没同步上", { action: { label: "重试", onClick: () => handleDeleteMessage(id) } });
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick 只用来触发每分钟重算，无需读取
  const now = useMemo(() => new Date(), [tick]);

  // 乐观写入当天 slots（只允许今天；planId非空不代表可写——过去日期若曾打过卡也会有planId，
  // 这里不靠UI没做入口这一层防护，显式拦截isToday）
  async function persistMySlots(nextSlots: PlanSlot[], successMsg?: string, onFail?: () => void) {
    if (!isToday || !myView.planId) return;
    const prev = myView;
    setMyView({ ...myView, slots: nextSlots });
    try {
      await saveDayPlanSlots(myView.planId, nextSlots);
      if (successMsg) toast.success(successMsg);
    } catch {
      setMyView(prev);
      onFail?.();
    }
  }

  async function handleCheck(slot: PlanSlot, note: string | null = null) {
    if (!isToday || !myView.planId) return;
    setCheckingSlotId(slot.id);
    const updatedSlots = myView.slots.map((s) =>
      s.id === slot.id ? { ...s, done: true, checked_at: new Date().toISOString(), note } : s
    );
    const prev = myView;
    setMyView({ ...myView, slots: updatedSlots });
    try {
      await saveDayPlanSlots(myView.planId, updatedSlots);
      toast.success(`已打卡·${new Date().toTimeString().slice(0, 5)}`);
    } catch {
      setMyView(prev);
      toast.error("打卡没同步上", {
        action: { label: "重试", onClick: () => handleCheck(slot, note) },
      });
    } finally {
      setCheckingSlotId(null);
    }
  }

  async function handleUncheck(slot: PlanSlot) {
    const updatedSlots = myView.slots.map((s) =>
      s.id === slot.id ? { ...s, done: false, checked_at: null } : s
    );
    await persistMySlots(updatedSlots, undefined, () => toast.error("取消没同步上"));
  }

  async function handleSaveSlot(data: Omit<Slot, "id"> & { note?: string | null }) {
    let updatedSlots: PlanSlot[];
    if (editor.slot) {
      updatedSlots = myView.slots.map((s) => (s.id === editor.slot!.id ? { ...s, ...data } : s));
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
      updatedSlots = [...myView.slots, newSlot];
    }
    updatedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    await persistMySlots(updatedSlots, "已保存", () => toast.error("保存没同步上"));
  }

  async function handleDeleteSlot() {
    if (!editor.slot) return;
    const updatedSlots = myView.slots.filter((s) => s.id !== editor.slot!.id);
    await persistMySlots(updatedSlots, "已删除", () => toast.error("删除没同步上"));
  }

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (sessionLoading || dataLoading) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-6">
        <Skeleton className="h-32 w-full" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    );
  }

  const summaryMode = dateMode === "today" ? "current" : dateMode === "past" ? "past" : "future";
  const mySlots = myView.slots;
  const peerSlots = peerView.slots;

  const myStatuses = mySlots.map((s) => getSlotStatusForDate(s, now, dateMode));
  const peerStatuses = peerSlots.map((s) => getSlotStatusForDate(s, now, dateMode));
  const doneCount = mySlots.filter((s) => s.done).length;

  // 对方摘要条（只在今天有意义）
  const peerOverdueSlot = peerSlots.find((s, i) => peerStatuses[i] === "overdue");
  const peerOverdueText = peerOverdueSlot
    ? formatOverdue(getOverdueMinutes(peerOverdueSlot, now))
    : null;
  const peerInProgress = peerSlots.find((s, i) => peerStatuses[i] === "in-progress");

  // 每日总结数据
  const mySummary = computeDaySummary(mySlots, now, summaryMode);
  const peerSummary = computeDaySummary(peerSlots, now, summaryMode);
  const noteEntries: NoteEntry[] = [
    ...mySlots
      .filter((s) => s.done && s.note?.trim())
      .map((s) => ({ who: "我", time: fmt(s.checked_at), task: s.task, note: s.note!.trim() })),
    ...peerSlots
      .filter((s) => s.done && s.note?.trim())
      .map((s) => ({
        who: peer?.name ?? "TA",
        time: fmt(s.checked_at),
        task: s.task,
        note: s.note!.trim(),
      })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const cardMode = dateMode === "today" ? "live" : dateMode === "past" ? "readonly" : "preview";

  function renderSlotList(slots: PlanSlot[], statuses: ReturnType<typeof getSlotStatus>[], variant: "mine" | "peer") {
    if (slots.length === 0) {
      if (dateMode === "today") {
        return variant === "mine" ? (
          <EmptyStateMine
            onAdd={() => setEditor({ open: true })}
            onEditTemplate={() => router.push("/template")}
          />
        ) : (
          <EmptyStatePeer />
        );
      }
      if (dateMode === "past") {
        return variant === "mine" ? <EmptyStateReadonlyMine /> : <EmptyStateReadonlyPeer />;
      }
      return variant === "mine" ? (
        <EmptyStatePreviewMine onEditTemplate={() => router.push("/template")} />
      ) : (
        <EmptyStatePreviewPeer />
      );
    }
    return (
      <div className="space-y-3">
        {slots.map((slot, i) => {
          const status = statuses[i];
          const overdueText =
            status === "overdue" ? formatOverdue(getOverdueMinutes(slot, now)) : null;
          const lateMin = cardMode === "readonly" ? getLateMinutes(slot) : 0;
          const lateText = lateMin > 0 ? `晚${formatOverdue(lateMin).replace("拖延", "")}完成` : null;
          return (
            <SlotCard
              key={slot.id}
              slot={slot}
              variant={variant}
              status={status}
              overdueText={overdueText}
              lateText={lateText}
              mode={cardMode}
              checking={checkingSlotId === slot.id}
              onCheck={variant === "mine" ? () => setCheckinDialog({ open: true, slot }) : undefined}
              onUncheck={variant === "mine" ? () => handleUncheck(slot) : undefined}
              onEdit={variant === "mine" ? () => setEditor({ open: true, slot }) : undefined}
            />
          );
        })}
        {variant === "mine" && dateMode === "today" && (
          <AddSlotRow onClick={() => setEditor({ open: true })} />
        )}
      </div>
    );
  }

  const viewDateObj = parseDateString(viewDate);

  return (
    <main className="mx-auto max-w-[960px] px-4 py-6 pb-16">
      <DateTicket
        date={viewDateObj}
        mode={dateMode}
        viewedDayType={viewedDayType}
        myStatuses={myStatuses}
        doneCount={doneCount}
        totalCount={mySlots.length}
        onPrev={() => setViewDate((d) => (d <= MIN_DATE ? d : addDays(d, -1)))}
        onNext={() => setViewDate((d) => (d >= MAX_DATE ? d : addDays(d, 1)))}
        onJumpToday={() => setViewDate(TODAY)}
        onOpenTemplate={() => router.push("/template")}
        onOpenSummary={() => setSummaryOpen(true)}
        onOpenDateJump={() => setDateJumpOpen(true)}
        onOpenWeekly={() => router.push("/weekly")}
        onLogout={handleLogout}
        prevDisabled={viewDate <= MIN_DATE}
        nextDisabled={viewDate >= MAX_DATE}
      />

      {!connected && isToday && (
        <div
          className="mt-3 flex h-9 items-center gap-2 rounded-md px-3 text-sm"
          style={{ backgroundColor: "var(--color-warning-subtle)", color: "var(--color-warning)" }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          连接断了，正在重连…
        </div>
      )}

      {/* 留言板：固定存在，不随viewDate/dateMode/tab切换而变化或消失 */}
      <div className="mt-4">
        <MessageBoard
          messages={messageViews}
          loading={messagesLoading}
          onWriteClick={() => setComposerOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </div>

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

          {isToday && (
            <div className="mt-3">
              <PeerSummaryBar
                name={peer?.name ?? "TA"}
                statuses={peerStatuses}
                overdueText={peerOverdueText}
                inProgressTask={peerInProgress?.task ?? null}
                onClick={() => setActiveTab("peer")}
              />
            </div>
          )}

          <TabsContent value="mine">{renderSlotList(mySlots, myStatuses, "mine")}</TabsContent>
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
          {renderSlotList(mySlots, myStatuses, "mine")}
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

      <MessageComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        submitting={composerSubmitting}
        onSubmit={handlePostMessage}
      />

      <MessageHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        messages={messageViews}
        onDelete={handleDeleteMessage}
      />

      <SummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        dateLabel={`${viewDateObj.getMonth() + 1}月${viewDateObj.getDate()}日`}
        peerName={peer?.name ?? "TA"}
        mine={mySummary}
        peer={peerSummary}
        mineExists={myView.exists}
        peerExists={peerView.exists}
        notes={noteEntries}
      />

      <DateJumpSheet
        open={dateJumpOpen}
        onOpenChange={setDateJumpOpen}
        viewDate={viewDate}
        todayDate={TODAY}
        minDate={MIN_DATE}
        maxDate={MAX_DATE}
        onSelectDate={(d) => setViewDate(d)}
      />
    </main>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
