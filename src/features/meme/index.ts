/**
 * 表情包收藏功能入口
 * 提供初始化和消息处理
 */
import { showToast } from "../../core/dom";
import { initMemeObserver } from "./gallery-ui";
import { addMeme } from "./storage";

/** 初始化表情包功能（启动编辑器检测 observer） */
export function initMemeFeature(): void {
  const LOG = "[CC98 Live Better v1.0.0-beta.1]";
  initMemeObserver();
  console.log(`${LOG} meme: observer started`);
}

/** 处理来自 background 的消息：收藏指定 URL 的图片，并向用户反馈结果 */
export async function handleSaveMemeMessage(url: string): Promise<void> {
  const result = await addMeme({ url });

  switch (result.status) {
    case "added":
      showToast("已收藏到表情包");
      break;
    case "duplicate":
      showToast("该图片已在表情包中");
      break;
    case "error":
      showToast(`收藏失败：${result.error ?? "未知错误"}`);
      break;
  }
}
