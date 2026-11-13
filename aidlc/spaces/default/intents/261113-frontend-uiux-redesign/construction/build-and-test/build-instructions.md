# Build 說明

依據：`construction/code-generation/code-generation-plan.md`（Step 1 的套件與建置設定）、`construction/code-generation/code-summary.md`（安裝的套件與版本），以及 `construction/code-generation/unit-test-instructions.md`（驗收指令）。

## 前置需求

- Node 22。本機以 Homebrew 安裝在 `/opt/homebrew/opt/node@22`，預設的 node 可能是 24 或 26。`better-sqlite3` 需要 Node 22 才能編譯。
- pnpm（workspace 根目錄是 `inventrix-code/`）。

## 安裝相依

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
cd inventrix-code
pnpm install
```

前端新增的 `tailwindcss`、`@tailwindcss/vite`、`gsap`、`@gsap/react`、`canvas-confetti` 都不需要 postinstall build，`pnpm-workspace.yaml` 不需要修改。

## 環境設定

前端不需要任何環境變數。API 透過 Vite proxy 以相對路徑 `/api`、`/images` 連到 `localhost:3000`。

## Build

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
cd inventrix-code
pnpm --filter frontend build
```

這個指令會先跑 `tsc`（strict、noUnusedLocals、noUnusedParameters），再跑 `vite build`，產出 `packages/frontend/dist/`。

## 驗證 build

- 指令的 exit code 為 0。
- 輸出最後一行是 `✓ built in ...`，並列出 `dist/index.html`、`dist/assets/index-*.css`、`dist/assets/index-*.js`。

## 本機執行

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
cd inventrix-code
pnpm dev
```

API 在 :3000，前端在 :5173。

## 常見問題

- **`better-sqlite3` 編譯失敗（C++20 header 錯誤）**：node 版本不是 22，請先切到 Node 22 再 `pnpm install`。
- **build 因 `declared but never read` 失敗**：`noUnusedLocals` 會讓未使用的 import 或變數造成 build 失敗，刪掉它即可。
- **頁面顯示 ERROR 卡片（Request failed (500)）**：API 沒有啟動，或正在被其他工作修改。前端會顯示錯誤狀態與 Retry 按鈕，這是預期行為。
