"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export type MessageView = {
  id: string;
  content: string;
  authorLabel: string;
  isMine: boolean;
};

const MIN_DURATION = 6000;
const MAX_DURATION = 12000;
const MIN_GAP = 8000;
const MAX_GAP = 18000;
const FIRST_DELAY_MIN = 1500;
const FIRST_DELAY_MAX = 4000;
const REDUCED_HOLD = 4500;

function computeDuration(charCount: number): number {
  return Math.min(MAX_DURATION, MIN_DURATION + Math.max(0, charCount - 10) * 150);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function MessageBoard({
  messages,
  loading,
  onWriteClick,
}: {
  messages: MessageView[];
  loading: boolean;
  onWriteClick: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState<MessageView | null>(null);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [style, setStyle] = useState<React.CSSProperties>({});

  const lastIdRef = useRef<string | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedRef = useRef<MessageView | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadDoneRef = useRef(false);
  const messagesRef = useRef<MessageView[]>(messages);
  messagesRef.current = messages;

  function pickNext(): MessageView | null {
    const list = messagesRef.current;
    if (list.length === 0) return null;
    if (queuedRef.current) {
      const q = queuedRef.current;
      queuedRef.current = null;
      return q;
    }
    if (list.length === 1) return list[0];
    let pick: MessageView;
    do {
      pick = list[Math.floor(Math.random() * list.length)];
    } while (pick.id === lastIdRef.current);
    return pick;
  }

  function playNext() {
    const next = pickNext();
    if (!next) return;
    lastIdRef.current = next.id;
    setDirection(Math.random() < 0.5 ? "ltr" : "rtl");
    setCurrent(next);
  }

  // 首次出现：数据加载完成、有内容时，短延迟后播第一条。
  // 不返回cleanup——如果在等待期间messages.length又变化一次(比如收到新留言)，
  // 依赖数组变化会触发React自动执行上一次的cleanup，把这个还没触发的定时器清掉，
  // 但firstLoadDoneRef此时已经是true，effect主体会直接return不再重新调度，
  // 导致轮播永远启动不了。定时器句柄改存进只在真正卸载时才清理的firstPlayTimerRef。
  useEffect(() => {
    if (loading || messages.length === 0 || firstLoadDoneRef.current) return;
    firstLoadDoneRef.current = true;
    messages.forEach((m) => seenIdsRef.current.add(m.id));
    firstPlayTimerRef.current = setTimeout(playNext, randomBetween(FIRST_DELAY_MIN, FIRST_DELAY_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只想在"首次有数据"这一刻触发一次
  }, [loading, messages.length]);

  // 监听新发布的留言：不打断正在播放的动画，若处于间隔期则跳过剩余等待立即插播
  useEffect(() => {
    if (!firstLoadDoneRef.current) return;
    const newOnes = messages.filter((m) => !seenIdsRef.current.has(m.id));
    if (newOnes.length === 0) return;
    messages.forEach((m) => seenIdsRef.current.add(m.id));
    queuedRef.current = newOnes[0];
    if (!current && gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
      playNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // current变化：算好动画/降级参数，注册播完后的收尾
  useEffect(() => {
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    if (!current) return;

    if (reducedMotion) {
      setStyle({ position: "static", opacity: 0, transition: "opacity 250ms linear" });
      const t1 = setTimeout(() => setStyle((s) => ({ ...s, opacity: 1 })), 20);
      const t2 = setTimeout(
        () => setStyle((s) => ({ ...s, opacity: 0, transition: "opacity 150ms linear" })),
        250 + REDUCED_HOLD
      );
      playTimerRef.current = setTimeout(() => {
        setCurrent(null);
        gapTimerRef.current = setTimeout(playNext, randomBetween(MIN_GAP, MAX_GAP));
      }, 250 + REDUCED_HOLD + 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const duration = computeDuration(current.content.length);
    const containerWidth = trackRef.current?.offsetWidth ?? 300;

    setStyle({ position: "absolute", top: "50%", opacity: 0, transform: "translate(0, -50%)" });

    const raf = requestAnimationFrame(() => {
      const textWidth = textRef.current?.offsetWidth ?? 100;
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

    playTimerRef.current = setTimeout(() => {
      setCurrent(null);
      gapTimerRef.current = setTimeout(playNext, randomBetween(MIN_GAP, MAX_GAP));
    }, duration);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, reducedMotion]);

  useEffect(() => {
    return () => {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (firstPlayTimerRef.current) clearTimeout(firstPlayTimerRef.current);
    };
  }, []);

  return (
    <div
      className="relative flex h-16 items-center rounded-lg bg-card px-4 shadow-sm"
      style={{ borderTop: "1px dashed var(--color-border-default)", borderBottom: "1px dashed var(--color-border-default)" }}
    >
      <div ref={trackRef} className="relative h-full flex-1 overflow-hidden">
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
        {!loading && messages.length > 0 && current && (
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
              {current.authorLabel.slice(0, 1)}
            </span>
            <span className="font-display text-lg text-foreground">{current.content}</span>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onWriteClick}
        aria-label="写一句留言"
        className="ml-2 shrink-0"
      >
        <PenLine className="h-[18px] w-[18px]" />
      </Button>
    </div>
  );
}
