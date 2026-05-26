/**
 * WXT storage 封装层
 *
 * 基于 wxt/utils/storage（底层为 @wxt-dev/storage）实现，
 * 提供跨浏览器兼容的本地存储访问（自动处理 chrome/firefox 差异）。
 * 所有键名统一添加前缀避免污染。
 *
 * 用法：Storage.getAccounts() → AccountData[] | null
 *      Storage.setAccounts([...]) → void
 */
import { storage } from "wxt/utils/storage";
import type { AccountData, MemeItem, HistoryItem, FeatureSettings } from "../types";

/** storage 键名前缀，避免与其他扩展冲突 */
const PREFIX = "cc98-live-better:";

/**
 * 内部键名（wxt/storage 使用 "local:key" 格式，
 * 前缀决定存储区域：local/session/sync）
 */
const KEYS = {
  /** PBKDF2 盐值 */
  MASTER_SALT: `local:${PREFIX}masterSalt`,
  /** 已保存的账号列表 */
  ACCOUNTS: `local:${PREFIX}accounts`,
  /** 收藏的表情包列表 */
  MEMES: `local:${PREFIX}memes`,
  /** 浏览历史记录列表 */
  HISTORY: `local:${PREFIX}history`,
  /** 功能开关 */
  FEATURES: `local:${PREFIX}features`,
} as const;

/** 统一导出的 storage API */
const DEFAULT_FEATURES: FeatureSettings = {
  accountSwitcher: true,
  memeGallery: true,
  historySearch: true,
};

export const Storage = {
  getMasterSalt: () => storage.getItem<string>(KEYS.MASTER_SALT),
  setMasterSalt: (salt: string) => storage.setItem(KEYS.MASTER_SALT, salt),
  removeMasterSalt: () => storage.removeItem(KEYS.MASTER_SALT),

  getAccounts: () => storage.getItem<AccountData[]>(KEYS.ACCOUNTS),
  setAccounts: (accounts: AccountData[]) => storage.setItem(KEYS.ACCOUNTS, accounts),

  getMemes: () => storage.getItem<MemeItem[]>(KEYS.MEMES),
  setMemes: (memes: MemeItem[]) => storage.setItem(KEYS.MEMES, memes),

  getHistory: () => storage.getItem<HistoryItem[]>(KEYS.HISTORY),
  setHistory: (history: HistoryItem[]) => storage.setItem(KEYS.HISTORY, history),

  getFeatureSettings: () => storage.getItem<FeatureSettings>(KEYS.FEATURES),
  setFeatureSettings: (settings: FeatureSettings) => storage.setItem(KEYS.FEATURES, settings),
};
