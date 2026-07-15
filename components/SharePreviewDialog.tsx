"use client";

import { Download, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function SharePreviewDialog({
  open,
  onOpenChange,
  imageDataUrl,
  onDownload,
  onShare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageDataUrl: string | null;
  onDownload: () => void;
  onShare?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 客户端生成的data URL，next/image的优化管线不适用
          <img
            src={imageDataUrl}
            alt="本周分享图"
            className="mx-auto max-w-full rounded-lg shadow-md"
          />
        ) : (
          <Skeleton className="mx-auto h-[480px] w-[360px]" />
        )}
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="secondary" onClick={onDownload} disabled={!imageDataUrl}>
            <Download className="mr-2 h-4 w-4" />
            下载
          </Button>
          {onShare && (
            <Button onClick={onShare} disabled={!imageDataUrl}>
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
