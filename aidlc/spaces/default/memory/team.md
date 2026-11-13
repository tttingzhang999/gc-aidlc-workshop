# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- 我們採用 trunk-based development：主幹是 `main`，每個工作單元（Bolt）的 base 與 merge target 都是 `main`。
- 每個工作單元完成後 squash-merge 回 `main`，成為一個 commit。
- **[證據]** Workspace 根目錄（`/Users/ting/Documents/coding/gc/AIDLC Workshop v2`）是 git repository，目前在 `main`，追蹤 `origin/main`；remote `origin` 是 `https://github.com/tttingzhang999/gc-aidlc-workshop`。
- **[證據]** 應用程式是 `inventrix-code/` 底下的 pnpm monorepo，含 `packages/api` 與 `packages/frontend`；這次重構只動 `packages/frontend`。
- 開發由單一開發者搭配 AI agent 進行。Construction 一次處理一個工作單元（`unit-major`、`serial`）。

## Walking Skeleton

- 我們這次不做 skeleton ceremony：不先建立薄的端到端切片，直接完整重做所有前端頁面。
- 這是團隊的明確決定，取代 `workshop` scope 預設的 `skeleton: on`。
- 因為不做 skeleton，Construction 開始時沒有 skeleton checkpoint；每個工作單元仍以下方 Testing Posture 的方式驗收。

## Testing Posture

- **Methodology**: test-after
- **Methodology evidence**: **[證據]** 專案沒有任何測試檔、測試框架、test script、coverage 設定或 CI（見 `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/code-quality-assessment.md`）。團隊以開發速度為優先，這次不引入測試框架。驗收方式是 `pnpm --filter frontend build` 通過，再加上本機瀏覽器人工檢視；動畫與視覺效果只能靠人眼確認。
- **Ordering**: 每個工作單元先完成實作，再以 `pnpm --filter frontend build` 通過與本機瀏覽器人工檢視驗收；這次不撰寫自動化測試。
- 自動化檢查只有前端 build 第一步的 `tsc`（`strict`、`noUnusedLocals`、`noUnusedParameters`）。未使用的 import 也會讓 build 失敗。
- 人工檢視的方式：在 `inventrix-code/` 執行 `pnpm dev`，以瀏覽器逐頁確認畫面、互動與動畫。
- **[證據]** 本 intent 的 Test Strategy 為 Minimal；`workshop` scope 不加新測試門檻，只要求既有測試維持綠燈。既有測試數量為 0，所以回歸基準就是 build 成功。
- 不做自動化視覺回歸測試，也不引入 Playwright 等瀏覽器自動化工具。

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- 這次只在本機驗證，不部署。團隊目前正在重構 IaC，部署留到之後處理。
- `org.md` 預設的「merge 後部署到 staging」不適用於這個專案，因為專案沒有 staging，也沒有 CI/CD pipeline。
- **[證據]** 現有的部署方式是手動執行 `inventrix-code/deploy.sh`：建立單一 EC2 instance，以 PM2 常駐 API，以 nginx（自簽 TLS）提供前端 `dist/` 並反向代理 `/api` 與 `/images`。清除方式是 `inventrix-code/destroy.sh`。這仍是之後部署時的既有手動路徑。
- **[證據]** 執行環境需要 Node 22。新增的前端相依必須能在 Amazon Linux 2023 + Node 22 上安裝與建置；需要 postinstall native build 的套件必須加入 `pnpm-workspace.yaml` 的 allowlist。
- 前端繼續使用相對路徑 `/api`、`/images`，之後執行 `deploy.sh` 時不需要修改 nginx 設定。

## Code Style

- 不新增 Prettier 或 ESLint，延續現有寫法，由 `tsc` strict 把關。
- 縮排 2 空白、單引號、行尾分號。
- 元件與頁面檔名、元件名稱用 PascalCase（例如 `AdminProducts.tsx`）；函式與變數用 camelCase。
- **[證據]** 前後端都使用 TypeScript `strict` 與 ESM（`"type": "module"`）；後端 import 帶 `.js` 副檔名。每個頁面是 default export 的 function component。
- 樣式改寫方向（例如以 Tailwind utility class 與 design token 取代 inline style）由後續設計 stage 決定，不在這裡定案。
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
