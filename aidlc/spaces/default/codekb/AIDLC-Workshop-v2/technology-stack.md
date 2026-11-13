# Technology Stack

版本欄位為 `pnpm-lock.yaml` 實際解析的版本，括號內為 `package.json` 的 specifier。

## 語言與執行環境

| 項目 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.9.3（`^5.3.3`） | 前後端共同語言，兩邊都開 `strict` |
| Node.js | 22（README 與 `deploy.sh` 指定） | 後端執行環境；`@types/node` 為 20.19.24 |
| JavaScript 模組系統 | ESM | 兩個 package 都是 `"type": "module"` |
| SQL | SQLite 方言 | `db.ts` 與各 route 內的查詢 |
| Bash | — | `deploy.sh`、`destroy.sh` |

## 前端（packages/frontend）

| 類別 | 套件 | 版本 | 備註 |
|------|------|------|------|
| UI library | react / react-dom | 18.3.1（`^18.2.0`） | `createRoot`、`StrictMode`、function component + hooks |
| Routing | react-router-dom | 6.30.4（`^6.30.4`） | `BrowserRouter`、巢狀 `Routes` / `Outlet`、`Navigate` |
| Build / dev server | vite | 5.4.21（`^5.0.10`） | dev port 5173；`/api`、`/images` proxy 到 3000 |
| Vite plugin | @vitejs/plugin-react | 4.7.0（`^4.2.1`） | JSX transform、Fast Refresh |
| 型別 | @types/react、@types/react-dom | 18.3.26、18.3.7 | |
| TS 設定 | `tsconfig.json` | target ES2020、`moduleResolution: bundler`、`jsx: react-jsx`、`noEmit` | build 指令 `tsc && vite build` 先型別檢查再打包 |

**樣式技術**：只有 React inline style 物件與一份全域 `index.css`。沒有 CSS framework（Tailwind、Bootstrap）、CSS-in-JS、CSS Modules、PostCSS 設定、UI component library、icon library、字體檔或動畫函式庫。

**狀態與資料**：只有 React Context（auth）與元件內 `useState`；資料抓取用原生 `fetch`。沒有 Redux / Zustand、React Query / SWR、axios 或表單函式庫。

**本 intent 相關**：使用者允許導入 Tailwind、GSAP 等套件。目前 frontend 沒有 `tailwind.config.*`、`postcss.config.*`，也沒有任何動畫相依；導入它們是新增相依與新設定檔。React 18 與 Vite 5 都在主流支援範圍內。

## 後端（packages/api）

| 類別 | 套件 | 版本 | 備註 |
|------|------|------|------|
| Web framework | express | 4.21.2（`^4.18.2`） | |
| Database driver | better-sqlite3 | 9.6.0（`^9.2.2`） | 同步 API，native module |
| 密碼雜湊 | bcrypt | 6.0.0（`^6.0.0`） | native module，cost 10 |
| 驗證 | jsonwebtoken | 9.0.3（`^9.0.3`） | HS256 預設演算法，7 天效期 |
| 限流 | express-rate-limit | 8.5.2（`^8.5.2`） | |
| CORS | cors | 2.8.5（`^2.8.5`） | 預設全開 |
| AWS SDK | @aws-sdk/client-bedrock-runtime | 3.1068.0（`^3.1068.0`） | Bedrock `InvokeModel` |
| Dev runner | tsx | 4.20.6（`^4.7.0`） | `tsx watch src/index.ts` |
| 型別 | @types/express 4.17.25、@types/better-sqlite3 7.6.13、@types/bcrypt 6.0.0、@types/cors 2.8.19、@types/jsonwebtoken 9.0.10、@types/node 20.19.24 | | |
| TS 設定 | `tsconfig.json` | target / module ES2022、`moduleResolution: node`、`outDir: dist` | |

## 資料儲存

- **SQLite**（單一檔案 `packages/api/inventrix.db`，被 `.gitignore` 排除），由 API process 內嵌開啟。
- **本機檔案系統**：`packages/api/public/images/` 存放商品圖（24 張 seed PNG + AI 生成圖）。

## 雲端與 AI 服務

- **Amazon Bedrock**：`amazon.nova-canvas-v1:0` 文字生成圖片；region 由 `AWS_REGION` 決定，預設 `us-east-1`。
- **Amazon EC2**：`deploy.sh` 建立的單一 Amazon Linux 2023 instance。

## 建置與部署工具

| 工具 | 用途 |
|------|------|
| pnpm（workspace，lockfile v9） | 套件管理；`pnpm-workspace.yaml` 有 `path-to-regexp`、`qs` overrides 與 native build allowlist（bcrypt、better-sqlite3、esbuild） |
| tsc | 後端編譯、前端型別檢查 |
| PM2 | 正式環境以 `pm2 start dist/index.js` 常駐 API |
| nginx | 正式環境的靜態檔與反向代理，自簽 TLS 憑證 |
| AWS CLI | `deploy.sh` / `destroy.sh` 操作 EC2 資源 |

## 未使用的工具類別

測試框架、linter、formatter、CI/CD、container、IaC 都沒有，詳見 `code-quality-assessment.md`。
