/**
 * 账号切换 UI 注入模块
 *
 * 在 CC98 顶栏的用户中心下拉菜单中注入"切换账号"入口：
 * - 利用 CC98 原有的 hover 展开/收起机制
 * - 在退出登录同级位置插入新选项
 * - hover 该选项后右侧展开子菜单显示已保存账号列表
 */
import { waitForElement, showToast } from "../../core/dom";
import { CC98, cc98Key } from "../../core/cc98";
import { Storage } from "../../core/storage";
import { loginWithAccount, saveCurrentAccount, getCurrentUserId, removeAccount, captureCurrentToken } from "./token-capture";
import { decrypt, encrypt, generateSalt } from "./encrypt";

/** 当前处于活跃状态的账号 ID，用于高亮标记 */
let activeAccountId: number | null = getCurrentUserId();

/** 根据当前页面路径选择正确的下拉菜单容器选择器 */
function getDropdownSelector(): string {
  return location.pathname === "/"
    ? CC98.SELECTORS.USER_CENTER_DROPDOWN_MAIN
    : CC98.SELECTORS.USER_CENTER_DROPDOWN;
}

/**
 * 显示弹窗背景遮罩（内部复用）
 */
function createOverlay(): { overlay: HTMLDivElement; box: HTMLDivElement; close: (value: null) => void } {
  const overlay = document.createElement("div");
  overlay.className = "cc98-dialog-overlay";
  overlay.style.cssText = `position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.4);`;

  const box = document.createElement("div");
  box.className = "cc98-dialog-box";
  box.style.cssText = `background: #fff; border-radius: 8px; padding: 24px;
    min-width: 360px; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);`;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = (value: null) => {
    document.body.removeChild(overlay);
    return value;
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(null);
  });

  return { overlay, box, close };
}

/**
 * 显示密码输入弹窗
 * @param title 弹窗标题
 * @returns 用户输入的密码，取消返回 null
 */
async function showPasswordDialog(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    const { overlay, box, close } = createOverlay();

    const heading = document.createElement("h3");
    heading.style.cssText = "margin: 0 0 16px; font-size: 16px; color: #333;";
    heading.textContent = title;

    const form = document.createElement("form");
    form.autocomplete = "off";
    form.style.cssText = "margin:0;padding:0";
    form.addEventListener("submit", (e) => e.preventDefault());

    const hiddenUsername = document.createElement("input");
    hiddenUsername.type = "text";
    hiddenUsername.autocomplete = "username";
    hiddenUsername.tabIndex = -1;
    hiddenUsername.readOnly = true;
    hiddenUsername.setAttribute("aria-hidden", "true");
    hiddenUsername.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";

    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "new-password";
    input.placeholder = "请输入主密码";
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-bwignore", "true");
    input.style.cssText = `width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9;
      border-radius: 4px; font-size: 14px; box-sizing: border-box; outline: none;`;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `padding: 6px 16px; border: 1px solid #d9d9d9;
      border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;`;

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "确认";
    confirmBtn.style.cssText = `padding: 6px 16px; border: none; border-radius: 4px;
      background: var(--cc98-primary, #1677ff); color: #fff; cursor: pointer; font-size: 14px;`;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); document.body.removeChild(overlay); resolve(input.value); }
      if (e.key === "Escape") { document.body.removeChild(overlay); resolve(null); }
    });
    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
    confirmBtn.onclick = () => { document.body.removeChild(overlay); resolve(input.value); };

    btnRow.append(cancelBtn, confirmBtn);
    form.append(hiddenUsername, input, btnRow);
    box.append(heading, form);

    // requestAnimationFrame 确保 DOM 挂载完成后才聚焦，避免焦点泄漏到搜索框
    requestAnimationFrame(() => input.focus());
  });
}

/**
 * 显示设置密码弹窗（带二次确认）
 * @param title 弹窗标题
 * @returns 两次输入一致且非空时返回密码，否则返回 null
 */
async function showPasswordSetDialog(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    const { overlay, box, close } = createOverlay();

    const heading = document.createElement("h3");
    heading.style.cssText = "margin: 0 0 16px; font-size: 16px; color: #333;";
    heading.textContent = title;

    const form = document.createElement("form");
    form.autocomplete = "off";
    form.style.cssText = "margin:0;padding:0";
    form.addEventListener("submit", (e) => e.preventDefault());

    const hiddenUsername = document.createElement("input");
    hiddenUsername.type = "text";
    hiddenUsername.autocomplete = "username";
    hiddenUsername.tabIndex = -1;
    hiddenUsername.readOnly = true;
    hiddenUsername.setAttribute("aria-hidden", "true");
    hiddenUsername.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";

    function makeInput(placeholder: string): HTMLInputElement {
      const el = document.createElement("input");
      el.type = "password";
      el.autocomplete = "new-password";
      el.placeholder = placeholder;
      el.setAttribute("data-lpignore", "true");
      el.setAttribute("data-1p-ignore", "true");
      el.setAttribute("data-bwignore", "true");
      el.style.cssText = `width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9;
        border-radius: 4px; font-size: 14px; box-sizing: border-box; outline: none;`;
      return el;
    }

    const pwdInput = makeInput("请输入主密码");
    const confirmInput = makeInput("再次输入主密码");
    const errorMsg = document.createElement("div");
    errorMsg.style.cssText = "color: #ff4d4f; font-size: 12px; margin-top: 4px; display: none;";

    const inputSpacing = document.createElement("div");
    inputSpacing.style.cssText = "height: 8px;";

    function validate(): boolean {
      if (!pwdInput.value) {
        errorMsg.textContent = "密码不能为空";
        errorMsg.style.display = "block";
        return false;
      }
      if (pwdInput.value !== confirmInput.value) {
        errorMsg.textContent = "两次输入的密码不一致";
        errorMsg.style.display = "block";
        return false;
      }
      errorMsg.style.display = "none";
      return true;
    }

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `padding: 6px 16px; border: 1px solid #d9d9d9;
      border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;`;

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "确认";
    confirmBtn.style.cssText = `padding: 6px 16px; border: none; border-radius: 4px;
      background: var(--cc98-primary, #1677ff); color: #fff; cursor: pointer; font-size: 14px;`;

    function confirm(): void {
      if (!validate()) return;
      document.body.removeChild(overlay);
      resolve(pwdInput.value);
    }

    pwdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); confirmInput.focus(); }
      if (e.key === "Escape") { document.body.removeChild(overlay); resolve(null); }
    });
    confirmInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); confirm(); }
      if (e.key === "Escape") { document.body.removeChild(overlay); resolve(null); }
    });
    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
    confirmBtn.onclick = confirm;

    btnRow.append(cancelBtn, confirmBtn);
    form.append(hiddenUsername, pwdInput, inputSpacing, confirmInput, errorMsg, btnRow);
    box.append(heading, form);
    requestAnimationFrame(() => pwdInput.focus());
  });
}

/**
 * 修改主密码流程：验证旧密码 → 设置新密码 → 重新加密所有账号
 */
async function showChangePasswordFlow(): Promise<void> {
  const accounts = (await Storage.getAccounts()) ?? [];
  if (accounts.length === 0) {
    showToast("没有已保存的账号");
    return;
  }

  const oldPassword = await showPasswordDialog("输入当前主密码");
  if (!oldPassword) return;

  const salt = await Storage.getMasterSalt();
  if (!salt) return;

  // 验证旧密码是否有任一账号能解密
  let verified = false;
  for (const acc of accounts) {
    try {
      await decrypt(acc.encryptedData.iv, acc.encryptedData.ciphertext, oldPassword, salt);
      verified = true;
      break;
    } catch { /* try next */ }
  }
  if (!verified) {
    showToast("密码错误");
    return;
  }

  const newPassword = await showPasswordSetDialog("设置新主密码");
  if (!newPassword) return;

  // 生成新盐值，重新加密所有账号
  const newSalt = await generateSalt();
  const reEncrypted = [];
  for (const acc of accounts) {
    const json = await decrypt(acc.encryptedData.iv, acc.encryptedData.ciphertext, oldPassword, salt);
    const { iv, ciphertext } = await encrypt(json, newPassword, newSalt);
    reEncrypted.push({
      ...acc,
      encryptedData: { salt: newSalt, iv, ciphertext },
    });
  }

  await Storage.setMasterSalt(newSalt);
  await Storage.setAccounts(reEncrypted);
  showToast("主密码已修改");
}

/**
 * 显示账号选择弹窗（密码已验证）
 * 用户选择一个账号完成切换，底部提供"添加当前账号"和"修改主密码"选项
 */
async function showAccountPicker(accounts: import("../../types").AccountData[], password: string): Promise<number | null> {
  return new Promise((resolve) => {
    const { overlay, box, close } = createOverlay();

    const heading = document.createElement("h3");
    heading.style.cssText = "margin: 0 0 12px; font-size: 16px; color: #333;";
    heading.textContent = "选择要切换的账号";

    const list = document.createElement("div");
    list.style.cssText = "max-height: 240px; overflow-y: auto;";

    let selectedIdx = -1;
  const allRows: HTMLElement[] = [];

  for (const account of accounts) {
      const row = document.createElement("div");
      row.style.cssText = `padding: 8px 12px; cursor: pointer; font-size: 14px;
        border-radius: 4px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #f5f5f5;`;
      if (account.userId === activeAccountId) {
        row.style.background = "var(--cc98-primary-bg, #f0f5ff)";
        row.style.fontWeight = "bold";
      }

      const label = document.createElement("span");
      label.textContent = account.label;

      row.append(label);
      row.addEventListener("click", async () => {
        document.body.removeChild(overlay);
        const ok = await loginWithAccount(account, password);
        if (ok) location.replace(location.href);
        else showToast("密码错误");
        resolve(account.userId);
      });
      list.appendChild(row);
      allRows.push(row);
    }

    // 底部操作栏（不可键盘选择）
    const actionRow = document.createElement("div");
    actionRow.style.cssText = `display: flex; border-top: 1px solid #e8e8e8;
      margin-top: 4px; text-align: center; font-size: 14px;`;
    const saveBtn = document.createElement("div");
    saveBtn.style.cssText = `flex: 1; padding: 8px 12px; cursor: pointer;
      color: var(--cc98-primary, #1677ff); border-right: 1px solid #e8e8e8;`;
    saveBtn.textContent = "保存当前账号";
    saveBtn.addEventListener("click", async () => {
      document.body.removeChild(overlay);
      promptSaveAccount();
      resolve(null);
    });
    const changePwdBtn = document.createElement("div");
    changePwdBtn.style.cssText = `flex: 1; padding: 8px 12px; cursor: pointer; color: #999;`;
    changePwdBtn.textContent = "修改密码";
    changePwdBtn.addEventListener("click", async () => {
      document.body.removeChild(overlay);
      showChangePasswordFlow();
      resolve(null);
    });
    actionRow.append(saveBtn, changePwdBtn);
    list.appendChild(actionRow);

    // 键盘导航（仅账号列表，不包含底部操作栏）
    function highlightPickerRow(idx: number): void {
      allRows.forEach((r) => r.style.removeProperty("background"));
      if (idx >= 0 && idx < allRows.length) {
        allRows[idx].style.background = "var(--cc98-primary-bg, #eef0f7)";
        allRows[idx].scrollIntoView({ block: "nearest" });
      }
    }

    function confirmPickerRow(idx: number): void {
      if (idx < 0 || idx >= allRows.length) return;
      document.body.removeChild(overlay);
      loginWithAccount(accounts[idx], password).then((ok) => {
        if (ok) location.replace(location.href);
        else showToast("密码错误");
        resolve(accounts[idx].userId);
      });
    }

    // capture 阶段拦截键盘事件，避免被 CC98 jQuery 或 React 抢先消费
    const pickerKeydown = (e: KeyboardEvent) => {
      if (!document.body.contains(overlay)) {
        document.removeEventListener("keydown", pickerKeydown, { capture: true });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.min(selectedIdx + 1, allRows.length - 1);
        highlightPickerRow(selectedIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        highlightPickerRow(selectedIdx);
      } else if (e.key === "Enter" && selectedIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        confirmPickerRow(selectedIdx);
      }
    };
    document.addEventListener("keydown", pickerKeydown, { capture: true });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `padding: 6px 16px; border: 1px solid #d9d9d9;
      border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;
      margin-top: 12px;`;

    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };

    box.append(heading, list, cancelBtn);

    // 自动高亮第一行，方便键盘导航
    if (allRows.length > 0) {
      selectedIdx = 0;
      highlightPickerRow(0);
    }
  });
}

/** 弹出保存当前账号的提示（用于首次检测到新账号时） */
async function promptSaveAccount(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  const accounts = (await Storage.getAccounts()) ?? [];
  if (accounts.some((a) => a.userId === userId)) return;

  const existingSalt = await Storage.getMasterSalt();
  let password: string | null;

  if (existingSalt) {
    password = await showPasswordDialog("保存此账号到切换列表？");
  } else {
    password = await showPasswordSetDialog("设置主密码以保存账号");
  }

  if (!password) return;

  const userInfo = JSON.parse(localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO)?.slice(4) ?? "{}");
  const ok = await saveCurrentAccount(password);
  if (ok) {
    showToast(`账号 ${userInfo.name ?? ""} 已保存`);
    renderSwitcherMenu();
  } else {
    showToast("保存失败，请重试");
  }
}

/** 渲染/刷新账号切换菜单 */
async function renderSwitcherMenu(): Promise<void> {
  const container = await waitForElement(getDropdownSelector(), 5000);
  if (!container) return;

  const existing = container.querySelector(".cc98-account-entry");
  if (existing) existing.remove();

  const accounts = (await Storage.getAccounts()) ?? [];

  const entryLi = document.createElement("li");
  entryLi.className = "cc98-account-entry";
  entryLi.style.cssText = "cursor: pointer; white-space: nowrap;";

  const textSpan = document.createElement("span");
  textSpan.textContent = "切换账号";
  entryLi.appendChild(textSpan);

  // 显示账号数量小标签（仅在有账号时）
  if (accounts.length > 0) {
    const badge = document.createElement("span");
    badge.textContent = `(${accounts.length})`;
    badge.style.cssText = "color: #999; font-size: 11px; margin-left: 4px;";
    entryLi.appendChild(badge);
  }

  // 用 mousedown（早于 click）拦截事件，避免事件穿透到 CC98 的 jQuery 处理器
  entryLi.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    setTimeout(async () => {
      if (accounts.length === 0) {
        promptSaveAccount();
        return;
      }

      const password = await showPasswordDialog("输入主密码切换账号");
      if (!password) return;

      await refreshCurrentAccount(password, accounts);
      const freshAccounts = (await Storage.getAccounts()) ?? [];
      showAccountPicker(freshAccounts, password);
    }, 0);
  });

  const ul = container.querySelector("ul");
  if (ul) {
    ul.appendChild(entryLi);
  }
}

/** 刷新当前账号数据：合并 use-theme → localStorage userInfo → 重新加密保存 */
async function refreshCurrentAccount(password: string, accounts: import("../../types").AccountData[]): Promise<void> {
  function persistDebug(partial: Record<string, unknown>): void {
    try {
      const chain = JSON.parse(localStorage.getItem("cc98-live-better:debug-chain") || '[]');
      chain.push({ step: 'refresh', ts: Date.now(), ...partial });
      localStorage.setItem("cc98-live-better:debug-chain", JSON.stringify(chain));
    } catch {}
  }

  const salt = await Storage.getMasterSalt();
  const hasToken = !!captureCurrentToken();
  const uid = getCurrentUserId();
  persistDebug({ salt: !!salt, hasToken, uid, accountsCount: accounts.length });
  if (!salt || !hasToken) return;

  const saved = accounts.find((a) => a.userId === uid);
  persistDebug({ foundSaved: !!saved });
  if (!saved) return;

  let valid = false;
  try {
    await decrypt(saved.encryptedData.iv, saved.encryptedData.ciphertext, password, salt);
    valid = true;
  } catch { /* ignore */ }
  persistDebug({ passwordValid: valid });
  if (!valid) return;

  const useThemeVal = localStorage.getItem(cc98Key("use-theme"));
  const themeNum = useThemeVal ? parseInt(useThemeVal.slice(4), 10) : NaN;
  let mergedTheme: number | null = null;
  if (!isNaN(themeNum)) {
    const raw = localStorage.getItem(cc98Key("userInfo"));
    if (raw) {
      try {
        const info = JSON.parse(raw.slice(4));
        mergedTheme = info.theme;
        info.theme = themeNum;
        localStorage.setItem(cc98Key("userInfo"), `obj-${JSON.stringify(info)}`);
        persistDebug({ useTheme: useThemeVal, fromTheme: mergedTheme, toTheme: themeNum });
      } catch (e) {
        persistDebug({ mergeError: String(e) });
      }
    }
  } else {
    persistDebug({ useThemeRaw: useThemeVal, parseResult: 'NaN' });
  }

  await saveCurrentAccount(password);
  persistDebug({ saveDone: true });
}

/** 初始化账号切换 UI 并持续监听 DOM 变化 */
export async function initAccountSwitcher(): Promise<void> {
  await renderSwitcherMenu();

  // 监控页面主体变化，处理两种情况：
  // 1. 用户身份变化（跨标签页登录/登出）
  // 2. React 重新渲染导致我们注入的元素被移除
  const bodyObserver = new MutationObserver(() => {
    const currentId = getCurrentUserId();
    if (currentId !== activeAccountId) {
      activeAccountId = currentId;
      renderSwitcherMenu();
      return;
    }
    // 如果元素被 React re-render 移除，重新注入
    const container = document.querySelector(getDropdownSelector());
    if (container && !container.querySelector(".cc98-account-entry")) {
      renderSwitcherMenu();
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

/** 从外部触发切换账号流程（Alt+C 快捷键用） */
export async function openAccountSwitcher(): Promise<void> {
  const accounts = (await Storage.getAccounts()) ?? [];
  if (accounts.length === 0) {
    const salt = await Storage.getMasterSalt();
    if (!salt) {
      await promptSaveAccount();
    } else {
      showToast("没有已保存的账号");
    }
    return;
  }
  const password = await showPasswordDialog("输入主密码切换账号");
  if (!password) return;
  await refreshCurrentAccount(password, accounts);
  const freshAccounts = (await Storage.getAccounts()) ?? [];
  await showAccountPicker(freshAccounts, password);
}

export { promptSaveAccount, showPasswordDialog, showPasswordSetDialog, showChangePasswordFlow };
