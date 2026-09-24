"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";
import { fetchMyGroupContext } from "@/lib/groups";
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
import { MemberOverviewCard } from "@/components/MemberOverviewCard";
import { MemberOverviewBar } from "@/components/MemberOverviewBar";
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
import { ShareNoteToBoardDialog } from "@/components/ShareNoteToBoardDialog";
import { fetchRecentMessages, postMessage, subscribeNewMessages, deleteMessage } from "@/lib/messages";
import type { NoteEntry } from "@/components/SummaryNotesList";
import type { SummaryMember } from "@/components/SummaryCompareTable";

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
  const [groupId, setGroupId] = useState<string | null>(null);
  const [notInGroup, setNotInGroup] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(TODAY);
  const [memberViews, setMemberViews] = useState<Record<string, SideView>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [activeMemberId, setActiveMemberId] = useState("");
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
  const [shareNote, setShareNote] = useState<{ open: boolean; content: string }>({
    open: false,
    content: "",
  });
  const [shareNoteSubmitting, setShareNoteSubmitting] = useState(false);

  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const members = useMemo(() => {
    if (!user) return profiles;
    const me = profiles.find((profile) => profile.id === user.id);
    return me ? [me, ...profiles.filter((profile) => profile.id !== user.id)] : profiles;
  }, [profiles, user]);
  const me = members.find((profile) => profile.id === user?.id) ?? null;
  const myView = user ? memberViews[user.id] ?? EMPTY_VIEW : EMPTY_VIEW;
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
    async (gid: string, uid: string, date: string, mode: DateMode, writable: boolean): Promise<SideView> => {
      if (mode === "today" && writable) {
        const plan = await ensureDayPlan(gid, uid, date, dayTypeOf(parseDateString(date)));
        return { slots: plan.slots, exists: true, planId: plan.id };
      }
      return fetchDaySlotsForDate(gid, uid, date, mode === "today" ? "current" : mode);
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setDataError(null);
    setNotInGroup(false);
    try {
      const context = await fetchMyGroupContext(user.id);
      if (!context) {
        setGroupId(null);
        setProfiles([]);
        setMemberViews({});
        setNotInGroup(true);
        return;
      }
      setNotInGroup(false);
      setGroupId(context.group.id);
      setProfiles(context.members);
      setActiveMemberId((current) =>
        context.members.some((profile) => profile.id === current) ? current : user.id
      );

      const mode = getDateMode(viewDate, TODAY);
      const entries = await Promise.all(
        context.members.map(async (profile) => [
          profile.id,
          await loadSide(context.group.id, profile.id, viewDate, mode, profile.id === user.id),
        ] as const)
      );
      setMemberViews(Object.fromEntries(entries));
    } catch {
      setDataError("小组数据没有加载成功，请检查网络后重试");
    } finally {
      setDataLoading(false);
    }
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
    if (!user || !groupId || !isToday) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`day_plans_${TODAY}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const updated = payload.new as DayPlan;
          if (updated.group_id !== groupId) return;
          setMemberViews((current) => ({
            ...current,
            [updated.user_id]: { slots: updated.slots, exists: true, planId: updated.id },
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "day_plans", filter: `date=eq.${TODAY}` },
        (payload) => {
          const inserted = payload.new as DayPlan;
          if (inserted.group_id !== groupId) return;
          setMemberViews((current) => ({
            ...current,
            [inserted.user_id]: { slots: inserted.slots, exists: true, planId: inserted.id },
          }));
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
  }, [user, groupId, isToday]);

  // 留言板：跟viewDate/dateMode完全无关，固定加载，不随翻看历史/未来变化
  useEffect(() => {
    if (!user || !groupId) return;
    let cancelled = false;
    setMessagesLoading(true);
    fetchRecentMessages(groupId)
      .then((data) => {
        if (!cancelled) setRawMessages(data);
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, groupId]);

  useEffect(() => {
    if (!user || !groupId) return;
    return subscribeNewMessages(groupId, (msg) => {
      // 自己发的留言会先被本地乐观更新加进去，Realtime广播会给发送者自己也推一份，
      // 这里按id去重，避免同一条留言在列表里出现两次
      setRawMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev].slice(0, 20)));
    });
  }, [user, groupId]);

  const messageViews: MessageView[] = useMemo(
    () =>
      rawMessages.map((m) => ({
        id: m.id,
        content: m.content,
        authorLabel:
          user && m.sender_id === user.id
            ? "我"
            : members.find((profile) => profile.id === m.sender_id)?.name ?? "成员",
        isMine: user ? m.sender_id === user.id : false,
        createdAt: m.created_at,
      })),
    [rawMessages, user, members]
  );

  async function handlePostMessage(content: string) {
    if (!user || !groupId) return;
    setComposerSubmitting(true);
    try {
      const created = await postMessage(groupId, user.id, content);
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

  // 打卡或编辑时段时写了产出记录（note），保存成功后问一句要不要顺手发到留言板。
  // 打卡当下和之后用SlotEditorSheet补录/修改都会触发，只要note非空
  function offerShareNote(note: string | null | undefined) {
    const trimmed = note?.trim();
    if (trimmed) setShareNote({ open: true, content: trimmed });
  }

  async function handleConfirmShareNote() {
    if (!user || !groupId) return;
    setShareNoteSubmitting(true);
    try {
      const created = await postMessage(groupId, user.id, shareNote.content);
      setRawMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [created, ...prev].slice(0, 20)));
      setShareNote({ open: false, content: "" });
      toast.success("已发布到留言板");
    } catch {
      toast.error("发布没同步上", { action: { label: "重试", onClick: handleConfirmShareNote } });
    } finally {
      setShareNoteSubmitting(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick 只用来触发每分钟重算，无需读取
  const now = useMemo(() => new Date(), [tick]);

  // 乐观写入当天 slots（只允许今天；planId非空不代表可写——过去日期若曾打过卡也会有planId，
  // 这里不靠UI没做入口这一层防护，显式拦截isToday）
  async function persistMySlots(
    nextSlots: PlanSlot[],
    successMsg?: string,
    onFail?: () => void,
    onSuccess?: () => void
  ) {
    if (!isToday || !myView.planId) return;
    const prev = myView;
    if (!user) return;
    setMemberViews((current) => ({ ...current, [user.id]: { ...myView, slots: nextSlots } }));
    try {
      await saveDayPlanSlots(myView.planId, nextSlots);
      if (successMsg) toast.success(successMsg);
      onSuccess?.();
    } catch {
      setMemberViews((current) => ({ ...current, [user.id]: prev }));
      onFail?.();
    }
  }

  async function handleCheck(slot: PlanSlot, note: string | null = null) {
    if (!user || !isToday || !myView.planId) return;
    setCheckingSlotId(slot.id);
    const updatedSlots = myView.slots.map((s) =>
      s.id === slot.id ? { ...s, done: true, checked_at: new Date().toISOString(), note } : s
    );
    const prev = myView;
    setMemberViews((current) => ({ ...current, [user.id]: { ...myView, slots: updatedSlots } }));
    try {
      await saveDayPlanSlots(myView.planId, updatedSlots);
      toast.success(`已打卡·${new Date().toTimeString().slice(0, 5)}`);
      offerShareNote(note);
    } catch {
      setMemberViews((current) => ({ ...current, [user.id]: prev }));
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
    // 保存前先记下编辑前的note，只有note真的变了才在成功后问要不要分享——
    // 否则光是改了时间/任务名这种跟note无关的编辑，也会拿同一条没变化的note重复打扰
    const prevNote = editor.slot ? (editor.slot as PlanSlot).note : null;
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
    await persistMySlots(
      updatedSlots,
      "已保存",
      () => toast.error("保存没同步上"),
      () => {
        if ((data.note ?? null) !== prevNote) offerShareNote(data.note);
      }
    );
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
      <main className="mx-auto max-w-[1360px] px-4 py-6">
        <Skeleton className="h-32 w-full" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    );
  }

  if (notInGroup) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-4 py-12">
        <div className="w-full rounded-lg bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-subtle font-display text-ink">组</div>
          <h1 className="mt-4 font-display text-xl text-foreground">还没加入打卡小组</h1>
          <p className="mt-2 text-base text-muted-foreground">账号已经登录，但管理员还没有把你加入三人小组。</p>
          <button type="button" onClick={handleLogout} className="mt-5 h-11 rounded-md bg-primary px-5 text-primary-foreground transition-colors hover:bg-ink-hover">退出登录</button>
        </div>
      </main>
    );
  }

  if (dataError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-4 py-12">
        <div className="w-full rounded-lg bg-card p-6 text-center shadow-sm">
          <WifiOff className="mx-auto h-10 w-10 text-danger" />
          <h1 className="mt-4 font-display text-xl text-foreground">小组数据没连上</h1>
          <p className="mt-2 text-base text-muted-foreground">{dataError}</p>
          <button type="button" onClick={() => loadData()} className="mt-5 h-11 rounded-md bg-primary px-5 text-primary-foreground transition-colors hover:bg-ink-hover">
            重新加载
          </button>
        </div>
      </main>
    );
  }

  const summaryMode = dateMode === "today" ? "current" : dateMode === "past" ? "past" : "future";
  const memberStates = members.map((profile) => {
    const view = memberViews[profile.id] ?? EMPTY_VIEW;
    const statuses = view.slots.map((slot) => getSlotStatusForDate(slot, now, dateMode));
    const overdueSlot = view.slots.find((slot, index) => statuses[index] === "overdue");
    return {
      profile,
      view,
      statuses,
      overdueText: overdueSlot ? formatOverdue(getOverdueMinutes(overdueSlot, now)) : null,
      inProgressTask: view.slots.find((slot, index) => statuses[index] === "in-progress")?.task ?? null,
      summary: computeDaySummary(view.slots, now, summaryMode),
    };
  });
  const myState = memberStates.find((state) => state.profile.id === user?.id);
  const mySlots = myState?.view.slots ?? [];
  const myStatuses = myState?.statuses ?? [];
  const doneCount = mySlots.filter((s) => s.done).length;
  const summaryMembers: SummaryMember[] = memberStates.map((state) => ({
    id: state.profile.id,
    name: state.profile.name,
    summary: state.summary,
    exists: state.view.exists,
    isMine: state.profile.id === user?.id,
  }));
  const noteEntries: NoteEntry[] = memberStates
    .flatMap((state) =>
      state.view.slots
        .filter((slot) => slot.done && slot.note?.trim())
        .map((slot) => ({
          who: state.profile.id === user?.id ? "我" : state.profile.name,
          time: fmt(slot.checked_at),
          task: slot.task,
          note: slot.note!.trim(),
        }))
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const cardMode = dateMode === "today" ? "live" : dateMode === "past" ? "readonly" : "preview";

  function renderSlotList(
    memberId: string,
    slots: PlanSlot[],
    statuses: ReturnType<typeof getSlotStatus>[],
    variant: "mine" | "peer"
  ) {
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
              onCheck={variant === "mine" && memberId === user?.id ? () => setCheckinDialog({ open: true, slot }) : undefined}
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
    <main className="mx-auto max-w-[1360px] px-4 py-6 pb-16">
      <div className="min-[1200px]:grid min-[1200px]:grid-cols-[328px_minmax(0,1fr)] min-[1200px]:gap-6">
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
          onLogout={handleLogout}
          prevDisabled={viewDate <= MIN_DATE}
          nextDisabled={viewDate >= MAX_DATE}
        />

        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-2 min-[1200px]:mt-0 min-[1200px]:grid-cols-3">
          {memberStates.map((state) => (
            <MemberOverviewCard
              key={state.profile.id}
              name={state.profile.name}
              isMine={state.profile.id === user?.id}
              statuses={state.statuses}
              doneCount={state.view.slots.filter((slot) => slot.done).length}
              totalCount={state.view.slots.length}
              overdueText={state.overdueText}
              inProgressTask={state.inProgressTask}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - memberStates.length) }).map((_, index) => (
            <div key={`empty-overview-${index}`} className="flex min-h-[156px] items-center justify-center rounded-lg border border-dashed border-border bg-card p-4 text-center text-base text-muted-foreground">
              等待第三位成员加入
            </div>
          ))}
        </div>
      </div>

      {!connected && isToday && (
        <div
          className="mt-3 flex h-9 items-center gap-2 rounded-md px-3 text-sm"
          style={{ backgroundColor: "var(--color-warning-subtle)", color: "var(--color-warning)" }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          连接断了，正在重连…
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 md:hidden">
        {memberStates.map((state) => (
          <MemberOverviewBar
            key={state.profile.id}
            name={state.profile.id === user?.id ? "我" : state.profile.name}
            statuses={state.statuses}
            overdueText={state.overdueText}
            inProgressTask={state.inProgressTask}
            selected={activeMemberId === state.profile.id}
            onClick={() => setActiveMemberId(state.profile.id)}
          />
        ))}
        {memberStates.length < 3 && (
          <div className="flex min-h-14 items-center justify-center rounded-md border border-dashed border-border bg-card px-4 text-base text-muted-foreground">
            还差{3 - memberStates.length}位成员加入
          </div>
        )}
      </div>

      {/* 留言板：固定存在，不随viewDate/dateMode/tab切换而变化或消失 */}
      <div className="mt-4">
        <MessageBoard
          messages={messageViews}
          loading={messagesLoading}
          onWriteClick={() => setComposerOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </div>

      {/* 移动端：三位成员分段切换 */}
      <div className="mt-4 md:hidden">
        <Tabs value={activeMemberId || user?.id || ""} onValueChange={setActiveMemberId}>
          <TabsList className="grid w-full grid-cols-3">
            {memberStates.map((state) => (
              <TabsTrigger key={state.profile.id} value={state.profile.id} className="min-h-11 min-w-0">
                <span className="truncate">{state.profile.id === user?.id ? "我" : state.profile.name}</span>
                {state.overdueText && <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
              </TabsTrigger>
            ))}
          </TabsList>
          {memberStates.map((state) => (
            <TabsContent key={state.profile.id} value={state.profile.id}>
              {renderSlotList(
                state.profile.id,
                state.view.slots,
                state.statuses,
                state.profile.id === user?.id ? "mine" : "peer"
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 桌面端：中屏两列、大屏三列 */}
      <div className="mt-6 hidden gap-6 md:grid md:grid-cols-2 min-[1200px]:grid-cols-3">
        {memberStates.map((state) => {
          const isMine = state.profile.id === user?.id;
          return (
            <div key={state.profile.id} className="min-w-0">
              <div className="mb-3 flex h-9 items-center gap-2 border-b border-dashed border-border pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
                  {isMine ? "我" : state.profile.name.slice(0, 1)}
                </span>
                <span className="truncate text-base text-foreground">{isMine ? me?.name ?? "我" : state.profile.name}</span>
                <span className="ml-auto font-mono text-sm text-muted-foreground">
                  {state.view.slots.filter((slot) => slot.done).length}/{state.view.slots.length}
                </span>
              </div>
              {renderSlotList(state.profile.id, state.view.slots, state.statuses, isMine ? "mine" : "peer")}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 3 - memberStates.length) }).map((_, index) => (
          <div key={`empty-member-${index}`} className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-base text-muted-foreground">
            还差一位成员加入
          </div>
        ))}
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

      <ShareNoteToBoardDialog
        open={shareNote.open}
        onOpenChange={(open) => setShareNote((s) => ({ ...s, open }))}
        note={shareNote.content}
        submitting={shareNoteSubmitting}
        onConfirm={handleConfirmShareNote}
      />

      <SummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        dateLabel={`${viewDateObj.getMonth() + 1}月${viewDateObj.getDate()}日`}
        members={summaryMembers}
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
