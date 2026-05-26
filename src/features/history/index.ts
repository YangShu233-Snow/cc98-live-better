/**
 * 历史记录功能入口
 */
import { initHistoryTracker } from "./tracker";
import { initSearchOverlay } from "./search-ui";

/** 初始化历史记录功能（跟踪 + 搜索增强） */
export function initHistoryFeature(): void {
  const LOG = "[CC98 Live Better v1.0.0-beta.1]";
  initHistoryTracker();
  initSearchOverlay();
  console.log(`${LOG} history: tracker + search overlay started`);
}
