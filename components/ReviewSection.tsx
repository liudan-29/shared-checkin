"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MAX_LEN = 300;

export function ReviewSection({
  myNote,
  onMyNoteChange,
  onSave,
  saving,
  peerName,
  peerNote,
}: {
  myNote: string;
  onMyNoteChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  peerName: string;
  peerNote: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">我的复盘</span>
        <div className="relative">
          <Textarea
            rows={4}
            maxLength={MAX_LEN}
            placeholder="这周过得怎么样"
            value={myNote}
            onChange={(e) => onMyNoteChange(e.target.value.slice(0, MAX_LEN))}
            className="pb-6"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-muted-foreground">
            {myNote.length}/{MAX_LEN}
          </span>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={onSave} loading={saving} loadingText="保存中…">
            保存复盘
          </Button>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{peerName}的复盘</span>
        <div
          className="whitespace-pre-wrap rounded-md p-3 text-base text-foreground"
          style={{ backgroundColor: "var(--color-bg-tertiary)" }}
        >
          {peerNote ? peerNote : <span className="text-muted-foreground">{peerName}还没写复盘</span>}
        </div>
      </div>
    </div>
  );
}
