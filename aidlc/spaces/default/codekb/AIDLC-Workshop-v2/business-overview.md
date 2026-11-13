# Business Overview

## 業務領域

Workspace root 是 AIDLC 工作坊的範本專案，實際被當作 brownfield codebase 的應用程式是 `inventrix-code/` 底下的 **Inventrix**：一個全端電商平台，同時涵蓋「線上店面」與「後台營運管理」。授權為 MIT-0。

Inventrix 的業務核心是一家販售 3C 電子配件（筆電、滑鼠、鍵盤、螢幕、耳機等）的小型商店。系統預先 seed 24 項商品，價格從 9.99 到 1299.99（幣別在程式中未標示，畫面以 `$` 顯示），並對每筆訂單加收 10% GST（Goods and Services Tax）。

## 使用者角色

| 角色 | 來源 | 可做的事 |
|------|------|----------|
| 訪客 | 未登入 | 瀏覽商品列表與商品明細；按下單時會被導向登入頁 |
| Customer | 自行註冊或 seed 帳號 | 對單一商品下單、查看自己的訂單列表 |
| Admin | 只有 seed 帳號（註冊一律是 customer） | 看營運儀表板、商品 CRUD、用 AI 生成商品圖、修改訂單狀態、查看庫存狀態 |

角色只有 `admin` 與 `customer` 兩種，由 `users.role` 欄位的 `CHECK` constraint 限制。

## 主要功能

1. **商品目錄與店面**：卡片式商品列表（圖片、名稱、描述、價格、庫存標籤），點入看明細。
2. **下單**：在商品明細頁選數量後直接下單；後端計算小計、10% GST、總額，並扣庫存。目前沒有購物車，一次只能買一項商品。
3. **訂單追蹤**：customer 看自己的訂單（狀態色塊、小計、GST、總額）；admin 看全部訂單並用下拉選單切換狀態。
4. **訂單狀態流程**：`pending` → `processing` → `shipped` → `delivered`，或 `cancelled`。系統不強制轉換順序，admin 可任意改。
5. **庫存管理**：庫存 0 為 `out_of_stock`，小於 10 為 `low_stock`，其餘為 `in_stock`；儀表板顯示低庫存數量。
6. **營運分析**：總營收（排除 cancelled）、訂單數、商品數、低庫存數、最近 10 筆訂單、銷量前 5 商品、各狀態訂單數。
7. **AI 商品圖生成**：admin 輸入商品名稱與描述後，後端呼叫 Amazon Bedrock（Nova Canvas）生成 512x512 商品照，存在 API server 的 `public/images/`。

## 使用者旅程（目前的介面）

- **購物旅程**：店面列表 → 商品明細 → 輸入數量 → Place Order → 顯示文字訊息 → 2 秒後跳到 My Orders。
- **認證旅程**：Login / Register 是獨立全頁表單（不在 `Layout` 外框內），成功後回到店面。
- **營運旅程**：Admin 導覽列 → Dashboard → 按鈕前往 Manage Products / Manage Orders / Inventory。

## 本 intent 的業務脈絡

本 intent（`261113-frontend-uiux-redesign`）要對 web 服務的 UI/UX 做完整重構，追求誇張、強烈的視覺效果與操作回饋，並允許導入 Tailwind、GSAP 等前端套件。業務功能本身與 REST API 不在變更範圍內；重構的對象是 `inventrix-code/packages/frontend/`。前端目前的結構與缺口記錄在 `component-inventory.md` 與 `code-quality-assessment.md`。

## 業務規則摘要

- GST 固定為小計的 10%（`packages/api/src/routes/orders.ts`）。
- 下單時以「當下商品價格」寫入 `order_items.price`，之後改價不影響歷史訂單。
- 庫存不足時拒絕整筆訂單（HTTP 400）。
- 只有 admin 能改商品、改訂單狀態、看分析資料；customer 只能看到自己的訂單。
- 新註冊帳號一律是 `customer`。
