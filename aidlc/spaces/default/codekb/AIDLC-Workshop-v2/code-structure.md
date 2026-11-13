# Code Structure

## Workspace 配置

```
./                                   # AIDLC 工作坊範本 workspace（非 git repo）
├── README.md                        # 工作坊說明（繁中）
├── AGENTS.md                        # 專案層 agent 說明（語言偏好、安全注意事項）
├── LICENSE
├── AI-DLC v2 Config Map.html        # 獨立說明頁，與應用程式無關
└── inventrix-code/                  # 實際應用程式（pnpm monorepo）
    ├── package.json                 # workspace root scripts: dev / build / start
    ├── pnpm-workspace.yaml          # packages/*、overrides、native build allowlist
    ├── pnpm-lock.yaml
    ├── .gitignore                   # node_modules, dist, *.log, .env, *.db, *.pem
    ├── README.md
    ├── deploy.sh                    # 互動式 EC2 部署腳本
    ├── destroy.sh                   # 對應的資源清除腳本
    └── packages/
        ├── api/
        │   ├── package.json
        │   ├── tsconfig.json        # ES2022 module, outDir dist, strict
        │   ├── public/images/       # 24 張 seed 商品圖 + AI 生成圖的輸出目錄
        │   └── src/
        │       ├── index.ts         # Express app 組裝與啟動
        │       ├── db.ts            # SQLite 連線、schema、seed
        │       ├── middleware/
        │       │   ├── auth.ts      # JWT authenticate / requireAdmin / generateToken
        │       │   └── rateLimit.ts # authRateLimit / protectedRouteRateLimit
        │       ├── routes/
        │       │   ├── auth.ts
        │       │   ├── products.ts
        │       │   ├── orders.ts
        │       │   └── analytics.ts
        │       └── services/
        │           └── imageGenerator.ts
        └── frontend/
            ├── package.json
            ├── index.html           # <div id="root">, title
            ├── vite.config.ts       # React plugin, /api 與 /images proxy
            ├── tsconfig.json        # bundler resolution, strict, noUnused*
            ├── tsconfig.node.json
            └── src/
                ├── main.tsx         # createRoot + StrictMode + index.css
                ├── App.tsx          # BrowserRouter, Routes, ProtectedRoute
                ├── index.css        # 全域 reset 與 button / input 樣式
                ├── context/
                │   └── AuthContext.tsx
                ├── components/
                │   └── Layout.tsx
                └── pages/
                    ├── Login.tsx
                    ├── Register.tsx
                    ├── Storefront.tsx
                    ├── ProductDetail.tsx
                    ├── Orders.tsx
                    ├── AdminDashboard.tsx
                    ├── AdminProducts.tsx
                    ├── AdminOrders.tsx
                    └── AdminInventory.tsx
```

`node_modules/`、`inventrix.db` 與 `.DS_Store` 未列入（見 `reverse-engineering-timestamp.md` 的掃描範圍）。

## 檔案分類

### packages/api（約 475 行 TypeScript）

| 檔案 | 分類 | 行數 | 說明 |
|------|------|------|------|
| `src/index.ts` | Configuration | 30 | 掛 `cors()`、`express.json()`、`/images` 靜態路由、4 個 router，呼叫 `initDb()`，listen `PORT`（預設 3000） |
| `src/db.ts` | Repository/DAO + Migration | 94 | 建立 better-sqlite3 連線；`CREATE TABLE IF NOT EXISTS` 四張表；users 為空時 seed 2 個帳號與 24 項商品 |
| `src/middleware/auth.ts` | Middleware | 35 | `authenticate`、`requireAdmin`、`generateToken`、`AuthRequest` 型別 |
| `src/middleware/rateLimit.ts` | Middleware | 17 | 兩個 `express-rate-limit` 實例 |
| `src/routes/auth.ts` | Controller | 47 | login、register |
| `src/routes/products.ts` | Controller | 53 | 商品 CRUD 與 generate-image |
| `src/routes/orders.ts` | Controller + 業務邏輯 | 89 | 訂單查詢、建立（含 GST 與扣庫存）、改狀態 |
| `src/routes/analytics.ts` | Controller + 查詢 | 65 | 儀表板聚合、庫存狀態 |
| `src/services/imageGenerator.ts` | Service（Adapter） | 45 | Bedrock Nova Canvas 呼叫與檔案寫入 |
| `public/images/*.png` | Static/Asset | 24 檔 | seed 商品圖 |

### packages/frontend（約 871 行 TS/TSX/CSS）

| 檔案 | 分類 | 行數 | 說明 |
|------|------|------|------|
| `src/main.tsx` | Configuration | 10 | 掛載 React root |
| `src/App.tsx` | Configuration（routing） | 43 | 路由表與 `ProtectedRoute` |
| `src/index.css` | Static/Asset | 49 | 全域樣式 |
| `src/context/AuthContext.tsx` | Service（client state） | 75 | 登入狀態與 auth API 呼叫 |
| `src/components/Layout.tsx` | UI component | 41 | 導覽列與 `<Outlet />` |
| `src/pages/*.tsx` | UI page（含資料抓取） | 37–139 | 9 個頁面，見 `component-inventory.md` |

## 程式碼模式

### 後端

- **ESM + `.js` 副檔名 import**：`"type": "module"`，原始碼以 `'./db.js'` 形式 import TypeScript 編譯後的路徑。
- **Router-per-resource**：每個資源一個 `Router()` 檔，`export default router`。
- **Middleware 串接順序**：受保護 route 一律是 `protectedRouteRateLimit, authenticate[, requireAdmin], handler`。auth route 只有 `authRateLimit`。
- **同步 SQL**：`db.prepare(sql).get/all/run(...)`，全部使用 `?` 參數綁定（沒有字串拼接 SQL）。結果大量以 `as any` 轉型。
- **錯誤回應**：`res.status(code).json({ error: '<message>' })`，沒有 error code 或 request ID。

### 前端

- **Page-centric**：每頁一個 default export function component，頁面內自定 interface、自己 `useEffect` + `fetch` + `useState`。
- **資料抓取慣例**：`fetch(url, { headers: { Authorization: \`Bearer ${token}\` } }).then(res => res.json()).then(setX)`；寫入後重新呼叫 load 函式。沒有 `res.ok` 檢查，沒有 `catch`（除 `ProductDetail.handleOrder` 與 `AdminProducts.generateImage`）。
- **樣式慣例**：幾乎全部是 JSX inline `style={{...}}`；hover 用 `onMouseEnter` / `onMouseLeave` 直接改 `e.currentTarget.style`；全域只有 `index.css`。沒有 CSS Modules、styled-components、Tailwind 或 design token。
- **品牌色**：漸層 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` 用在 body 背景、導覽列、Login / Register 標題與按鈕、店面價格文字；後台頁面改用 Bootstrap 風格的 `#007bff`、`#28a745`、`#dc3545`、`#ffc107`、`#17a2b8`、`#6c757d`。
- **圖示**：以 emoji 當圖示（`✨`、`👤`、`🛍️`、`❌`），沒有 icon 套件。
- **Routing**：`/login`、`/register` 在 `Layout` 外；其餘巢狀在 `/` 的 `Layout` 下，受保護頁面用 `<ProtectedRoute>` 包住 element。

## Import 相依（adjacency list）

```
api/src/index.ts        -> db, routes/auth, routes/products, routes/orders, routes/analytics, express, cors
api/src/routes/auth.ts  -> db, middleware/auth(generateToken), middleware/rateLimit(authRateLimit), bcrypt
api/src/routes/products.ts  -> db, middleware/auth, services/imageGenerator, middleware/rateLimit
api/src/routes/orders.ts    -> db, middleware/auth, middleware/rateLimit
api/src/routes/analytics.ts -> db, middleware/auth, middleware/rateLimit
api/src/services/imageGenerator.ts -> @aws-sdk/client-bedrock-runtime, fs, path
api/src/db.ts           -> better-sqlite3, bcrypt

frontend/src/main.tsx   -> App, index.css
frontend/src/App.tsx    -> context/AuthContext, components/Layout, pages/* (9)
frontend/src/components/Layout.tsx -> context/AuthContext, react-router-dom
frontend/src/pages/{ProductDetail,Orders,AdminDashboard,AdminProducts,AdminOrders,AdminInventory,Login,Register}.tsx -> context/AuthContext
frontend/src/pages/Storefront.tsx -> react-router-dom only
```

沒有循環相依。
