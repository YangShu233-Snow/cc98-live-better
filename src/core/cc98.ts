/**
 * CC98 论坛页面常量
 * 集中管理所有与 CC98 页面结构和存储键相关的常量，
 * 当 CC98 版本升级导致 DOM 结构变化时只需修改此文件
 */
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

  /** CC98 在 localStorage 中使用的键名 */
  STORAGE_KEYS: {
    /** 短期 access_token */
    ACCESS_TOKEN: "accessToken",
    /** 长期 refresh_token */
    REFRESH_TOKEN: "refresh_token",
    /** 用户信息 JSON（带 str- 前缀） */
    USER_INFO: "userInfo",
    /** refresh_token 过期时间戳 */
    REFRESH_TOKEN_EXPIRATION: "refresh_token_expirationTime",
  } as const,
} as const;
