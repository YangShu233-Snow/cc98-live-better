/**
 * Service Worker 入口（后台脚本）
 * 负责注册浏览器级功能：右键菜单、快捷键
 */
import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import { Storage } from "../core/storage";

const LOG = "[CC98 Live Better v1.0.0-beta.1]";
const MENU_ID = "save-as-meme";

async function updateContextMenu() {
  const settings = await Storage.getFeatureSettings();
  const enabled = settings?.memeGallery ?? true;

  await browser.contextMenus.remove(MENU_ID).catch(() => {});
  if (enabled) {
    browser.contextMenus.create({
      id: MENU_ID,
      title: "收藏到 CC98 表情包",
      contexts: ["image"],
      documentUrlPatterns: ["*://www.cc98.org/*"],
    });
  }
}

export default defineBackground({
  main() {
    console.log(`${LOG} service worker started`);

    updateContextMenu();
    console.log(`${LOG} context menu updated`);

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "local:cc98-live-better:features" in changes) {
        updateContextMenu();
      }
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === MENU_ID && info.srcUrl) {
        console.log(`${LOG} save-meme clicked:`, info.srcUrl.slice(0, 80));
        browser.tabs.sendMessage(tab?.id ?? 0, {
          type: "save-meme",
          url: info.srcUrl,
        }).catch(() => {});
      }
    });

    browser.commands.onCommand.addListener((command) => {
      if (command === "open-account-switcher") {
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          const tab = tabs[0];
          if (tab?.id && tab.url?.includes("cc98.org")) {
            browser.tabs.sendMessage(tab.id, { type: "open-account-switcher" }).catch(() => {});
          }
        });
      }
    });
    console.log(`${LOG} commands listener registered`);
  },
});
