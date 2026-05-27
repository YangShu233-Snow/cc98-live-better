/**
 * 内容脚本入口
 * 注入到 CC98 页面中，根据用户设置初始化功能
 */
import { defineContentScript } from "wxt/utils/define-content-script";
import { browser } from "wxt/browser";
import { Storage } from "../core/storage";
import { injectThemeCSS } from "../core/theme";
import { initAccountFeature } from "../features/account";
import { initMemeFeature, handleSaveMemeMessage } from "../features/meme";
import { initPMInjection } from "../features/meme/pm-gallery-ui";
import { initHistoryFeature } from "../features/history";

const LOG = "[CC98 Live Better v1.0.0-beta.1]";

export default defineContentScript({
  /** 仅在 CC98 域名下运行 */
  matches: ["*://www.cc98.org/*"],
  /** DOM 就绪后执行，不等待图片加载 */
  runAt: "document_end",
  async main() {
    console.log(`${LOG} content script injected`);

    // 注入主题色 CSS 变量，确保后续 UI 使用 CC98 当前主题色
    injectThemeCSS();

    // 读取用户设置，按需初始化功能
    const featureSettings = (await Storage.getFeatureSettings()) ?? {
      accountSwitcher: true, memeGallery: true, pmEmojiPanel: true, historySearch: true,
    };

    if (featureSettings.accountSwitcher) initAccountFeature();
    if (featureSettings.memeGallery) initMemeFeature();
    if (featureSettings.pmEmojiPanel) initPMInjection();
    if (featureSettings.historySearch) initHistoryFeature();

    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === "save-meme" && typeof msg.url === "string") {
        handleSaveMemeMessage(msg.url);
      }
      if (msg.type === "open-account-switcher") {
        import("../features/account/switcher-ui").then((m) => m.openAccountSwitcher());
      }
    });
  },
});
