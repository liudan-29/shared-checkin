// 分享图片生成封装：用html-to-image把离屏渲染的ShareCard转成PNG。
// 选html-to-image而不是html2canvas：借用浏览器真实渲染引擎(foreignObject)画，
// 对项目大量使用的CSS变量/flex布局/自定义字体保真度更好。
// 如果实测发现在某些微信内置浏览器里不work，换成html2canvas只需要改这个文件内部实现。

import { toPng } from "html-to-image";

export async function renderNodeToPng(node: HTMLElement, pixelRatio: number = 2): Promise<string> {
  // 截图前确保自定义字体已加载完成，否则canvas里文字可能落在系统回退字体上
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  return toPng(node, { pixelRatio, cacheBust: true });
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Web Share API能力检测+降级；不支持文件分享时返回false，调用方应隐藏分享按钮
export function canShareImage(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    const testFile = new File([""], "test.png", { type: "image/png" });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export async function shareImage(dataUrl: string, filename: string): Promise<boolean> {
  if (!canShareImage()) return false;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: "image/png" });
    await navigator.share({ files: [file] });
    return true;
  } catch {
    return false;
  }
}
