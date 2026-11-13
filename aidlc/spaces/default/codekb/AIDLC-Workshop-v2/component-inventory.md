# Component Inventory

元件名稱即下方 `###` 標題，`reverse-engineering-timestamp.md` 的 `analyzed.components` 逐字引用這些名稱。端點細節見 `api-documentation.md`，品質問題的完整清單見 `code-quality-assessment.md`。

## 前端（packages/frontend）

### 前端頁面總覽

| 路由 | 元件 | 保護 | 在 Layout 內 | API | Loading | Error | Empty |
|------|------|------|-------------|-----|---------|-------|-------|
| `/login` | page-login | 無 | 否 | login | 無 | 固定文字 | 不適用 |
| `/register` | page-register | 無 | 否 | register | 無 | 固定文字 | 不適用 |
| `/` | page-storefront | 無 | 是 | GET products | 無（空白） | 無 | 無 |
| `/products/:id` | page-product-detail | 無（下單需登入） | 是 | GET product、POST order | `Loading...` 文字 | 下單失敗文字；404 未處理 | 不適用 |
| `/orders` | page-orders | 登入 | 是 | GET orders | 無 | 無 | 無 |
| `/admin` | page-admin-dashboard | admin | 是 | GET dashboard | `Loading...` 文字 | 無 | 表格空白 |
| `/admin/products` | page-admin-products | admin | 是 | GET/POST/PUT/DELETE products、generate-image | 只有生成圖按鈕 | `alert()` | 無 |
| `/admin/orders` | page-admin-orders | admin | 是 | GET orders、PATCH status | 無 | 無 | 無 |
| `/admin/inventory` | page-admin-inventory | admin | 是 | GET inventory | 無 | 無 | 無 |

沒有 404 catch-all route；未知路徑會渲染 `Layout` 但 `Outlet` 為空。

### frontend-app-shell

- **檔案**：`src/main.tsx`、`src/App.tsx`、`index.html`、`vite.config.ts`
- **職責**：掛載 React root（`StrictMode`）、載入 `index.css`、定義 `BrowserRouter` 路由表與 `ProtectedRoute`。
- **`ProtectedRoute`**：沒有 `user` 時 `<Navigate to="/login" />`；`adminOnly` 且非 admin 時導回 `/`。導向不帶 `replace`，也不記住原本要去的頁面。
- **已知問題**：`user` 在 `AuthContext` 的 `useEffect` 中才還原，重新整理受保護頁面會先被導回 `/login`（見 `architecture.md` 的互動圖）。
- **相依**：auth-context、layout、9 個 page 元件、react-router-dom。
- **HTML**：`<title>Inventrix - E-Commerce Platform</title>`，`lang="en"`，沒有 favicon 或 meta description。

### auth-context

- **檔案**：`src/context/AuthContext.tsx`
- **職責**：保存 `user`、`token`，提供 `login`、`register`、`logout`；同步寫入 / 清除 `localStorage` 的 `token` 與 `user`。
- **介面**：`useAuth(): { user: User | null; token: string | null; login(email, password): Promise<void>; register(email, password, name): Promise<void>; logout(): void }`；在 Provider 外呼叫會丟錯。
- **行為**：`token` 在 `useState` 初始值同步讀取；`user` 在 `useEffect` 非同步還原（造成上述時序問題）。API 失敗時丟出通用 `Error('Login failed' | 'Registration failed')`，伺服器回傳的錯誤訊息被丟棄。沒有 `isLoading`、token 過期處理或 401 自動登出。
- **相依**：`/api/auth/login`、`/api/auth/register`。

### layout

- **檔案**：`src/components/Layout.tsx`
- **職責**：頂部導覽列與主內容區（`<Outlet />`）。
- **導覽內容**：品牌 `✨ Inventrix`、`Store`、登入後 `My Orders`、admin 才有 `Admin`；右側登入時顯示 `👤 {name}` 膠囊與 `Logout` 按鈕，未登入顯示 `Login` / `Register` 連結。
- **樣式**：漸層背景導覽列、`padding: 1.5rem 3rem`；hover 以 `onMouseEnter` / `onMouseLeave` 改 opacity、background、transform。主內容 `maxWidth: 1400px`、`padding: 3rem`。
- **缺口**：沒有 active link 標示、沒有行動版選單、沒有 footer、沒有購物車圖示。
- **相依**：auth-context、react-router-dom。

### global-styles

- **檔案**：`src/index.css`（49 行）
- **內容**：`* { margin:0; padding:0; box-sizing:border-box }`；`body` 使用系統字型與固定的紫色漸層背景（`background-attachment: fixed`）；全域 `button`（padding、圓角 8px、陰影、hover 上移 2px、disabled 半透明）；全域 `input, select, textarea`（`width: 100%`、2px 邊框、focus 紫色外框）。
- **影響**：所有 `<button>` 與 `<input>` 都繼承這些樣式，包括表格內的 Edit / Delete 按鈕與 `ProductDetail` 的數量輸入框。導入 Tailwind 時，preflight 會與這份 reset 重疊，需要決定取捨。
- **缺口**：沒有 CSS 變數、深色模式、字體載入、`prefers-reduced-motion` 處理或 RWD 斷點。

### page-login

- **檔案**：`src/pages/Login.tsx`（37 行）
- **UI**：置中白色卡片（`maxWidth 450px`、圓角 20px、大陰影），漸層文字標題 `Welcome Back`、email / password 輸入框（只有 placeholder）、漸層 Login 按鈕、前往註冊的連結。
- **狀態**：`email`、`password`、`error`。送出時沒有 loading 或 disabled，失敗只顯示固定的 `❌ Invalid credentials`（包含 429 限流時）。成功後 `navigate('/')`。

### page-register

- **檔案**：`src/pages/Register.tsx`（39 行）
- **UI**：與 Login 相同卡片樣式，多一個 Full Name 欄位，標題 `Join Inventrix`。
- **狀態**：`email`、`password`、`name`、`error`。失敗固定顯示 `Registration failed`（包含 email 重複），沒有 loading，沒有密碼規則提示。

### page-storefront

- **檔案**：`src/pages/Storefront.tsx`（48 行）
- **資料**：mount 時 `GET /api/products`，沒有錯誤處理。
- **UI**：白色標題 `🛍️ Featured Products`；`grid repeat(auto-fill, minmax(300px, 1fr))` 卡片格，每張卡片含 4:3 圖片、名稱、描述、漸層價格、庫存膠囊（綠 / 紅）。整張卡片是 `<Link>`，hover 上移 8px 並加深陰影。
- **缺口**：沒有 loading skeleton、空狀態、錯誤狀態、搜尋、分類、排序、分頁或加入購物車；價格直接輸出 `${product.price}`，沒有固定小數位。

### page-product-detail

- **檔案**：`src/pages/ProductDetail.tsx`（81 行）
- **資料**：依 `:id` 取得商品；`POST /api/orders` 下單（單一品項）。
- **UI**：`maxWidth 800px` 白卡、400px 高的圖片、名稱、描述、藍色價格（`#007bff`，與店面的漸層價格不一致）、庫存文字；有庫存時顯示數量輸入框與 `Place Order` 按鈕。
- **互動**：未登入按下單會導向 `/login`（不會帶回原頁）；成功顯示 `Order placed successfully!`，2 秒後跳 `/orders`；失敗顯示 `Order failed`。下單中沒有 disabled，可重複送出。
- **缺口**：載入中只有 `Loading...`；商品不存在時 API 回 `{ error }`，頁面會把它當商品渲染出空白內容；數量沒有前端範圍檢查（`max` 只是 HTML 屬性）；沒有返回列表的連結。

### page-orders

- **檔案**：`src/pages/Orders.tsx`（58 行）
- **資料**：`GET /api/orders`（帶 token）。
- **UI**：標題 `My Orders`；每筆訂單一張白卡，左側 `Order #id` 與日期，右側 Subtotal、`GST (10%)`、Total 與狀態色塊（pending 黃、processing 青、shipped 藍、delivered 綠、cancelled 紅）。
- **缺口**：沒有 loading 與空狀態（沒有訂單時畫面只有標題）；無法展開看訂單內的商品（`GET /api/orders/:id` 未使用）；token 失效時 `orders.map` 會因回傳物件而出錯。

### page-admin-dashboard

- **檔案**：`src/pages/AdminDashboard.tsx`（98 行）
- **資料**：`GET /api/analytics/dashboard`。
- **UI**：標題列右側三個導覽按鈕（Manage Products / Manage Orders / Inventory，以 `<Link><button>` 巢狀實作）；`repeat(4, 1fr)` 的 4 張統計卡（Total Revenue、Total Orders、Total Products、Low Stock Items）；`2fr 1fr` 兩欄：Recent Orders 表格與 Top Products 清單。
- **缺口**：`ordersByStatus` 已取得但未顯示；沒有圖表；固定 4 欄在窄螢幕會擠壓；`any[]` 型別；沒有錯誤狀態。

### page-admin-products

- **檔案**：`src/pages/AdminProducts.tsx`（139 行，前端最大的檔案）
- **資料**：列表、新增、修改、刪除、AI 生成圖片。
- **UI**：上方新增 / 編輯表單卡（Name、Description、Price、Stock、Image URL + `Generate Image` 按鈕、圖片預覽、Add/Update 與 Cancel 按鈕）；下方商品表格（Name、Price、Stock、Edit 黃色按鈕、Delete 紅色按鈕）。
- **互動**：Edit 把整列資料放進表單（不會捲動到表單）；Delete 用原生 `confirm()`；生成圖片中按鈕顯示 `Generating...` 並 disabled，失敗用 `alert()`；送出後不檢查回應狀態，失敗也會清空表單。
- **缺口**：沒有成功回饋、沒有欄位錯誤、沒有搜尋或分頁、表格沒有縮圖。

### page-admin-orders

- **檔案**：`src/pages/AdminOrders.tsx`（86 行）
- **資料**：`GET /api/orders`（admin 版含客戶資訊）、`PATCH /api/orders/:id/status`。
- **UI**：8 欄表格（Order ID、Customer、Subtotal、GST、Total、Status、Date、Actions），Actions 欄為狀態下拉選單。
- **互動**：選單一改變就立即送出，沒有確認、沒有更新中狀態、沒有成功或失敗回饋；Status 欄只是純文字，沒有色塊（與 `Orders` 頁不一致）。
- **缺口**：沒有篩選、排序、搜尋；表格在窄螢幕會溢出。

### page-admin-inventory

- **檔案**：`src/pages/AdminInventory.tsx`（67 行）
- **資料**：`GET /api/analytics/inventory`（依庫存由少到多排序）。
- **UI**：4 欄表格（Product、Stock、Price、Status 色塊：Out of Stock 紅、Low Stock 黃、In Stock 綠）。
- **缺口**：唯讀，無法直接調整庫存；沒有視覺化（例如庫存條）；沒有 loading 或空狀態。

## 後端（packages/api）

### api-server

- **檔案**：`src/index.ts`
- **職責**：建立 Express app、套用 `cors()` 與 `express.json()`、以 `express.static` 提供 `/images`、呼叫 `initDb()`、掛載 4 個 router、listen `PORT`（預設 3000）。
- **相依**：db-module、auth-routes、products-routes、orders-routes、analytics-routes。
- **缺口**：沒有集中式錯誤處理 middleware、request logging、health check endpoint 或 graceful shutdown。

### db-module

- **檔案**：`src/db.ts`
- **職責**：開啟 `inventrix.db`（路徑相對於 `process.cwd()`）；建立 `users`、`products`、`orders`、`order_items` 四張表；users 為空時 seed 2 個帳號與 24 項商品；`export default db` 供 route 直接使用。
- **Schema 重點**：`users.role` 與 `orders.status` 有 `CHECK` constraint；外鍵有宣告但未開啟 `PRAGMA foreign_keys`；沒有 index（除 PK 與 `users.email` UNIQUE）；沒有 migration 機制。
- **相依**：better-sqlite3、bcrypt。

### auth-middleware

- **檔案**：`src/middleware/auth.ts`
- **職責**：`authenticate` 解析 Bearer token 並把 payload 放到 `req.user`；`requireAdmin` 檢查 `role === 'admin'`；`generateToken` 以 7 天效期簽發 JWT。
- **注意**：`JWT_SECRET` 環境變數缺少時退回寫死的預設值（安全性發現，值不在此複製）。
- **相依**：jsonwebtoken。

### rate-limit-middleware

- **檔案**：`src/middleware/rateLimit.ts`
- **職責**：`authRateLimit`（15 分鐘 20 次）與 `protectedRouteRateLimit`（15 分鐘 300 次）。公開的 GET products 沒有限流。
- **相依**：express-rate-limit。

### auth-routes

- **檔案**：`src/routes/auth.ts`
- **職責**：`POST /login`、`POST /register`。
- **相依**：db-module、auth-middleware（`generateToken`）、rate-limit-middleware、bcrypt。

### products-routes

- **檔案**：`src/routes/products.ts`
- **職責**：商品 CRUD 與 `POST /generate-image`。
- **相依**：db-module、auth-middleware、rate-limit-middleware、image-generator-service。

### orders-routes

- **檔案**：`src/routes/orders.ts`
- **職責**：訂單列表（依角色）、明細（含品項與權限檢查）、建立（庫存檢查、GST 10%、扣庫存）、改狀態。
- **相依**：db-module、auth-middleware、rate-limit-middleware。

### analytics-routes

- **檔案**：`src/routes/analytics.ts`
- **職責**：`GET /dashboard`（營收、數量、低庫存、最近訂單、熱銷、狀態分布）與 `GET /inventory`（庫存狀態分類）。低庫存門檻 10 寫死在 SQL 內。
- **相依**：db-module、auth-middleware、rate-limit-middleware。

### image-generator-service

- **檔案**：`src/services/imageGenerator.ts`
- **職責**：組 prompt、呼叫 Bedrock `amazon.nova-canvas-v1:0` 生成 512x512 PNG、寫入 `process.cwd()/public/images/`、回傳 `/images/<file>`。
- **注意**：檔名由 `productName` 產生，只替換空白，未過濾路徑字元。
- **相依**：@aws-sdk/client-bedrock-runtime、Node `fs` / `path`。

## 維運

### deploy-scripts

- **檔案**：`inventrix-code/deploy.sh`、`inventrix-code/destroy.sh`
- **職責**：`deploy.sh` 以互動方式選 AWS profile / region（預設 `ap-northeast-2`）/ instance type（預設 `t3.small`），建立 security group（22、80、443、3000 只開給執行者 IP）、key pair、Amazon Linux 2023 EC2（IMDSv2、EBS 加密），安裝 Node 22、pnpm、PM2、nginx，上傳 tar、`pnpm install && pnpm build`、以 PM2 啟動 API，設定 nginx（自簽憑證，HTTP 轉 HTTPS，`/` 提供前端 `dist`，`/api` 與 `/images` 代理到 3000），並寫出 `setup_info.txt`。`destroy.sh` 讀 `setup_info.txt` 終止 instance、刪除 security group、key pair 與本地 `.pem`（手動模式預設 region 為 `ap-southeast-2`，與 deploy 預設不同）。
- **注意**：deploy 沒有設定 `JWT_SECRET`，正式環境會使用預設 secret；腳本結尾會印出預設帳密。
- **相依**：AWS CLI、ssh / scp、curl。
