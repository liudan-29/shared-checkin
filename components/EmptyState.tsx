import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyStateMine({
  onAdd,
  onEditTemplate,
}: {
  onAdd: () => void;
  onEditTemplate: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <CalendarX2 className="h-12 w-12 text-muted-foreground" />
      <p className="text-base text-secondary-foreground text-muted-foreground">
        今天还没有安排
      </p>
      <div className="flex gap-3">
        <Button size="sm" onClick={onAdd}>
          添加一个时段
        </Button>
        <Button size="sm" variant="secondary" onClick={onEditTemplate}>
          去编辑模板
        </Button>
      </div>
    </div>
  );
}

export function EmptyStatePeer() {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <CalendarX2 className="h-12 w-12 text-muted-foreground" />
      <p className="text-base text-muted-foreground">TA今天还没安排时段</p>
    </div>
  );
}

export function EmptyStateTemplate() {
  return (
    <p className="py-8 text-center text-base text-muted-foreground">
      这份模板还是空的
    </p>
  );
}
