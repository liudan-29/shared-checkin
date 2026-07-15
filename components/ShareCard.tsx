"use client";

import type { CycleGoal } from "@/lib/types";
import { GoalStatusTag, type GoalStatus } from "./GoalStatusTag";
import { describeGoal } from "./GoalRow";

// 离屏截图专用卡片：只含"我自己"的数据，纯展示无交互控件。
// 关键：不能依赖body的全局背景，这个元素单独被截图库捕获，必须自己内联背景色+点阵纹理，
// 否则导出的图片背景会是透明或白色
export function ShareCard({
  weekLabel,
  myName,
  completionRatePercent,
  goals,
  reviewNote,
  generatedAtLabel,
}: {
  weekLabel: string;
  myName: string;
  completionRatePercent: number;
  goals: { goal: CycleGoal; status: GoalStatus }[];
  reviewNote: string | null;
  generatedAtLabel: string;
}) {
  return (
    <div
      style={{
        width: 360,
        backgroundColor: "var(--color-bg-primary)",
        backgroundImage:
          "radial-gradient(rgba(43, 38, 32, 0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        padding: 16,
      }}
    >
      {/* 撕票边缘：一排等距圆形缺口，颜色同外层背景，视觉上"啃掉"卡片顶边 */}
      <div style={{ position: "relative", height: 12 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "flex-start",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: "var(--color-bg-primary)",
                marginTop: -4,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: 16,
          boxShadow: "var(--shadow-lg)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--color-text-secondary)" }}>
            双人打卡
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{weekLabel}周报</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              border: "2.5px solid var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 6,
                borderRadius: 999,
                border: "1px solid var(--color-accent)",
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 40,
                  fontWeight: 600,
                  color: "var(--color-accent)",
                }}
              >
                {completionRatePercent}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--color-accent)" }}>
                %
              </span>
            </div>
          </div>
          <span style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
            {myName}·本周完成率
          </span>
        </div>

        {goals.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {goals.map(({ goal, status }) => (
              <div
                key={goal.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {describeGoal(goal)}
                </span>
                <GoalStatusTag status={status} />
              </div>
            ))}
          </div>
        )}

        {reviewNote && (
          <div
            style={{
              marginTop: 20,
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: 8,
              padding: 12,
              border: "1px dashed var(--color-border-default)",
              transform: "rotate(1deg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "var(--color-text-primary)",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {reviewNote}
            </p>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-muted)" }}>
            你的拖延，TA看得见
          </p>
          <p style={{ margin: 0, marginTop: 2, fontSize: 11, color: "var(--color-text-muted)" }}>
            生成于{generatedAtLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
