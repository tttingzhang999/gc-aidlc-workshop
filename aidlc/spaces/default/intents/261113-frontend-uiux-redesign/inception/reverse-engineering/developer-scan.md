## Developer Code Scan Results

本次為首次完整掃描（NO_STORE、full breadth），掃描根目錄為 workspace root `./`。實際的應用程式是 `inventrix-code/` 底下的 pnpm monorepo（Inventrix 電商平台）。workspace 不是 git repository，Run Record 的 commit 記為 `unknown`。

### Scan Coverage
- **Analyzed deeply**:
  - `inventrix-code/package.json`
  - `inventrix-code/pnpm-workspace.yaml`
  - `inventrix-code/pnpm-lock.yaml`（只讀 `importers` 區段，用來確認實際解析版本）
  - `inventrix-code/.gitignore`
  - `inventrix-code/README.md`
  - `inventrix-code/deploy.sh`
  - `inventrix-code/destroy.sh`
  - `inventrix-code/packages/api/package.json`
  - `inventrix-code/packages/api/tsconfig.json`
  - `inventrix-code/packages/api/src/`（`index.ts`、`db.ts`、`middleware/auth.ts`、`middleware/rateLimit.ts`、`routes/auth.ts`、`routes/products.ts`、`routes/orders.ts`、`routes/analytics.ts`、`services/imageGenerator.ts`，全部逐行閱讀）
  - `inventrix-code/packages/frontend/package.json`
  - `inventrix-code/packages/frontend/tsconfig.json`
  - `inventrix-code/packages/frontend/tsconfig.node.json`
  - `inventrix-code/packages/frontend/vite.config.ts`
  - `inventrix-code/packages/frontend/index.html`
  - `inventrix-code/packages/frontend/src/`（`main.tsx`、`App.tsx`、`index.css`、`context/AuthContext.tsx`、`components/Layout.tsx`、`pages/` 下全部 9 個頁面，全部逐行閱讀）
  - `README.md`、`AGENTS.md`（workspace root；`AGENTS.md` 為專案自己的說明，非 AI-DLC 標記區段）
- **Skimmed only**:
  - `inventrix-code/packages/api/public/images/`（24 張商品 PNG 靜態圖，只確認檔名與 seed 資料對應，未開啟內容）
  - `inventrix-code/LICENSE`、`LICENSE`（MIT-0 授權，只看標頭）
  - `AI-DLC v2 Config Map.html`（workspace root 的獨立 HTML 說明頁，與 Inventrix 程式碼無關，只看開頭確認性質）
- **Left out**:
  - `inventrix-code/node_modules/`
  - `inventrix-code/packages/api/node_modules/`
  - `inventrix-code/packages/frontend/node_modules/`
  - `inventrix-code/packages/api/inventrix.db`（SQLite 資料庫檔，被 `*.db` ignore）
  - 各處 `.DS_Store`
  - AI-DLC 自身安裝：`.claude/`、`aidlc/`、`aidlc.settings.json`、`aidlc.settings.local.json`、`.mcp.json` 的 MCP servers、root `.gitignore` 的 AI-DLC 區塊

### Packages Found
- `inventrix`（`inventrix-code/package.json`）— pnpm workspace root — JSON 設定 — 以 `pnpm --filter` 同時啟動 / 建置 api 與 frontend
- `api`（`inventrix-code/packages/api`）— Node.js 後端服務 — TypeScript（ESM）— Express REST API、SQLite 持久化、JWT 驗證、Bedrock 圖片生成
- `frontend`（`inventrix-code/packages/frontend`）— SPA — TypeScript + TSX — Vite + React 18 + React Router 6 的店面與後台介面

### Build System
- **Type**: pnpm workspace（`pnpm-workspace.yaml` 與 `package.json` `workspaces` 皆宣告 `packages/*`）；後端用 `tsc` 輸出到 `dist/`，開發用 `tsx watch`；前端用 `tsc && vite build`
- **Config Files**: `inventrix-code/package.json`、`inventrix-code/pnpm-workspace.yaml`（含 `overrides` `path-to-regexp`、`qs` 與 native build allowlist）、`pnpm-lock.yaml`（lockfileVersion 9.0）、`packages/api/tsconfig.json`、`packages/frontend/tsconfig.json`、`packages/frontend/tsconfig.node.json`、`packages/frontend/vite.config.ts`
- **Build Dependencies**: `frontend` 與 `api` 之間沒有 package 層的相依；`frontend` 在 runtime 透過 HTTP 呼叫 `api`（Vite dev proxy 把 `/api`、`/images` 轉到 `http://localhost:3000`，正式環境由 nginx 反向代理）

### APIs Discovered
- REST（Express Router）— `packages/api/src/routes/auth.ts` — 2 個 endpoint（`POST /api/auth/login`、`POST /api/auth/register`）
- REST — `packages/api/src/routes/products.ts` — 6 個 endpoint（list、get、create、update、delete、`POST /generate-image`）
- REST — `packages/api/src/routes/orders.ts` — 4 個 endpoint（list、get by id、create、`PATCH /:id/status`）
- REST — `packages/api/src/routes/analytics.ts` — 2 個 endpoint（`GET /dashboard`、`GET /inventory`）
- 靜態檔案 — `packages/api/src/index.ts` — `GET /images/*`（`express.static`）
- 外部 API（outbound）— `packages/api/src/services/imageGenerator.ts` — Amazon Bedrock Runtime `InvokeModel`（model `amazon.nova-canvas-v1:0`）
- 前端 client 呼叫：各頁面直接用 `fetch`，沒有共用 API client 層（共 14 個呼叫點，分布於 `AuthContext.tsx` 與 7 個頁面，用到 13 個不同的 endpoint）

### Frameworks & Libraries
- express — 4.21.2（spec `^4.18.2`）— HTTP server 與 routing
- better-sqlite3 — 9.6.0 — 同步 SQLite driver
- bcrypt — 6.0.0 — 密碼雜湊
- jsonwebtoken — 9.0.3 — JWT 簽發與驗證
- express-rate-limit — 8.5.2 — auth 與受保護路由的限流
- cors — 2.8.5 — CORS（全開設定）
- @aws-sdk/client-bedrock-runtime — 3.1068.0 — 呼叫 Bedrock 生成商品圖片
- tsx — 4.20.6 — 後端開發時 watch 執行
- typescript — 5.9.3 — 兩個 package 都用
- react / react-dom — 18.3.1 — UI
- react-router-dom — 6.30.4 — client-side routing
- vite — 5.4.21 — 前端 dev server 與 bundler
- @vitejs/plugin-react — 4.7.0 — React Fast Refresh / JSX
- 沒有任何 CSS framework、UI component library、動畫函式庫、狀態管理或 data-fetching 函式庫

### Test Coverage
- **Test Directories**: 無（沒有 `test/`、`__tests__/`、`*.test.*`、`*.spec.*`）
- **Test Frameworks**: 無（兩個 `package.json` 都沒有 test script 或測試相依）
- **Coverage Config**: absent

### Code Quality Indicators
- **Linting**: 無 ESLint / Prettier 設定；只有 TypeScript `strict: true`（前端另開 `noUnusedLocals`、`noUnusedParameters`）
- **CI/CD**: 無 CI pipeline 檔；部署靠手動執行的 `inventrix-code/deploy.sh`（EC2 + nginx + PM2），清除靠 `destroy.sh`
- **Documentation**: `inventrix-code/README.md` 說明功能、啟動方式與部署；原始碼幾乎沒有註解；沒有 OpenAPI 規格

### Technical Debt Signals
- 安全性：`packages/api/src/middleware/auth.ts:4` 在缺少 `JWT_SECRET` 環境變數時退回寫死的預設 secret（值不在此複製）
- 安全性：`packages/api/src/db.ts:52-53` 以寫死的預設密碼 seed admin 與 customer 帳號；`inventrix-code/README.md` 與 `deploy.sh` 結尾也印出這組預設帳密（值不在此複製）
- 安全性：所有 route 都沒有輸入驗證（`routes/*.ts` 直接解構 `req.body`）；`PATCH /api/orders/:id/status` 只靠 DB `CHECK` constraint 擋非法 status，違反時會丟出未處理例外
- 安全性：`services/imageGenerator.ts:39` 檔名只把空白換成 `-`，`productName` 內的 `/`、`..` 未清除，有 path traversal 風險（僅 admin 可觸發）
- 安全性：`index.ts` 的 `cors()` 為全開；JWT 存放在 `localStorage`（`AuthContext.tsx`）
- 資料一致性：`routes/orders.ts:49-81` 建立訂單時先檢查庫存、再逐筆寫入與扣庫存，沒有包在 transaction 內；`quantity` 未驗證為正整數
- 錯誤處理：後端只有 `generate-image` 有 try/catch；其他 handler 遇到 DB 例外會落到 Express 預設錯誤頁
- 前端狀態 bug：`App.tsx:14` 的 `ProtectedRoute` 在第一次 render 時 `user` 仍是 `null`（`AuthContext.tsx:24` 的 `useEffect` 才從 `localStorage` 還原），直接重新整理 `/orders` 或 `/admin/*` 會被導回 `/login`
- 前端：所有 `fetch` 都沒檢查 `res.ok`；`ProductDetail` 收到 404 時會把 `{ error }` 當成商品渲染；`Storefront`、`Orders`、`AdminProducts`、`AdminOrders`、`AdminInventory` 沒有 loading、error、empty 狀態
- 前端：樣式幾乎全為 inline style 物件，hover 效果用 `onMouseEnter`/`onMouseLeave` 直接改 DOM style；漸層色碼 `#667eea → #764ba2` 重複出現在多個檔案；店面頁與後台頁是兩套不一致的視覺語言（後台用 Bootstrap 風格色 `#007bff` 等）
- 前端：沒有 RWD（`AdminDashboard` 用固定 `repeat(4, 1fr)` grid，`Layout` 固定 `3rem` padding）；表單只用 placeholder 沒有 `<label>`；回饋用原生 `alert()` / `confirm()`
- 前端：`AdminDashboard` 取得 `ordersByStatus` 但沒有顯示；`GET /api/orders/:id`（含明細）沒有任何頁面使用；後端 `POST /api/orders` 支援多品項，但前端只能單一商品下單（沒有購物車）
- 重複：`Product` interface 在 `Storefront`、`ProductDetail`、`AdminProducts` 各定義一次；`Order` 也在兩個頁面重複定義；沒有共用 type 或 API client
- 執行環境耦合：`db.ts:4` 的 DB 路徑與 `imageGenerator.ts` 的圖片輸出目錄都相對於 `process.cwd()`，必須在 `packages/api` 目錄下啟動才正確
- 資料：seed 有兩筆名稱同為 `Tablet 10"` 的商品
- 無測試、無 linter、無 CI

## Handoff Summary
- **Intent-relevant finding**: 前端（`inventrix-code/packages/frontend/src/`）共 14 個檔案，約 870 行，結構是 `App.tsx` routing → `Layout.tsx` 外框 → 9 個頁面，全部用 inline style 和原生 `fetch`，只有 `index.css`（49 行）提供全域的 reset、button、input 樣式。沒有 design token、共用元件、動畫、toast 或 loading/empty/error 元件，這些都是 UI/UX 重構要從零補上的部分。重構不需要改後端：所有頁面只依賴 13 個 REST endpoint（見 `api-documentation.md`），response shape 是 SQLite 欄位的 snake_case（例如 `image_url`、`created_at`、`user_name`）。
- **Risks / follow-up**: (1) `App.tsx:14` 的 `ProtectedRoute` 與 `AuthContext.tsx:24` 的還原時序 bug，重構 routing 或加入頁面轉場時必須一起處理，否則重新整理受保護頁面會被踢回登入頁。(2) `index.css` 的全域 `button`/`input` 樣式會影響所有元件，導入 Tailwind 時要決定保留或移除（Tailwind preflight 會覆蓋 reset）。(3) 前端與 `package.json` 目前沒有 Tailwind、GSAP 等套件，導入它們是新增相依。(4) 沒有任何測試或 linter，Build and Test 只能依賴 `tsc` 型別檢查與手動驗證。(5) 安全與一致性問題（預設 JWT secret、預設帳密、無輸入驗證、訂單非 transaction）屬於後端，不在本 intent 的前端範圍，但應記錄供後續處理。
