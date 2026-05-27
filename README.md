# CC98 Live Better

[![Build & Release](https://github.com/YangShu233-Snow/cc98-live-better/actions/workflows/release.yml/badge.svg)](https://github.com/YangShu233-Snow/cc98-live-better/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![WXT](https://img.shields.io/badge/WXT-0.20.26-blue)](https://wxt.dev)

CC98 论坛增强浏览器插件，Make CC98 Web Better!!!

## 功能

以下功能均支持手动开关。

- 多账号快速切换：本插件允许您加密保存多个账号的登录凭据，一键切换，无需重复登录流程。
- 图片表情包收藏：右键收藏你喜欢的图片，在表情面板中的「收藏」标签页将它们作为表情来使用！
- 更好的历史记录：将主题浏览记录保存于浏览器本地存储，允许你在搜索框检索时实现下拉搜索。
- 更好的私信功能：允许你在私信中同发帖回帖一样使用表情包与收藏。

## 安装

### 从 Release 安装（推荐）

1. 前往 [Releases](https://github.com/YangShu233-Snow/cc98-live-better/releases) 页面
2. 下载最新版本的 `cc98-live-better-*-chrome.zip`
3. 解压到本地目录
4. 打开 Chrome → `chrome://extensions` → 开启「开发者模式」
5. 点击「加载已解压的扩展程序」→ 选择解压后的目录

### 从源码构建

```bash
git clone https://github.com/YangShu233-Snow/cc98-live-better.git
cd cc98-live-better
pnpm install
pnpm build       # 构建到 .output/chrome-mv3/
pnpm zip         # 打包为 .zip 供分发
```

构建产物位于 `.output/chrome-mv3/`。在 `chrome://extensions` 中加载该目录即可。

## 声明

### 安全性

- **所有数据仅存储在用户本地浏览器**，不上传到任何服务器。
- 插件不保存用户学号密码，仅保存账号凭据。
- 插件申请的 `host_permissions` 仅限：
  - `www.cc98.org` — 注入内容脚本、读取页面数据
  - `api.cc98.org` — CC98 API 调用
  - `file.cc98.org` — 读取用户上传的图片（收藏表情）

### 对于 CC98 服务器

- 本插件不会对 CC98 服务器发起非必要的额外请求（在目前的版本中，本插件并不会主动发起任何网络请求）。
- 本插件的历史检索功能完全在本地运算，初衷包括减轻 CC98 服务器小部分压力。
- 本插件复用已上传至 CC98 服务器的图片链接，不做任何额外存储与文件上传请求。

## 开源许可

本项目基于 [MIT License](LICENSE) 发布。
