"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/use-session";
import { fetchProfiles } from "@/lib/profiles";
import { fetchTemplate } from "@/lib/templates";
import { fetchDaySlotsForDate } from "@/lib/day-plan";
import { fetchWeeklyReview, saveWeeklyGoals, saveWeeklyReviewNote } from "@/lib/weekly-reviews";
import { getTodayDateString } from "@/lib/slot-status";
import { getDateMode } from "@/lib/preview-plan";
import {
  getWeekStart,
  getWeekEnd,
  getWeekDates,
  addWeeks,
  getWeekMode,
  formatWeekRangeLabel,
} from "@/lib/week";
import {
  computeWeekSummary,
  getWeekDayOutcomes,
  resolveGoalOutcome,
  type WeekDayInput,
} from "@/lib/week-summary";
import { renderNodeToPng, downloadImage, canShareImage, shareImage } from "@/lib/share-image";
import type { CycleGoal, NewCycleGoal, Profile } from "@/lib/types";
import { WeekTicket } from "@/components/WeekTicket";
import { GoalRow } from "@/components/GoalRow";
import { GoalEditorSheet } from "@/components/GoalEditorSheet";
import { AddSlotRow } from "@/components/AddSlotRow";
import { WeeklyCompareTable } from "@/components/WeeklyCompareTable";
import { ReviewSection } from "@/components/ReviewSection";
import { ShareCard } from "@/components/ShareCard";
import { SharePreviewDialog } from "@/components/SharePreviewDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const TODAY = getTodayDateString();

export default function WeeklyPage() {
  const router = useRouter();
  const { session, user, loading: sessionLoading } = useSession();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(TODAY));
  const [myDays, setMyDays] = useState<WeekDayInput[]>([]);
  const [peerDays, setPeerDays] = useState<WeekDayInput[]>([]);
  const [myGoals, setMyGoals] = useState<CycleGoal[]>([]);
  const [peerGoals, setPeerGoals] = useState<CycleGoal[]>([]);
  const [myNote, setMyNote] = useState("");
  const [peerNote, setPeerNote] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; goal?: CycleGoal }>({ open: false });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const me = useMemo(() => profiles.find((p) => p.id === user?.id) ?? null, [profiles, user]);
  const peer = useMemo(() => profiles.find((p) => p.id !== user?.id) ?? null, [profiles, user]);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekMode = getWeekMode(weekStart, TODAY);
  const weekRangeLabel = formatWeekRangeLabel(weekStart, TODAY);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace("/login");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    setShareSupported(canShareImage());
  }, []);

  const loadSideDays = useCallback(async (uid: string, dates: string[]): Promise<WeekDayInput[]> => {
    return Promise.all(
      dates.map(async (date) => {
        const dm = getDateMode(date, TODAY);
        const mode = dm === "today" ? "current" : dm;
        const res = await fetchDaySlotsForDate(uid, date, mode);
        return { date, slots: res.slots, mode };
      })
    );
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const profileList = await fetchProfiles();
    setProfiles(profileList);
    const peerProfile = profileList.find((p) => p.id !== user.id);

    const dates = getWeekDates(weekStart);
    const mine = await loadSideDays(user.id, dates);
    setMyDays(mine);

    if (peerProfile) {
      const theirs = await loadSideDays(peerProfile.id, dates);
      setPeerDays(theirs);
    } else {
      setPeerDays([]);
    }

    const myReview = await fetchWeeklyReview(user.id, weekStart);
    setMyGoals(myReview?.goals ?? []);
    setMyNote(myReview?.review_note ?? "");

    if (peerProfile) {
      const peerReview = await fetchWeeklyReview(peerProfile.id, weekStart);
      setPeerGoals(peerReview?.goals ?? []);
      setPeerNote(peerReview?.review_note ?? null);
    } else {
      setPeerGoals([]);
      setPeerNote(null);
    }

    const [weekdayTpl, weekendTpl] = await Promise.all([
      fetchTemplate(user.id, "weekday"),
      fetchTemplate(user.id, "weekend"),
    ]);
    const taskNames = Array.from(
      new Set([...(weekdayTpl?.slots ?? []), ...(weekendTpl?.slots ?? [])].map((s) => s.task))
    );
    setAvailableTasks(taskNames);

    setDataLoading(false);
  }, [user, weekStart, loadSideDays]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick只用来触发每分钟重算，无需读取
  const now = useMemo(() => new Date(), [tick]);

  const mySummary = useMemo(
    () => computeWeekSummary(weekStart, weekEnd, myDays, myGoals, TODAY, now),
    [weekStart, weekEnd, myDays, myGoals, now]
  );
  const peerSummary = useMemo(
    () => computeWeekSummary(weekStart, weekEnd, peerDays, peerGoals, TODAY, now),
    [weekStart, weekEnd, peerDays, peerGoals, now]
  );
  const weekDayOutcomes = useMemo(() => getWeekDayOutcomes(myDays), [myDays]);

  const myGoalRecaps = myGoals.map((goal) => ({
    goal,
    status: resolveGoalOutcome(mySummary, goal).status,
  }));
  const peerGoalRecaps = peerGoals.map((goal) => ({
    goal,
    status: resolveGoalOutcome(peerSummary, goal).status,
  }));

  async function persistGoals(nextGoals: CycleGoal[], successMsg: string, failMsg: string) {
    if (!user) return;
    const prev = myGoals;
    setMyGoals(nextGoals);
    try {
      await saveWeeklyGoals(user.id, weekStart, nextGoals);
      toast.success(successMsg);
    } catch {
      setMyGoals(prev);
      toast.error(failMsg);
    }
  }

  function handleSaveGoal(data: NewCycleGoal) {
    let updated: CycleGoal[];
    if (editor.goal) {
      updated = myGoals.map((g) => (g.id === editor.goal!.id ? ({ id: g.id, ...data } as CycleGoal) : g));
    } else {
      updated = [...myGoals, { id: crypto.randomUUID(), ...data } as CycleGoal];
    }
    persistGoals(updated, "已保存", "保存没同步上");
  }

  function handleDeleteGoal() {
    if (!editor.goal) return;
    const updated = myGoals.filter((g) => g.id !== editor.goal!.id);
    persistGoals(updated, "已删除", "删除没同步上");
  }

  async function handleSaveNote() {
    if (!user) return;
    setSavingNote(true);
    try {
      await saveWeeklyReviewNote(user.id, weekStart, myNote.trim() || null);
      toast.success("已保存复盘");
    } catch {
      toast.error("保存没同步上");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleGenerateShare() {
    setShareOpen(true);
    setShareImageUrl(null);
    try {
      // 等一帧让ShareCard先渲染出最新数据，再截图
      await new Promise((r) => setTimeout(r, 50));
      if (!shareCardRef.current) throw new Error("no ref");
      const dataUrl = await renderNodeToPng(shareCardRef.current, 2);
      setShareImageUrl(dataUrl);
    } catch {
      toast.error("生成图片失败，再试一次");
      setShareOpen(false);
    }
  }

  if (sessionLoading || dataLoading) {
    return (
      <main className="mx-auto max-w-[560px] px-4 py-6">
        <Skeleton className="h-32 w-full" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </main>
    );
  }

  const shareGoals = myGoals.map((goal) => ({
    goal,
    status: resolveGoalOutcome(mySummary, goal).status,
  }));

  return (
    <main className="mx-auto max-w-[560px] px-4 py-6 pb-16">
      <WeekTicket
        weekRangeLabel={weekRangeLabel}
        mode={weekMode}
        weekDayOutcomes={weekDayOutcomes}
        doneCount={mySummary.doneSlots}
        totalCount={mySummary.totalSlots}
        onBack={() => router.push("/")}
        onPrev={() => setWeekStart((w) => addWeeks(w, -1))}
        onNext={() => setWeekStart((w) => addWeeks(w, 1))}
        onJumpCurrentWeek={() => setWeekStart(getWeekStart(TODAY))}
      />

      <div className="mt-6">
        <h2 className="font-display text-xl text-foreground">目标</h2>
        <p className="mt-1 text-sm text-muted-foreground">我的目标</p>
        <div className="mt-2 space-y-2">
          {myGoals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              status={resolveGoalOutcome(mySummary, goal).status}
              progressText={resolveGoalOutcome(mySummary, goal).progressText}
              variant="editable"
              onClick={() => setEditor({ open: true, goal })}
            />
          ))}
          <AddSlotRow label="＋ 添加目标" onClick={() => setEditor({ open: true })} />
        </div>

        {peer && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">{peer.name}的目标</p>
            <div className="mt-2 space-y-2">
              {peerGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{peer.name}还没设本周目标</p>
              ) : (
                peerGoals.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    status={resolveGoalOutcome(peerSummary, goal).status}
                    progressText={resolveGoalOutcome(peerSummary, goal).progressText}
                    variant="readonly"
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {weekMode === "future" ? (
        <p className="mt-8 py-8 text-center text-base text-muted-foreground">
          这周还没开始，数据和复盘等这周开始后再看
        </p>
      ) : (
        <>
          <div className="mt-8">
            <h2 className="font-display text-xl text-foreground">周报对比</h2>
            <div className="mt-2">
              <WeeklyCompareTable
                peerName={peer?.name ?? "TA"}
                mine={mySummary}
                peer={peerSummary}
                mineExists={myDays.some((d) => d.slots.length > 0)}
                peerExists={peerDays.some((d) => d.slots.length > 0)}
                myGoalRecaps={myGoalRecaps}
                peerGoalRecaps={peerGoalRecaps}
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl text-foreground">复盘</h2>
            <div className="mt-2">
              <ReviewSection
                myNote={myNote}
                onMyNoteChange={setMyNote}
                onSave={handleSaveNote}
                saving={savingNote}
                peerName={peer?.name ?? "TA"}
                peerNote={peerNote}
              />
            </div>
          </div>

          <div className="mt-8">
            <Button className="h-12 w-full" onClick={handleGenerateShare}>
              生成我的分享图
            </Button>
          </div>
        </>
      )}

      <GoalEditorSheet
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        mode={editor.goal ? "edit" : "add"}
        initial={editor.goal}
        availableTasks={availableTasks}
        onSave={handleSaveGoal}
        onDelete={editor.goal ? handleDeleteGoal : undefined}
        onGoToTemplate={() => router.push("/template")}
      />

      <SharePreviewDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        imageDataUrl={shareImageUrl}
        onDownload={() => shareImageUrl && downloadImage(shareImageUrl, `双人打卡-${weekRangeLabel}.png`)}
        onShare={
          shareSupported
            ? () => shareImageUrl && shareImage(shareImageUrl, `双人打卡-${weekRangeLabel}.png`)
            : undefined
        }
      />

      {/* 离屏渲染，供截图库捕获，不对用户可见 */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }}>
        <div ref={shareCardRef}>
          <ShareCard
            weekLabel={weekRangeLabel}
            myName={me?.name ?? "我"}
            completionRatePercent={Math.round(mySummary.completionRate * 100)}
            goals={shareGoals}
            reviewNote={myNote.trim() || null}
            generatedAtLabel={`${new Date().getMonth() + 1}月${new Date().getDate()}日`}
          />
        </div>
      </div>
    </main>
  );
}
