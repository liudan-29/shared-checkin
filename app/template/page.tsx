"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/use-session";
import { fetchTemplate, upsertTemplate } from "@/lib/templates";
import type { DayType, Slot } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateSlotRow } from "@/components/TemplateSlotRow";
import { AddSlotRow } from "@/components/AddSlotRow";
import { EmptyStateTemplate } from "@/components/EmptyState";
import { SlotEditorSheet } from "@/components/SlotEditorSheet";

export default function TemplatePage() {
  const router = useRouter();
  const { session, user, loading: sessionLoading } = useSession();

  const [dayType, setDayType] = useState<DayType>("weekday");
  const [slotsByType, setSlotsByType] = useState<Record<DayType, Slot[]>>({
    weekday: [],
    weekend: [],
  });
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ open: boolean; slot?: Slot }>({ open: false });

  useEffect(() => {
    if (!sessionLoading && !session) router.replace("/login");
  }, [sessionLoading, session, router]);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [weekday, weekend] = await Promise.all([
      fetchTemplate(user.id, "weekday"),
      fetchTemplate(user.id, "weekend"),
    ]);
    setSlotsByType({
      weekday: weekday?.slots ?? [],
      weekend: weekend?.slots ?? [],
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadTemplates();
  }, [user, loadTemplates]);

  async function persist(nextSlots: Slot[]) {
    if (!user) return;
    const prev = slotsByType;
    const sorted = [...nextSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    setSlotsByType((s) => ({ ...s, [dayType]: sorted }));
    try {
      await upsertTemplate(user.id, dayType, sorted);
      toast.success("已保存");
    } catch {
      setSlotsByType(prev);
      toast.error("保存没同步上");
    }
  }

  function handleSave(data: Omit<Slot, "id">) {
    const current = slotsByType[dayType];
    if (editor.slot) {
      persist(current.map((s) => (s.id === editor.slot!.id ? { ...s, ...data } : s)));
    } else {
      persist([...current, { id: crypto.randomUUID(), ...data }]);
    }
  }

  function handleDelete() {
    if (!editor.slot) return;
    persist(slotsByType[dayType].filter((s) => s.id !== editor.slot!.id));
  }

  const slots = slotsByType[dayType];

  return (
    <main className="mx-auto max-w-[560px] px-4 py-6 pb-16">
      <div className="flex h-14 items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="返回"
          className="flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg text-foreground">我的模板</h1>
      </div>

      <Tabs value={dayType} onValueChange={(v) => setDayType(v as DayType)}>
        <TabsList className="w-full">
          <TabsTrigger value="weekday">工作日</TabsTrigger>
          <TabsTrigger value="weekend">周末</TabsTrigger>
        </TabsList>

        <p className="mt-3 text-sm text-muted-foreground">
          改模板影响之后的日子，今天的安排回首页改
        </p>

        <TabsContent value="weekday">
          {loading ? (
            <TemplateSkeleton />
          ) : (
            <TemplateList
              slots={slots}
              onEdit={(slot) => setEditor({ open: true, slot })}
              onAdd={() => setEditor({ open: true })}
            />
          )}
        </TabsContent>
        <TabsContent value="weekend">
          {loading ? (
            <TemplateSkeleton />
          ) : (
            <TemplateList
              slots={slots}
              onEdit={(slot) => setEditor({ open: true, slot })}
              onAdd={() => setEditor({ open: true })}
            />
          )}
        </TabsContent>
      </Tabs>

      <SlotEditorSheet
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        mode={editor.slot ? "edit" : "add"}
        target="template"
        initial={editor.slot}
        onSave={handleSave}
        onDelete={editor.slot ? handleDelete : undefined}
      />
    </main>
  );
}

function TemplateList({
  slots,
  onEdit,
  onAdd,
}: {
  slots: Slot[];
  onEdit: (slot: Slot) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      {slots.length === 0 ? (
        <EmptyStateTemplate />
      ) : (
        slots.map((slot) => (
          <TemplateSlotRow key={slot.id} slot={slot} onClick={() => onEdit(slot)} />
        ))
      )}
      <AddSlotRow onClick={onAdd} />
    </div>
  );
}

function TemplateSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
