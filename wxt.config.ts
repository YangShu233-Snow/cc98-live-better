/**
 * WXT 扩展构建配置
 * 配置源码目录、manifest 插件声明和权限
 */
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  manifest: {
    name: "CC98 Live Better",
    description: "CC98 论坛增强插件 — 多账号切换 · 表情包收藏 · 历史检索",
    permissions: ["storage", "contextMenus"],
    host_permissions: [
      "*://www.cc98.org/*",
      "*://api.cc98.org/*",
      "*://file.cc98.org/*",
    ],
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '128': 'icon/128.png',
    },
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '24': 'icon/24.png',
        '32': 'icon/32.png',
      },
      default_popup: "popup/index.html",
      default_title: "CC98 Live Better",
    },
    commands: {
      "open-account-switcher": {
        suggested_key: { default: "Alt+C", mac: "Alt+C" },
        description: "打开账号切换面板",
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'cc98-live-better@yangshu233.space',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
});
