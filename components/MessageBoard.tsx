"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, PenLine, History, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export type MessageView = {
  id: string;
  content: string;
  authorLabel: string;
  isMine: boolean;
  createdAt: string;
};

const LANE_COUNT = 2;
const LANE_HEIGHT = 40;
const PADDING_Y = 16; // 对应容器的py-2（上下各8px），折叠/展开的高度计算要把这份padding算进去
const COLLAPSED_CONTENT_HEIGHT = 40; // 折叠态只留一个图标按钮高度的内容区

const MIN_DURATION = 6000;
const MAX_DURATION = 12000;
const SPAWN_MIN = 2000;
const SPAWN_MAX = 4500;
const FIRST_DELAY_MIN = 1500;
const FIRST_DELAY_MAX = 4000;
const REDUCED_HOLD = 4500;

function computeDuration(charCount: number): number {
  return Math.min(MAX_DURATION, MIN_DURATION + Math.max(0, charCount - 10) * 150);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// 单条轨道：负责一条留言从出现到消失的完整生命周期，播完/停留完调用onDone让父组件释放这条轨道。
// 用message.id做key，每次分配新留言时这个组件会被整个重新挂载，effect天然只跑一次不用操心状态复用。
function FloatingLane({
  message,
  reducedMotion,
  containerWidth,
  onDone,
}: {
  message: MessageView;
  reducedMotion: boolean;
  containerWidth: number;
  onDone: () => void;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const directionRef = useRef<"ltr" | "rtl">(Math.random() < 0.5 ? "ltr" : "rtl");

  useEffect(() => {
    if (reducedMotion) {
      setStyle({ position: "static", opacity: 0, transition: "opacity 250ms linear" });
      const t1 = setTimeout(() => setStyle((s) => ({ ...s, opacity: 1 })), 20);
      const t2 = setTimeout(
        () => setStyle((s) => ({ ...s, opacity: 0, transition: "opacity 150ms linear" })),
        250 + REDUCED_HOLD
      );
      const t3 = setTimeout(onDone, 250 + REDUCED_HOLD + 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    const duration = computeDuration(message.content.length);
    setStyle({ position: "absolute", top: "50%", opacity: 0, transform: "translate(0, -50%)" });

    const raf = requestAnimationFrame(() => {
      const textWidth = textRef.current?.offsetWidth ?? 100;
      const direction = directionRef.current;
      const startX = direction === "ltr" ? -textWidth : containerWidth;
      const endX = direction === "ltr" ? containerWidth : -textWidth;
      setStyle({
        position: "absolute",
        top: "50%",
        left: 0,
        opacity: 0,
        ["--float-start-x" as string]: `${startX}px`,
        ["--float-end-x" as string]: `${endX}px`,
        animation: `float-message ${duration}ms linear forwards`,
      });
    });

    const t = setTimeout(onDone, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 这条轨道整个生命周期只对应一条message(靠外层key保证)，只需要跑一次
  }, []);

  return (
    <div
      ref={textRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="inline-flex items-center gap-2 whitespace-nowrap"
      style={style}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink"
      >
        {message.authorLabel.slice(0, 1)}
      </span>
      <span className="font-display text-lg text-foreground">{message.content}</span>
    </div>
  );
}

export function MessageBoard({
  messages,
  loading,
  onWriteClick,
  onOpenHistory,
}: {
  messages: MessageView[];
  loading: boolean;
  onWriteClick: () => void;
  onOpenHistory: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [lanes, setLanes] = useState<(MessageView | null)[]>(() => Array(LANE_COUNT).fill(null));
  const [collapsed, setCollapsed] = useState(false);

  const lastIdRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadDoneRef = useRef(false);
  const queueRef = useRef<MessageView[]>([]);
  const messagesRef = useRef<MessageView[]>(messages);
  messagesRef.current = messages;
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  useEffect(() => {
    if (trackRef.current) setContainerWidth(trackRef.current.offsetWidth);
  }, []);

  // 折叠时track的DOM节点会被卸载，展开时是全新节点，容器宽度可能在折叠期间变过
  // （比如用户转了手机方向），重新展开时补测一次，避免飘动起止点按过期宽度计算
  useEffect(() => {
    if (!collapsed && trackRef.current) setContainerWidth(trackRef.current.offsetWidth);
  }, [collapsed]);

  // 从候选池里挑一条不在excludeIds(当前正在飘的留言)里的消息，避免同一句话同时出现在两条轨道。
  // 队列里的消息如果全都已经在飘，或者全部留言都已经在飘（比如总共只有1条），返回null——
  // 宁可这一轮不派发，也不重复播放同一条内容，等某条轨道空出来后自然会被再次选中。
  function pickNext(excludeIds: Set<string>): MessageView | null {
    if (queueRef.current.length > 0) {
      const idx = queueRef.current.findIndex((m) => !excludeIds.has(m.id));
      if (idx === -1) return null;
      return queueRef.current.splice(idx, 1)[0];
    }
    const candidates = messagesRef.current.filter((m) => !excludeIds.has(m.id));
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    let pick: MessageView;
    let attempts = 0;
    do {
      pick = candidates[Math.floor(Math.random() * candidates.length)];
      attempts++;
    } while (pick.id === lastIdRef.current && attempts < 10);
    return pick;
  }

  // 找空闲轨道、算排除集合、写入三步全部放进setLanes的函数式更新里，对同一份最新state原子完成——
  // 避免"两处派发逻辑各自读一次旧state再分别写"造成的竞态（后写覆盖先写，导致一条消息被跳过）。
  function trySpawnInto() {
    if (collapsedRef.current) return; // 折叠时不渲染轨道，派进去也没有FloatingLane去释放它，白白占位
    setLanes((prev) => {
      const freeIndex = prev.findIndex((l) => l === null);
      if (freeIndex === -1) return prev;
      const excludeIds = new Set(
        prev.filter((l): l is MessageView => l !== null).map((l) => l.id)
      );
      const next = pickNext(excludeIds);
      if (!next) return prev;
      lastIdRef.current = next.id;
      const copy = [...prev];
      copy[freeIndex] = next;
      return copy;
    });
  }

  // 持续尝试：每隔一小段随机时间检查有没有空闲轨道，有就派一条新留言进去。
  // 不再有"播完等一大段空白"的间隔，只要有内容、有空轨道，很快就会有新留言飘入，
  // 两条轨道让多条留言可能同时在飘，接近"持续有内容"的观感。
  function scheduleSpawnAttempt() {
    spawnTimerRef.current = setTimeout(() => {
      if (messagesRef.current.length > 0) trySpawnInto();
      scheduleSpawnAttempt();
    }, randomBetween(SPAWN_MIN, SPAWN_MAX));
  }

  // 首次：数据加载完成、有内容时，短延迟后播第一条并开始持续调度
  useEffect(() => {
    if (loading || messages.length === 0 || firstLoadDoneRef.current) return;
    firstLoadDoneRef.current = true;
    messages.forEach((m) => seenIdsRef.current.add(m.id));
    firstPlayTimerRef.current = setTimeout(() => {
      trySpawnInto();
      scheduleSpawnAttempt();
    }, randomBetween(FIRST_DELAY_MIN, FIRST_DELAY_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只想在"首次有数据"这一刻触发一次，不返回cleanup避免被后续messages变化误清（同一个坑之前踩过一次）
  }, [loading, messages.length]);

  // 新发布的留言：加入优先队列，若此刻有空闲轨道立即派发，不等下一轮调度
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    const newOnes = messages.filter((m) => !seenIdsRef.current.has(m.id));
    if (newOnes.length === 0) return;
    messages.forEach((m) => seenIdsRef.current.add(m.id));
    queueRef.current.push(...newOnes);
    trySpawnInto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      if (firstPlayTimerRef.current) clearTimeout(firstPlayTimerRef.current);
    };
  }, []);

  function handleLaneDone(laneIndex: number) {
    setLanes((prev) => {
      const copy = [...prev];
      copy[laneIndex] = null;
      return copy;
    });
  }

  // 折叠时track连同里面的FloatingLane一起卸载，正在飘的留言不会触发onDone，
  // 不主动清空的话那条轨道会永久占着(再也等不到onDone)、调度器找不到空闲轨道可派。
  // 折叠这一刻直接把两条轨道都清空，交给后台调度器重新填，不需要保留"折叠前飘到哪了"这份状态。
  function handleCollapse() {
    setCollapsed(true);
    setLanes(Array(LANE_COUNT).fill(null));
  }

  const trackHeight = LANE_COUNT * LANE_HEIGHT;
  const boardHeight = collapsed ? COLLAPSED_CONTENT_HEIGHT + PADDING_Y : trackHeight + PADDING_Y;

  return (
    <div
      className="relative flex items-center justify-between overflow-hidden rounded-lg bg-card px-4 py-2 shadow-sm transition-all duration-normal ease-default"
      style={{
        height: boardHeight,
        borderTop: "1px dashed var(--color-border-default)",
        borderBottom: "1px dashed var(--color-border-default)",
      }}
    >
      {collapsed ? (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          留言板
        </span>
      ) : (
        <div
          ref={trackRef}
          className="relative flex-1 overflow-hidden"
          style={{ height: trackHeight }}
        >
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-5 w-40" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex h-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              还没有人留言，点右边写第一句
            </div>
          )}
          {!loading &&
            messages.length > 0 &&
            lanes.map((msg, i) => (
              <div
                key={i}
                className="absolute inset-x-0 overflow-hidden"
                style={{ top: i * LANE_HEIGHT, height: LANE_HEIGHT }}
              >
                {msg && (
                  <FloatingLane
                    key={msg.id}
                    message={msg}
                    reducedMotion={reducedMotion}
                    containerWidth={containerWidth}
                    onDone={() => handleLaneDone(i)}
                  />
                )}
              </div>
            ))}
        </div>
      )}

      <div className="ml-2 flex shrink-0 items-center gap-1">
        {!collapsed && (
          <>
            <Button variant="ghost" size="icon" onClick={onOpenHistory} aria-label="查看全部留言">
              <History className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onWriteClick} aria-label="写一句留言">
              <PenLine className="h-[18px] w-[18px]" />
            </Button>
          </>
        )}
        {/* 折叠/展开用同一个Button元素，只切换图标和文案——两个状态下如果各渲染一个独立的
            按钮，点击后React会卸载旧按钮挂载新按钮，键盘/屏幕阅读器的焦点会跟丢 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={collapsed ? () => setCollapsed(false) : handleCollapse}
          aria-label={collapsed ? "展开留言板" : "收起留言板"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronDown className="h-[18px] w-[18px]" />
          ) : (
            <ChevronUp className="h-[18px] w-[18px]" />
          )}
        </Button>
      </div>
    </div>
  );
}
