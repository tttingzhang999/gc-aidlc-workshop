# Code Quality Assessment

本檔是品質發現與技術債的唯一清單；其他 artifact 以引用方式指向這裡。秘密值（預設 JWT secret、seed 密碼）只記錄位置，不複製內容。

## 總覽

| 面向 | 狀態 | 說明 |
|------|------|------|
| 測試 | 無 | 沒有測試檔、測試框架、test script 或 coverage 設定 |
| Linting / formatting | 無 | 沒有 ESLint、Prettier 或 EditorConfig；只有 TypeScript `strict` |
| 型別安全 | 尚可 | 兩邊都 `strict`；但後端大量 `as any`，前端 Dashboard 用 `any[]` |
| CI/CD | 無 CI | 只有手動的 `deploy.sh` / `destroy.sh` |
| 文件 | 尚可 | `inventrix-code/README.md` 涵蓋功能、啟動與部署；程式內幾乎沒有註解；沒有 API 規格 |
| 錯誤處理 | 差 | 後端只有一個 try/catch；前端幾乎不檢查回應狀態 |
| 安全性 | 差 | 寫死的 secret fallback、預設帳密、無輸入驗證 |
| UI/UX 一致性 | 差 | inline style、兩套色彩語言、缺 loading / error / empty 狀態、無 RWD |

## 程式碼品質快速評分（code-analysis-guide 3 級制）

| 指標 | 後端 | 前端 | 依據 |
|------|------|------|------|
| Naming clarity | good | good | 檔名、函式、state 名稱都能自我說明 |
| Function size | good | fair | 後端 handler 都在 30 行左右；前端頁面元件把資料、邏輯、樣式寫在同一個函式，`AdminProducts` 139 行 |
| Error handling | poor | poor | 見下方 Q-ERR 系列 |
| Test presence | poor | poor | 沒有任何測試 |
| Duplication | fair | poor | 前端重複的 interface、卡片樣式、表格樣式、漸層字串、hover handler |
| Dead code | good | fair | `ordersByStatus` 取得未用；`GET /api/orders/:id` 無前端使用者 |

## 發現清單

### 安全性（後端，非本 intent 範圍，記錄供後續處理）

| ID | 嚴重度 | 位置 | 說明 |
|----|--------|------|------|
| Q-SEC-1 | High | `packages/api/src/middleware/auth.ts:4` | 缺少 `JWT_SECRET` 時退回寫死的 secret；`deploy.sh` 沒有設定此變數，正式環境實際使用 fallback，任何知道原始碼的人都能偽造 admin token |
| Q-SEC-2 | High | `packages/api/src/db.ts:52-53`、`inventrix-code/README.md`、`deploy.sh` 結尾 | 以寫死的預設密碼 seed admin 與 customer 帳號，並在文件與部署輸出中公開 |
| Q-SEC-3 | Medium | `packages/api/src/routes/*.ts` | 所有 body 都未驗證型別、長度、範圍（例如 `quantity` 可為負數，負數會增加庫存並產生負金額訂單） |
| Q-SEC-4 | Medium | `packages/api/src/services/imageGenerator.ts:39` | 檔名由 `productName` 組成，未過濾 `/` 與 `..`，admin 可寫到 `public/images` 以外的路徑 |
| Q-SEC-5 | Low | `packages/api/src/index.ts` | `cors()` 允許任何 origin |
| Q-SEC-6 | Low | `packages/frontend/src/context/AuthContext.tsx` | JWT 存 `localStorage`，XSS 時可被讀取；沒有 token 過期處理 |
| Q-SEC-7 | Low | `deploy.sh` | 自簽憑證；ssh 使用 `StrictHostKeyChecking=no` |

SQL 全部使用參數綁定，未發現 SQL injection。React 預設跳脫輸出，未發現 `dangerouslySetInnerHTML`。

### 資料一致性與錯誤處理

| ID | 嚴重度 | 位置 | 說明 |
|----|--------|------|------|
| Q-ERR-1 | Medium | `packages/api/src/routes/orders.ts:49-81` | 建立訂單時檢查庫存、寫訂單、寫明細、扣庫存是分開的同步呼叫，沒有 `db.transaction`；中途失敗會留下不一致資料 |
| Q-ERR-2 | Medium | `packages/api/src/index.ts` | 沒有集中式錯誤處理；違反 `NOT NULL` / `CHECK` 的請求回 Express 預設 HTML 500，前端無法解析 |
| Q-ERR-3 | Low | `packages/api/src/routes/products.ts` | PUT / DELETE 對不存在的 id 仍回成功 |
| Q-ERR-4 | Low | `packages/api/src/db.ts` | 未開啟 `PRAGMA foreign_keys`，刪除商品會留下孤兒 `order_items`，之後的 JOIN 會漏掉這些品項 |
| Q-ERR-5 | Low | `packages/api/src/db.ts:4`、`services/imageGenerator.ts` | DB 與圖片目錄都相對 `process.cwd()`，從其他目錄啟動會建立新的空 DB 或把圖片寫到錯的位置 |

### 前端（本 intent 的重構對象）

| ID | 嚴重度 | 位置 | 說明 |
|----|--------|------|------|
| Q-FE-1 | High | `src/App.tsx:14`、`src/context/AuthContext.tsx:24` | `ProtectedRoute` 在 `user` 還原前就判斷，重新整理 `/orders`、`/admin/*` 會被導回 `/login` |
| Q-FE-2 | Medium | 所有頁面 | `fetch` 不檢查 `res.ok` 也不 `catch`；401 或 500 時把 `{ error }` 寫進 state，列表頁會因 `.map` 不存在而 crash，`ProductDetail` 404 時渲染空白商品 |
| Q-FE-3 | Medium | `Storefront`、`Orders`、`AdminOrders`、`AdminInventory`、`AdminProducts` | 沒有 loading 狀態；`ProductDetail`、`AdminDashboard` 只有純文字 `Loading...` |
| Q-FE-4 | Medium | `Storefront`、`Orders`、`AdminOrders`、`AdminInventory` | 沒有 empty 狀態（例如沒有訂單時只剩標題） |
| Q-FE-5 | Medium | 所有元件 | 樣式幾乎全為 inline style；hover 以 `onMouseEnter` / `onMouseLeave` 改 DOM；無法使用 media query、偽類或主題 |
| Q-FE-6 | Medium | `Layout`、`Login`、`Register`、`Storefront` vs. 後台頁與 `ProductDetail`、`Orders` | 兩套視覺語言：前者用紫色漸層與大圓角，後者用 Bootstrap 色（`#007bff` 等）與 8px 圓角；價格顏色在店面與明細頁不同 |
| Q-FE-7 | Medium | `Layout`、`AdminDashboard`、所有表格 | 沒有 RWD：固定 `3rem` padding、4 欄統計卡、寬表格在手機上溢出；導覽列沒有行動版 |
| Q-FE-8 | Medium | `ProductDetail`、`AdminProducts`、`AdminOrders` | 操作回饋薄弱：下單只有一行文字，後台用原生 `alert()` / `confirm()`，改訂單狀態沒有任何回饋；送出中沒有 disabled，可重複下單 |
| Q-FE-9 | Low | `Login`、`Register`、`AdminProducts` | 表單只有 placeholder 沒有 `<label>`；錯誤訊息固定，未顯示伺服器原因；emoji 當圖示沒有替代文字 |
| Q-FE-10 | Low | `Storefront`、`ProductDetail`、`AdminProducts`、`Orders`、`AdminOrders` | `Product`、`Order` interface 重複定義；沒有共用 API client |
| Q-FE-11 | Low | `AdminDashboard` | `ordersByStatus` 取得但未顯示；`<Link><button>` 巢狀互動元素 |
| Q-FE-12 | Low | `App.tsx` | 沒有 404 route；登入後不會回到原本要去的頁面 |
| Q-FE-13 | Low | 功能缺口 | 沒有購物車（API 已支援多品項訂單）、沒有訂單明細頁（API 已有 `GET /api/orders/:id`）、沒有搜尋或篩選 |
| Q-FE-14 | Low | `Storefront`、`AdminProducts` | 價格未格式化為兩位小數；沒有 `Intl.NumberFormat` |

### 資料與其他

| ID | 嚴重度 | 位置 | 說明 |
|----|--------|------|------|
| Q-DATA-1 | Low | `packages/api/src/db.ts` seed | 兩項商品同名 `Tablet 10"`（價格與描述不同） |
| Q-OPS-1 | Low | `destroy.sh` | 手動模式預設 region `ap-southeast-2`，與 `deploy.sh` 預設 `ap-northeast-2` 不一致 |
| Q-OPS-2 | Low | 整體 | 沒有 health check、結構化 log 或監控 |

## 技術債指標統計

- TODO / FIXME / HACK 註解：0
- 被抑制的 linter 警告：0（沒有 linter）
- 寫死的 secret / 預設帳密：2 處（Q-SEC-1、Q-SEC-2）
- 寫死的 magic number：GST 0.1、低庫存門檻 10、JWT 效期 7d、限流次數、圖片尺寸 512
- 巢狀超過 3 層的條件：無
- 超過 500 行的檔案：無（最大為 `AdminProducts.tsx` 139 行）
- I/O 缺少錯誤處理：後端大多數 DB 呼叫、前端所有 `fetch`

## 對 UI/UX 重構的建議基線

1. 先修 Q-FE-1，避免頁面轉場與受保護路由互相干擾。
2. 建立共用的 API client 與型別，一次解決 Q-FE-2、Q-FE-10，並提供統一的錯誤事件來源給 toast 系統。
3. 以 design token 與共用元件取代 inline style（Q-FE-5、Q-FE-6），再加上 loading skeleton、empty、error 元件（Q-FE-3、Q-FE-4）與 toast / modal 取代 `alert()` / `confirm()`（Q-FE-8）。
4. 加入動畫時同時處理 `prefers-reduced-motion`，並在送出中鎖定按鈕避免重複下單。
5. 目前沒有任何測試或 linter；Build and Test 階段可依賴的自動化檢查只有 `tsc`（`pnpm --filter frontend build`）。
