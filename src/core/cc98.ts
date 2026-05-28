/**
 * CC98 论坛页面常量
 * 集中管理所有与 CC98 页面结构和存储键相关的常量，
 * 当 CC98 版本升级导致 DOM 结构变化时只需修改此文件
 */

/** WebVPN 环境下，CC98 的所有 localStorage 键会被加上此前缀 */
const WEBVPN_KEY_PREFIX = "__1_";

/** 检测当前页面是否通过 WebVPN 代理访问 CC98 */
export function isWebVPN(): boolean {
  return location.hostname === "webvpn.zju.edu.cn";
}

/** 获取 CC98 localStorage 键的实际名称（WebVPN 下自动加前缀） */
export function cc98Key(key: string): string {
  return isWebVPN() ? `${WEBVPN_KEY_PREFIX}${key}` : key;
}

export const CC98 = {
  /** 论坛主站域名 */
  ORIGIN: "https://www.cc98.org",

  /** CC98 页面 DOM 元素选择器 */
  SELECTORS: {
    /** 非首页的顶栏用户中心下拉菜单容器 */
    USER_CENTER_DROPDOWN: ".topBarUserCenter",
    /** 首页的顶栏用户中心下拉菜单容器 */
    USER_CENTER_DROPDOWN_MAIN: ".topBarUserCenter-mainPage",
    /** 用户名显示区域（hover 触发下拉菜单） */
    USER_NAME: ".topBarUserName",
    /** 搜索框输入元素 */
    SEARCH_TEXT: "#searchText",
  } as const,

  /** CC98 在 localStorage 中使用的键名（getter 方式，运行时自动适配 WebVPN 前缀） */
  STORAGE_KEYS: {
    get ACCESS_TOKEN() { return cc98Key("accessToken"); },
    get REFRESH_TOKEN() { return cc98Key("refresh_token"); },
    get USER_INFO() { return cc98Key("userInfo"); },
    get REFRESH_TOKEN_EXPIRATION() { return cc98Key("refresh_token_expirationTime"); },
  } as const,
} as const;
