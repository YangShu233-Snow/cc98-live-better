/**
 * WXT 扩展构建配置
 * 配置源码目录、manifest 插件声明和权限
 */
import { defineConfig } from "wxt";

export default defineConfig({
  /** 源码目录（相对于项目根目录） */
  srcDir: "src",
  /** 扩展 manifest 附加字段（WXT 自动生成基础 manifest） */
  manifest: {
    name: "CC98 Live Better",
    description: "CC98 论坛增强插件 — 多账号切换 · 表情包收藏 · 历史检索",
    permissions: ["storage", "contextMenus"],
    host_permissions: [
      "*://www.cc98.org/*",
      "*://api.cc98.org/*",
      "*://file.cc98.org/*",
    ],
    action: {
      default_popup: "popup/index.html",
      default_title: "CC98 Live Better",
    },
  },
});
