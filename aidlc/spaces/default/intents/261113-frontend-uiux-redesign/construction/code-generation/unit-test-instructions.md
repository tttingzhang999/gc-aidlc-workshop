# 驗收說明

團隊決定這次不寫自動化測試（`team.md` 的 `## Testing Posture`），驗收方式是 build 通過加上瀏覽器人工檢視。

## 自動檢查

在 `inventrix-code/` 用 Node 22 執行：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
pnpm --filter frontend build
```

通過條件：`tsc`（strict、noUnusedLocals、noUnusedParameters）與 `vite build` 都成功，沒有錯誤。

覆蓋率：無（團隊決定不引入測試框架）。

## 人工檢視清單

用 `pnpm dev` 同時啟動 API（:3000）與前端（:5173），在瀏覽器逐項確認：

1. 首頁 `/`：標題亂碼解碼效果、跑馬燈、商品卡 3D 傾斜、捲動時卡片飛入；搜尋與篩選可用。
2. 商品頁 `/products/:id`：數量 stepper 受庫存限制；未登入下單會導向登入，登入後回到原頁；下單成功有彩帶與「ORDER LAUNCHED」並跳到 `/orders`。
3. 登入 `/login`、註冊 `/register`：錯誤時卡片搖晃並顯示伺服器訊息；成功後換頁。
4. 重新整理 `/orders` 或 `/admin`：登入狀態下不會被導回 `/login`（Q-FE-1）。
5. 訂單 `/orders`：空狀態、展開訂單可看到品項明細。
6. 管理儀表板 `/admin`：數字跳動計數、依狀態的長條圖。
7. 商品管理 `/admin/products`：新增、編輯、刪除（確認對話框）、生成圖片的動畫與錯誤 toast。
8. 訂單管理 `/admin/orders`：改狀態後畫面立即更新，成功有 toast。
9. 庫存 `/admin/inventory`：庫存長條、缺貨列紅色脈動。
10. 不存在的路徑：顯示 404 頁面。
11. 全站：自訂游標、按鈕磁吸與點擊粒子、換頁轉場；瀏覽器 console 沒有錯誤。
