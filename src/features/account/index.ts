/**
 * 多账号切换功能入口
 * 集合初始化、localStorage 监听、UI 注入
 */
import { injectCSS, showToast } from "../../core/dom";
import { Storage } from "../../core/storage";
import { onLocalStorageChange, getCurrentUserId, captureCurrentToken, saveCurrentAccount } from "./token-capture";
import { initAccountSwitcher, showPasswordDialog } from "./switcher-ui";

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
    localStorage.getItem("userInfo")?.slice(4) ?? "{}"
  );
  const userName: string = userInfo.name ?? `用户${userId}`;

  if (salt) {
    // 已有主密码，只是这个账号没保存过
    showToast(`检测到新账号 ${userName}，点击"切换账号"可保存`);
    return;
  }

  // 首次使用：引导设置主密码并保存当前账号
  const password = await showPasswordDialog(
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

/** 初始化账号功能：注入 UI + 启动 localStorage 监听 */
export async function initAccountFeature(): Promise<void> {
  const LOG = "[CC98 Live Better v1.0.0-beta.1]";

  injectCSS(STYLES);

  if (captureCurrentToken()) {
    console.log(`${LOG} account: logged in as user #${getCurrentUserId()}`);
    await initAccountSwitcher();
    await handleNewLogin();
  } else {
    console.log(`${LOG} account: not logged in`);
  }

  onLocalStorageChange(async (userInfo) => {
    if (userInfo) {
      await initAccountSwitcher();
      await handleNewLogin();
    }
  });
}
