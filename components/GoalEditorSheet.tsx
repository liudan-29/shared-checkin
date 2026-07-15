"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CycleGoal, NewCycleGoal } from "@/lib/types";

type GoalKind = CycleGoal["kind"];

export function GoalEditorSheet({
  open,
  onOpenChange,
  mode,
  initial,
  availableTasks,
  onSave,
  onDelete,
  onGoToTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: CycleGoal;
  availableTasks: string[];
  onSave: (goal: NewCycleGoal) => void;
  onDelete?: () => void;
  onGoToTemplate: () => void;
}) {
  const [kind, setKind] = useState<GoalKind>(initial?.kind ?? "overall_rate");
  const [targetRate, setTargetRate] = useState(
    initial?.kind === "overall_rate" ? String(initial.target_rate) : ""
  );
  const [taskLabel, setTaskLabel] = useState(
    initial?.kind === "task_target" ? initial.task_label : ""
  );
  const [rateError, setRateError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setKind(initial?.kind ?? "overall_rate");
      setTargetRate(initial?.kind === "overall_rate" ? String(initial.target_rate) : "");
      setTaskLabel(initial?.kind === "task_target" ? initial.task_label : "");
      setRateError(false);
    }
  }, [open, initial]);

  function validateRate(): boolean {
    const n = Number(targetRate);
    const invalid = !targetRate || !Number.isInteger(n) || n < 1 || n > 100;
    setRateError(invalid);
    return !invalid;
  }

  function handleSave() {
    if (kind === "overall_rate") {
      if (!validateRate()) return;
      onSave({ kind: "overall_rate", target_rate: Number(targetRate) });
    } else {
      if (!taskLabel) return;
      onSave({ kind: "task_target", task_label: taskLabel, target_type: "all" });
    }
    onOpenChange(false);
  }

  const saveDisabled =
    kind === "task_target" && (availableTasks.length === 0 || !taskLabel);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>{mode === "add" ? "添加目标" : "编辑目标"}</DrawerTitle>
          <div className="mt-4 flex flex-col gap-4">
            <Tabs value={kind} onValueChange={(v) => setKind(v as GoalKind)}>
              <TabsList className="w-full">
                <TabsTrigger value="overall_rate">整体完成率</TabsTrigger>
                <TabsTrigger value="task_target">具体任务</TabsTrigger>
              </TabsList>
            </Tabs>

            {kind === "overall_rate" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-rate">目标完成率</Label>
                <div className="relative">
                  <Input
                    id="target-rate"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    className="h-11 border-0 bg-secondary pr-10 font-mono text-lg"
                    value={targetRate}
                    error={rateError}
                    onChange={(e) => setTargetRate(e.target.value)}
                    onBlur={validateRate}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                {rateError && (
                  <div className="flex items-center gap-1 text-sm text-danger">
                    <CircleAlert className="h-3.5 w-3.5" />
                    填一个1到100的整数
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>选择任务</Label>
                {availableTasks.length === 0 ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm text-muted-foreground">还没有模板任务</p>
                    <Button variant="secondary" size="sm" onClick={onGoToTemplate}>
                      去编辑模板
                    </Button>
                  </div>
                ) : (
                  <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {availableTasks.map((t) => {
                      const selected = t === taskLabel;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTaskLabel(t)}
                          className={cnRow(selected)}
                        >
                          <span className="truncate">{t}</span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-ink" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">达成条件：这周排的每一次都要完成</p>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3">
              <Button className="h-12 w-full" onClick={handleSave} disabled={saveDisabled}>
                保存
              </Button>
              {mode === "edit" && onDelete && (
                <button
                  type="button"
                  className="text-center text-base text-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  删除这个目标
                </button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>删除后本周就没有这条目标了</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger-hover"
              onClick={() => {
                setConfirmDelete(false);
                onOpenChange(false);
                onDelete?.();
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function cnRow(selected: boolean): string {
  const base =
    "flex h-11 w-full items-center justify-between rounded-md bg-secondary px-3 text-left text-base text-foreground transition-colors duration-fast";
  return selected ? `${base} ring-2 ring-ink` : base;
}
