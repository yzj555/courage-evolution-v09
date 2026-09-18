# 勇气进化 · 修订 09 独立项目

保存版本：2026-09-17，进化演出修订 09。包含勇气徽章共鸣、进化与大招动画、自由视角和重置视角，也包含页面中“返回保留版”所指向的修订 13 六阶段模型展台。

整个目录可以复制到其他位置使用。源码、模型、贴图、Three.js 依赖与构建脚本均在本目录内。

## 直接打开

双击 `dist/cinema.html`，使用 Edge 或 Chrome 打开。全部运行资源内嵌在页面中，离线也能使用。

`dist/evolution-v13.html` 是保留的六阶段模型展台。

## 目录

| 位置 | 内容 |
| --- | --- |
| `src/` | 当前演出、界面、角色修整、骨骼动作、技能与特效源码 |
| `src/cinema-viewer.js` | 进化时间线、自由视角、重置与交互入口 |
| `src/cinema-template.html` | 页面结构与 CSS |
| `src/cinema-crest.js` | 勇气徽章几何与发光效果 |
| `src/cinema-resonance.js` | 徽章和神圣计划共鸣过程 |
| `assets/` | 六个形态的 DAE 模型、贴图、眨眼贴图、参考图及构建清单 |
| `vendor/` | 固定版本的 Three.js、OrbitControls、导入导出工具及许可证 |
| `scripts/` | 本目录专用的构建与本地预览脚本 |
| `dist/` | 可以直接打开的完整 HTML 页面 |
| `node_modules/` | 本机构建依赖，Git 不收录；从仓库下载后使用 `npm ci` 安装 |
| `qa/` | 版本来源、交互检查、独立运行验证与预览截图 |
| `docs/` | 保存前的演出和展台说明，历史版本链接仅用于追溯 |

## 修改并构建

需要 Node.js 18 或更新版本。从 GitHub 克隆或下载解压后，在项目目录打开终端执行：

```powershell
npm ci
npm run build
```

构建会读取 `src/`、`vendor/` 和 `assets/index.json`，更新 `dist/cinema.html` 与 `dist/evolution-v13.html`。它不读取原工程的 `work` 目录，也不从旧 HTML 提取模型。修改后重新打开或刷新 `dist/cinema.html` 即可。

`npm ci` 会联网下载锁定的 esbuild 0.28.2 构建依赖，只需在首次安装或依赖变化后执行。当前电脑保留的独立目录已经带入 Windows x64 依赖，可直接执行 `npm run build`。只查看 `dist/` 中的页面无需安装 Node.js 或依赖。

校验源码是否能原样重建当前页面：

```powershell
npm run check
```

`assets/*/model.dae` 是运行时细分、修形和骨骼修正之前的模型。网页中的最终体态与动作由源码处理；资源说明见 `assets/README.md`。

## 可选的本地服务器

```powershell
npm run preview
```

浏览器打开 `http://127.0.0.1:4183/cinema.html`。按 Ctrl+C 结束服务。该端口与原预览使用的 4173 分开；也可用 `node scripts/preview.cjs 4184` 指定端口。

## 保存校验

保存时的修订 09 页面 SHA-256：

```text
07b797e6e69aedd2fd711dba36644b2cfca15c3d70529cf43c81f5ae7e55f1c2
```

`qa/来源清单.json` 记录原文件与保存文件的校验值；源码仅调整了本地依赖路径。`qa/独立目录原始校验.json` 保留 2026-09-17 本地独立目录的原始清单，其中包含未上传 GitHub 的本机构建依赖。

`文件校验.json` 记录上传 GitHub 时的项目文件及 SHA-256，不包含它本身、`.git/` 和 `node_modules/`。演出页面与六阶段展台仍保持保存版本的原始字节，后续修改文件后相应校验值会变化。
