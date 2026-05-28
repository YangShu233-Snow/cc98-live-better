/**
 * 多账号切换功能入口
 * 集合初始化、localStorage 监听、UI 注入
 */
import { injectCSS, showToast } from "../../core/dom";
import { cc98Key } from "../../core/cc98";
import { Storage } from "../../core/storage";
import { onLocalStorageChange, getCurrentUserId, captureCurrentToken, saveCurrentAccount } from "./token-capture";
import { initAccountSwitcher, showPasswordDialog, showPasswordSetDialog } from "./switcher-ui";

const LOG = "[CC98 Live Better v1.0.0-beta.1]";

/** 账号功能相关的额外样式 */
const STYLES = `
.cc98-account-entry:hover > .cc98-account-dropdown {
  display: block !important;
}

.cc98-dialog-box input:focus {
  border-color: var(--cc98-primary, #1677ff) !important;
}
`;

/** 检测是否有一个新账号登录，尝试引导用户保存 */
async function handleNewLogin(): Promise<void> {
  if (!captureCurrentToken()) return;

  const accounts = (await Storage.getAccounts()) ?? [];
  const userId = getCurrentUserId();
  if (!userId) return;
  if (accounts.some((a) => a.userId === userId)) return;

  const salt = await Storage.getMasterSalt();
  const userInfo = JSON.parse(
    localStorage.getItem(cc98Key("userInfo"))?.slice(4) ?? "{}"
  );
  const userName: string = userInfo.name ?? `用户${userId}`;

  if (salt) {
    showToast(`检测到新账号 ${userName}，点击"切换账号"可保存`);
    return;
  }
  const password = await showPasswordSetDialog(
    `检测到账号 ${userName}，设置主密码以启用多账号切换`
  );
  if (!password) return;

  const ok = await saveCurrentAccount(password);
  if (ok) {
    showToast(`账号 ${userName} 已保存`);
    await initAccountSwitcher();
  } else {
    showToast("保存失败，请稍后重试");
  }
}

/** 注册 Alt+C 快捷键（内容脚本层面的回退方案） */
function installKeyboardShortcut(): void {
  document.addEventListener("keydown", async (e) => {
    if (e.altKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      e.stopPropagation();
      const { openAccountSwitcher } = await import("./switcher-ui");
      openAccountSwitcher();
    }
  }, { capture: true });
}

/** 初始化账号功能：注入 UI + 启动 localStorage 监听 */
export async function initAccountFeature(): Promise<void> {
  injectCSS(STYLES);

  if (captureCurrentToken()) {
    console.log(`${LOG} account: logged in as user #${getCurrentUserId()}`);
    await initAccountSwitcher();
    await handleNewLogin();
  } else {
    console.log(`${LOG} account: not logged in`);
  }

  installKeyboardShortcut();
  console.log(`${LOG} account: Alt+C shortcut installed`);

  // 跨重载调试日志
  const debugRaw = localStorage.getItem("cc98-live-better:debug-theme");
  if (debugRaw) {
    try {
      const debug = JSON.parse(debugRaw);
      console.log(`${LOG}[theme] post-reload:`, debug);
    } catch {}
    localStorage.removeItem("cc98-live-better:debug-theme");
  }
  const chainRaw = localStorage.getItem("cc98-live-better:debug-chain");
  if (chainRaw) {
    try {
      const chain = JSON.parse(chainRaw);
      console.log(`${LOG}[theme] debug-chain (${chain.length} entries):`);
      chain.forEach((e, i) => console.log(`${LOG}[theme]   [${i}]`, e));
    } catch {}
    localStorage.removeItem("cc98-live-better:debug-chain");
  }

  onLocalStorageChange(async (userInfo) => {
    if (userInfo) {
      await initAccountSwitcher();
      await handleNewLogin();
    }
  });
}
