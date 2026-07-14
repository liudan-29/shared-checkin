"use client";

import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PlanSlot, Slot } from "@/lib/types";

export type SlotEditorTarget = "today" | "template";

export function SlotEditorSheet({
  open,
  onOpenChange,
  mode,
  target,
  initial,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  target: SlotEditorTarget;
  initial?: Slot | PlanSlot;
  onSave: (data: Omit<Slot, "id"> & { note?: string | null }) => void;
  onDelete?: () => void;
}) {
  const [task, setTask] = useState(initial?.task ?? "");
  const [startTime, setStartTime] = useState(initial?.start_time ?? "");
  const [endTime, setEndTime] = useState(initial?.end_time ?? "");
  const [note, setNote] = useState((initial as PlanSlot)?.note ?? "");
  const [taskError, setTaskError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setTask(initial?.task ?? "");
      setStartTime(initial?.start_time ?? "");
      setEndTime(initial?.end_time ?? "");
      setNote((initial as PlanSlot)?.note ?? "");
      setTaskError(false);
      setTimeError(false);
    }
  }, [open, initial]);

  function validate(): boolean {
    const taskInvalid = task.trim().length === 0;
    const timeInvalid = !startTime || !endTime || endTime <= startTime;
    setTaskError(taskInvalid);
    setTimeError(timeInvalid);
    return !taskInvalid && !timeInvalid;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      task: task.trim(),
      start_time: startTime,
      end_time: endTime,
      ...(target === "today" ? { note: note.trim() || null } : {}),
    });
    onOpenChange(false);
  }

  const deleteText =
    target === "today" ? "删了今天就没有这条了" : "删了之后的日子都没有这条了";

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>{mode === "add" ? "添加时段" : "编辑时段"}</DrawerTitle>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="task">
                任务名 <span style={{ color: "var(--color-danger)" }}>*</span>
              </Label>
              <div className="relative">
                <Input
                  id="task"
                  className="h-11 border-0 bg-secondary pr-14 text-lg"
                  maxLength={20}
                  value={task}
                  error={taskError}
                  onChange={(e) => setTask(e.target.value)}
                  onBlur={() => setTaskError(task.trim().length === 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {task.length}/20
                </span>
              </div>
              {taskError && (
                <div className="flex items-center gap-1 text-sm text-danger">
                  <CircleAlert className="h-3.5 w-3.5" />
                  任务名不能为空
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="start">开始</Label>
                <Input
                  id="start"
                  type="time"
                  step={300}
                  className="h-11 border-0 bg-secondary font-mono text-lg"
                  value={startTime}
                  error={timeError}
                  onChange={(e) => setStartTime(e.target.value)}
                  onBlur={() => setTimeError(!!startTime && !!endTime && endTime <= startTime)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="end">结束</Label>
                <Input
                  id="end"
                  type="time"
                  step={300}
                  className="h-11 border-0 bg-secondary font-mono text-lg"
                  value={endTime}
                  error={timeError}
                  onChange={(e) => setEndTime(e.target.value)}
                  onBlur={() => setTimeError(!!startTime && !!endTime && endTime <= startTime)}
                />
              </div>
            </div>
            {timeError && (
              <div className="-mt-2 flex items-center gap-1 text-sm text-danger">
                <CircleAlert className="h-3.5 w-3.5" />
                结束要晚于开始
              </div>
            )}

            {target === "today" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="note">备注（选填）</Label>
                <div className="relative">
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 40))}
                    placeholder="做了什么"
                    rows={2}
                    className="w-full resize-none rounded-md border-0 bg-secondary px-3 py-2 text-lg font-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-muted-foreground">
                    {note.length}/40
                  </span>
                </div>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3">
              <Button className="h-12 w-full" onClick={handleSave}>
                保存
              </Button>
              {mode === "edit" && onDelete && (
                <button
                  type="button"
                  className="text-center text-base text-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  删除这个时段
                </button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>{deleteText}</AlertDialogDescription>
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
