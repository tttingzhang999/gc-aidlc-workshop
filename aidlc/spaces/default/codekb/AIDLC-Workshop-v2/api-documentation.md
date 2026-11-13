# API Documentation

## 概要

- **Base path**：`/api`（開發時經 Vite proxy、正式環境經 nginx，前端一律用相對路徑）
- **格式**：JSON（`express.json()`）；回應欄位直接是 SQLite 欄位名稱，為 snake_case
- **驗證**：`Authorization: Bearer <JWT>`，JWT payload 為 `{ id, email, role }`，效期 7 天（`middleware/auth.ts`）
- **錯誤格式**：`{ "error": "<message>" }`；沒有 error code、欄位明細或 request ID
- **限流**：`authRateLimit` 每 IP 15 分鐘 20 次；`protectedRouteRateLimit` 每 IP 15 分鐘 300 次；超限回 429 與 `{ error }`，header 採 `draft-8` 標準
- **版本**：無版本前綴；沒有 OpenAPI 規格
- **CORS**：`cors()` 預設設定，允許任何 origin

## 資料模型（回應 shape）

```ts
// products 表
interface Product { id: number; name: string; description: string | null; price: number; stock: number; image_url: string | null; created_at: string }

// orders 表（admin 列表與明細會多 user_name、user_email）
interface Order { id: number; user_id: number; subtotal: number; gst: number; total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'; created_at: string;
  user_name?: string; user_email?: string }

// order_items 表（明細 API 會多 product_name）
interface OrderItem { id: number; order_id: number; product_id: number; quantity: number; price: number; product_name?: string }

// 對外的 user（不含 password）
interface PublicUser { id: number; email: string; name: string; role: 'admin' | 'customer' }
```

`created_at` 是 SQLite `CURRENT_TIMESTAMP` 字串（UTC，格式 `YYYY-MM-DD HH:MM:SS`，不含時區標記），前端用 `new Date(...)` 解析。

## Endpoint 清單

| # | Method | Path | Middleware | 前端使用者 |
|---|--------|------|-----------|-----------|
| 1 | POST | `/api/auth/login` | authRateLimit | `AuthContext.login` |
| 2 | POST | `/api/auth/register` | authRateLimit | `AuthContext.register` |
| 3 | GET | `/api/products` | 無 | `Storefront`、`AdminProducts` |
| 4 | GET | `/api/products/:id` | 無 | `ProductDetail` |
| 5 | POST | `/api/products` | protectedRouteRateLimit, authenticate, requireAdmin | `AdminProducts` |
| 6 | PUT | `/api/products/:id` | 同上 | `AdminProducts` |
| 7 | DELETE | `/api/products/:id` | 同上 | `AdminProducts` |
| 8 | POST | `/api/products/generate-image` | 同上 | `AdminProducts` |
| 9 | GET | `/api/orders` | protectedRouteRateLimit, authenticate | `Orders`、`AdminOrders` |
| 10 | GET | `/api/orders/:id` | protectedRouteRateLimit, authenticate | **未使用** |
| 11 | POST | `/api/orders` | protectedRouteRateLimit, authenticate | `ProductDetail` |
| 12 | PATCH | `/api/orders/:id/status` | protectedRouteRateLimit, authenticate, requireAdmin | `AdminOrders` |
| 13 | GET | `/api/analytics/dashboard` | protectedRouteRateLimit, authenticate, requireAdmin | `AdminDashboard` |
| 14 | GET | `/api/analytics/inventory` | 同上 | `AdminInventory` |
| 15 | GET | `/images/*` | `express.static`（非 `/api`） | 所有顯示商品圖的頁面 |

## Endpoint 明細

### Auth

**POST `/api/auth/login`**
- Body：`{ email: string, password: string }`
- 200：`{ token: string, user: PublicUser }`
- 401：`{ error: 'Invalid credentials' }`
- 沒有欄位驗證；缺少 `password` 時 `bcrypt.compareSync` 會丟例外，落到 Express 預設 500。

**POST `/api/auth/register`**
- Body：`{ email: string, password: string, name: string }`
- 201：`{ token, user: { id, email, name, role: 'customer' } }`
- 400：`{ error: 'Email already registered' }`
- 沒有 email 格式或密碼強度檢查；角色固定 `customer`。

### Products

**GET `/api/products`** → 200 `Product[]`，依 `created_at DESC` 排序。沒有分頁、搜尋、篩選。

**GET `/api/products/:id`** → 200 `Product`；404 `{ error: 'Product not found' }`。

**POST `/api/products`**（admin）
- Body：`{ name, description, price, stock, image_url }`
- 201：`{ id, name, description, price, stock, image_url }`（不含 `created_at`）
- 無驗證；缺 `name` 或 `price` 時 SQLite `NOT NULL` 觸發例外 → 500。

**PUT `/api/products/:id`**（admin）
- Body 同上，整筆覆寫
- 200：`{ id, ...body }`，`id` 為字串（取自 `req.params`）；id 不存在時仍回 200

**DELETE `/api/products/:id`**（admin）→ 204。已有訂單引用的商品刪除行為取決於 SQLite foreign key 設定；程式沒有開啟 `PRAGMA foreign_keys`，所以會成功刪除，留下孤兒 `order_items`。

**POST `/api/products/generate-image`**（admin）
- Body：`{ productName: string, description: string }`
- 200：`{ imageUrl: '/images/<timestamp>-<name>.png' }`
- 500：`{ error: 'Image generation failed' }`
- 需要 AWS 憑證與 Bedrock `amazon.nova-canvas-v1:0` 的模型存取權；region 取 `AWS_REGION`，預設 `us-east-1`。呼叫時間通常數秒，前端需顯示等待狀態。

### Orders

**GET `/api/orders`**
- admin：所有訂單 + `user_name`、`user_email`
- customer：只有自己的訂單（不含 user 欄位）
- 依 `created_at DESC`；無分頁

**GET `/api/orders/:id`**
- 200：`Order & { user_name, user_email, items: OrderItem[] }`（items 含 `product_name`）
- 403：非 admin 且非本人；404：不存在
- 目前前端沒有訂單明細頁，此 API 可直接支援重構時新增的明細或展開 UI。

**POST `/api/orders`**
- Body：`{ items: Array<{ product_id: number, quantity: number }> }`（支援多品項）
- 201：`{ id, subtotal, gst, total, status: 'pending' }`
- 400：`{ error: 'Insufficient stock for product <id>' }`（商品不存在也回這個訊息）
- 規則：價格取下單時的商品價格；`gst = subtotal * 0.1`；成功後扣庫存。未驗證 `quantity > 0`，也沒有 transaction。

**PATCH `/api/orders/:id/status`**（admin）
- Body：`{ status }`
- 200：`{ id, status }`
- 非法 status 會違反 `CHECK` constraint → 500。不檢查狀態轉換順序。

### Analytics（admin）

**GET `/api/analytics/dashboard`** → 200
```json
{
  "summary": { "totalRevenue": 0, "totalOrders": 0, "totalProducts": 0, "lowStockItems": 0 },
  "recentOrders": [{ "id": 0, "total": 0, "status": "pending", "created_at": "", "user_name": "" }],
  "topProducts": [{ "name": "", "total_sold": 0, "revenue": 0 }],
  "ordersByStatus": [{ "status": "pending", "count": 0 }]
}
```
- `totalRevenue` 排除 `cancelled`；`recentOrders` 取 10 筆；`topProducts` 取 5 筆。`ordersByStatus` 目前前端沒有顯示，可直接用於重構後的圖表。

**GET `/api/analytics/inventory`** → 200 `Array<{ id, name, stock, price, status: 'out_of_stock' | 'low_stock' | 'in_stock' }>`，依 `stock ASC`。

## 外部 API（outbound）

| 服務 | 呼叫位置 | 操作 | 設定 |
|------|---------|------|------|
| Amazon Bedrock Runtime | `services/imageGenerator.ts` | `InvokeModel`，`taskType: TEXT_IMAGE`，512x512，`cfgScale 7.0`，固定 negative prompt | `AWS_REGION`（預設 `us-east-1`），憑證走 AWS SDK 預設 credential chain |

## 前端呼叫慣例（重構時的注意點）

- 所有呼叫都是頁面內直接 `fetch`；只有 `AuthContext` 檢查 `res.ok`，其他頁面都直接 `res.json()`。401（token 過期）時頁面會把 `{ error }` 當成資料 set 進 state，例如 `Orders` 會對物件呼叫 `.map` 而出錯。
- 寫入後一律重新抓整個列表，沒有樂觀更新或快取。
- 重構時若改成共用 API client，建議統一處理：Bearer header、`res.ok`、401 自動登出、錯誤訊息轉換成 toast。
