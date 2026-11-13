# 測試結果

## Build

- 指令：`pnpm --filter frontend build`（在 `inventrix-code/`，Node 22）
- 結果：**成功**。`tsc` 沒有錯誤；`vite build` 產出 `dist/index.html` 1.49 kB、`dist/assets/index-dJC8_AjZ.css` 58.14 kB、`dist/assets/index-BcGzZrtp.js` 370.57 kB（gzip 125.54 kB），`✓ built in 737ms`。

## 自動化測試

- 總數 0、通過 0、失敗 0、略過 0。
- 專案沒有測試框架，也沒有測試檔。團隊在 Practices Discovery 決定這次不寫自動化測試。
- 覆蓋率：無法量測（沒有測試框架）。

## 人工瀏覽器檢視

執行環境：Claude 桌面 app 內建瀏覽器（Chromium 引擎，真實瀏覽器），連到本機 `http://localhost:5173`。

| #   | 檢查項目                                                                                    | 結果                                   |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | 首頁：標題亂碼解碼、跑馬燈、商品卡飛入、24 張商品卡讀到 API 資料                            | 通過                                   |
| 2   | 商品頁 `/products/1`：版面與動畫載入                                                        | 通過；下單流程未驗證                   |
| 3   | 登入：錯誤密碼顯示伺服器訊息「Invalid credentials」、卡片閃紅光、粒子效果；正確密碼登入成功 | 通過                                   |
| 4   | 已登入時直接載入 `/orders`，停留在原頁（Q-FE-1）                                            | 通過                                   |
| 5   | 我的訂單：時間軸卡片、展開後顯示品項明細                                                    | 通過                                   |
| 6   | 管理儀表板：統計卡數字                                                                      | 通過                                   |
| 7   | 商品管理：表單與列表載入                                                                    | 通過；新增、編輯、刪除、生成圖片未驗證 |
| 8   | 訂單管理：9 筆訂單、狀態篩選、狀態下拉選單                                                  | 通過；修改狀態未驗證                   |
| 9   | 庫存：庫存長條與狀態                                                                        | 通過                                   |
| 10  | 不存在的路徑顯示 404 頁                                                                     | 通過                                   |
| 11  | 寬螢幕（1280×800）：桌面版導覽列與商品區版面                                                | 通過                                   |
| 12  | API 無回應時，首頁顯示 ERROR 卡片與 Retry 按鈕                                              | 通過                                   |
| 13  | 自訂游標、磁吸按鈕、3D 卡片傾斜                                                             | 未驗證：需要人用真實滑鼠操作           |

**未驗證的原因：**

- 第 2、7、8 項會寫入資料。檢查時 API 已經停止回應（`curl http://localhost:3000/api/products` 回傳 000），因為另一個 session 正在重構後端架構。
- 第 13 項需要真實滑鼠移動，自動操作無法判斷效果好不好。

## Target Verification Matrix

| Target ID | Source                                                    | Expected                                                               | Actual                            | Evidence                                             | Owning Stage   | Verdict                           |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- | -------------- | --------------------------------- |
| BT-01     | `project.md` Mandated；Testing Contract `ordering`        | `pnpm --filter frontend build` 通過                                    | exit 0，`✓ built in 737ms`        | 本檔 Build 段                                        | build-and-test | Met                               |
| BT-02     | Testing Contract `obligations.scope_floor`                | 既有測試維持綠燈                                                       | 既有測試 0 個，沒有可失敗的測試   | `inventrix-code` 沒有任何測試檔                      | build-and-test | Met                               |
| BT-03     | Testing Contract `obligations.strategy_volume`（Minimal） | 每項需求（D1–D4）至少一個可驗證的測試                                  | 0 個測試                          | 本檔自動化測試段                                     | build-and-test | Not Met                           |
| BT-04     | Testing Contract `obligations.strategy_volume`（Minimal） | 每個元件至少一個 happy-path unit test                                  | 0 個測試                          | 本檔自動化測試段                                     | build-and-test | Not Met                           |
| BT-05     | `org.md` Testing Posture（CI execution）                  | CI 在 merge 前執行測試                                                 | —                                 | `aidlc-state.md` 中 `ci-pipeline` 為 SKIP            | —              | N/A：the plan runs no CI Pipeline |
| BT-06     | `unit-test-instructions.md` 清單 1、3–6、9、10            | 頁面在瀏覽器正常顯示並讀到 API 資料                                    | 全部正常                          | 人工檢視表第 1、3–6、9、10 項（真實瀏覽器 Chromium） | build-and-test | Met                               |
| BT-07     | `code-quality-assessment.md` Q-FE-1                       | 重新整理受保護頁面不會被導回 `/login`                                  | 直接載入 `/orders` 停留在原頁     | 人工檢視表第 4 項（Chromium）                        | build-and-test | Met                               |
| BT-08     | 計畫 Step 9、11（錯誤狀態）                               | 錯誤時顯示伺服器訊息或錯誤狀態                                         | 登入錯誤與 API 無回應時都正確顯示 | 人工檢視表第 3、12 項（Chromium）                    | build-and-test | Met                               |
| BT-09     | `unit-test-instructions.md` 清單 2、7、8                  | 下單、商品新增／編輯／刪除、生成圖片、修改訂單狀態都能正常運作並有回饋 | 未執行                            | API 無回應（另一個 session 正在改後端）              | build-and-test | Unverified                        |
| BT-10     | `unit-test-instructions.md` 清單 11                       | 自訂游標、磁吸、3D 傾斜、換頁轉場                                      | 未執行                            | 需要人用真實滑鼠操作                                 | build-and-test | Unverified                        |
| BT-11     | 計畫 Step 13 RWD                                          | 寬螢幕版面正常                                                         | 1280×800 下桌面導覽與商品區正常   | 人工檢視表第 11 項（Chromium）                       | build-and-test | Met                               |
