/**
 * 账号 token 捕获与切换核心逻辑
 *
 * CC98 使用 OIDC IdentityServer4 认证，token 存储在 localStorage：
 * - refresh_token：有效期 30 天，用于静默续期 access_token
 * - access_token：短期有效（~1h），页面加载时自动用 refresh_token 换取
 * - userInfo：用户资料 JSON（带 str- 前缀存储）
 *
 * 切换账号时只需注入目标账号的 refresh_token + userInfo，
 * 页面自动换取新的 access_token
 */
import { CC98 } from "../../core/cc98";
import { Storage } from "../../core/storage";
import { encrypt, generateSalt } from "./encrypt";
import { decrypt } from "./encrypt";
import type { AccountData, AccountToken } from "../../types";

/** 从当前页面的 localStorage 中读取 token 数据 */
export function captureCurrentToken(): AccountToken | null {
  const refreshToken = localStorage.getItem(CC98.STORAGE_KEYS.REFRESH_TOKEN);
  const expiration = localStorage.getItem(CC98.STORAGE_KEYS.REFRESH_TOKEN_EXPIRATION);
  const userInfo = localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO);
  const accessToken = localStorage.getItem(CC98.STORAGE_KEYS.ACCESS_TOKEN);

  if (!refreshToken || !userInfo) {
    console.log(`[CC98 Live Better][theme] captureCurrentToken: no token (refreshToken=${!!refreshToken}, userInfo=${!!userInfo})`);
    return null;
  }

  try {
    const parsed = JSON.parse(userInfo.slice(4));
    console.log(`[CC98 Live Better][theme] captureCurrentToken: theme=${JSON.stringify(parsed.theme)}, label=${parsed.name ?? 'N/A'}`);
  } catch { /* ignore */ }

  return {
    refreshToken,
    refreshTokenExpirationTime: expiration ? parseInt(expiration, 10) : 0,
    userInfo,
    accessToken: accessToken ?? undefined,
  };
}

/** 解析当前登录用户的 ID */
export function getCurrentUserId(): number | null {
  const raw = localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO);
  if (!raw) return null;
  try {
    const info = JSON.parse(raw.slice(4));
    return info.id ?? null;
  } catch {
    return null;
  }
}

/** 解析当前登录用户的完整资料信息 */
export function getCurrentUserInfo(): Record<string, unknown> | null {
  const raw = localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw.slice(4));
  } catch {
    return null;
  }
}

/**
 * 切换到指定账号
 * 解密 token → 写入 localStorage → 触发 CC98 响应 → reload
 */
export async function loginWithAccount(
  account: AccountData,
  password: string
): Promise<boolean> {
  const salt = await Storage.getMasterSalt();
  if (!salt) return false;

  try {
    const json = await decrypt(
      account.encryptedData.iv,
      account.encryptedData.ciphertext,
      password,
      salt
    );
    const token: AccountToken = JSON.parse(json);

    // 注入所有 token 到 localStorage（补全 themeSetting 避免 CC98 ThemeSettingComponent 崩溃）
    localStorage.setItem(CC98.STORAGE_KEYS.ACCESS_TOKEN, token.accessToken ?? "");
    localStorage.setItem(CC98.STORAGE_KEYS.REFRESH_TOKEN, token.refreshToken);
    localStorage.setItem(
      CC98.STORAGE_KEYS.REFRESH_TOKEN_EXPIRATION,
      String(token.refreshTokenExpirationTime)
    );
    try {
      const parsed = JSON.parse(token.userInfo.slice(4));
      if (!parsed.themeSetting) {
        parsed.themeSetting = { enableDayNightSwitch: false, syncWithBrowserDayNightMode: false, dayStartTime: "06:00", nightStartTime: "18:00" };
      }
      localStorage.setItem(CC98.STORAGE_KEYS.USER_INFO, `obj-${JSON.stringify(parsed)}`);
    } catch {
      localStorage.setItem(CC98.STORAGE_KEYS.USER_INFO, token.userInfo);
    }

    // 清除 CC98 的缓存状态，强制重载后从 API 刷新
    localStorage.removeItem("shouldNotRefreshUserInfo");
    localStorage.removeItem("user-set-theme");

    // 将新账号的主题写入 use-theme（bootstrap 优先读取这里，缺少时因 isNaN(-1) 兜底逻辑已损坏）
    try {
      const userInfoObj = JSON.parse(token.userInfo.slice(4));
      if (typeof userInfoObj.theme === "number") {
        localStorage.setItem("use-theme", `str-${userInfoObj.theme}`);
      }
      console.log(`[CC98 Live Better][theme] loginWithAccount: saved userInfo.theme=${JSON.stringify(userInfoObj.theme)}, wrote use-theme=str-${userInfoObj.theme}`);
    } catch (e) {
      console.log(`[CC98 Live Better][theme] loginWithAccount: failed to parse theme from userInfo:`, e);
    }

    sessionStorage.clear();

    console.log(`[CC98 Live Better][theme] loginWithAccount final: use-theme=${localStorage.getItem("use-theme")}, userInfo theme=${(() => { try { return JSON.parse(localStorage.getItem("userInfo").slice(4)).theme; } catch { return "N/A"; } })()}`);

    // 调试链
    const chain = JSON.parse(localStorage.getItem("cc98-live-better:debug-chain") || '[]');
    chain.push({ step: 'loginWithAccount', ts: Date.now(), userId: (() => { try { return JSON.parse(localStorage.getItem("userInfo").slice(4)).id; } catch { return null; } })(), wrotetheme: (() => { try { return JSON.parse(localStorage.getItem("userInfo").slice(4)).theme; } catch { return null; } })(), wroteUseTheme: localStorage.getItem("use-theme") });
    localStorage.setItem("cc98-live-better:debug-chain", JSON.stringify(chain));

    // 持久化到 localStorage 跨重载供下一次 init 读取
    localStorage.setItem("cc98-live-better:debug-theme", JSON.stringify({
      useTheme: localStorage.getItem("use-theme"),
      userInfoTheme: (() => { try { return JSON.parse(localStorage.getItem("userInfo").slice(4)).theme; } catch { return null; } })(),
    }));

    return true;
  } catch {
    // 任何错误（密码错误、数据损坏等）都视为失败
    return false;
  }
}

/** 上一次检测到的 userInfo 值，用于轮询比较 */
let lastCheckValue: string | null = null;

/**
 * 轮询监听 localStorage 中 userInfo 的变化
 * 由于 content script 与页面运行在不同 JS 上下文中，
 * 无法通过代理 localStorage.setItem 来拦截，故采用轮询
 * @param callback 变化时回调，参数为新的 userInfo 值或 null（登出）
 * @returns 取消监听的函数
 */
export function onLocalStorageChange(callback: (userInfo: string | null) => void): () => void {
  lastCheckValue = localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO);

  const interval = setInterval(() => {
    const current = localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO);
    if (current !== lastCheckValue) {
      lastCheckValue = current;
      callback(current);
    }
  }, 500);

  return () => clearInterval(interval);
}

/**
 * 将当前登录的账号加密保存
 * @param password 主密码（首次保存时同时设置盐值）
 * @param label 可选的自定义标签
 */
export async function saveCurrentAccount(
  password: string,
  label?: string
): Promise<boolean> {
  const token = captureCurrentToken();
  if (!token) return false;

  const userInfo = getCurrentUserInfo();
  const userId = Number(userInfo?.id) || 0;
  const userName = label ?? (userInfo?.name as string) ?? `账号${userId}`;

  // 首次保存时生成并存储盐值
  let salt = await Storage.getMasterSalt();
  if (!salt) {
    salt = await generateSalt();
    await Storage.setMasterSalt(salt);
  }

  const encrypted = await encrypt(JSON.stringify(token), password, salt);

  const account: AccountData = {
    userId,
    label: userName,
    encryptedData: {
      salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
    },
    createdAt: Date.now(),
  };

  // 同账号更新、不同账号追加
  const accounts = (await Storage.getAccounts()) ?? [];
  const existingIndex = accounts.findIndex((a) => a.userId === userId);

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  await Storage.setAccounts(accounts);
  return true;
}

/** 从已保存列表中移除指定账号 */
export async function removeAccount(userId: number): Promise<void> {
  const accounts = (await Storage.getAccounts()) ?? [];
  await Storage.setAccounts(accounts.filter((a) => a.userId !== userId));
}
