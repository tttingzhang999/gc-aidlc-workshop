# Build and Test 總結

## Build 狀態

`pnpm --filter frontend build` 在 Node 22 下通過，`tsc` strict 沒有錯誤。前置需求與指令見 `build-instructions.md`。

## 測試類型

- 自動化測試：沒有。團隊決定這次不引入測試框架，所以沒有產生 integration、performance 或 security 測試說明（Minimal 策略本來也不產生這些檔案）。
- 人工瀏覽器檢視：在 Claude 桌面 app 的內建瀏覽器（Chromium，真實瀏覽器）中逐頁檢查，詳見 `test-results.md`。

## 覆蓋率預期

- 專案：Minimal 策略要求每項需求一個測試、每個元件一個 happy-path unit test。實際為 0 個測試，覆蓋率無法量測。
- 這次是 zero-Unit，沒有個別 Unit 的覆蓋率目標。

## Target Verification Matrix

| Target ID | Source                                             | Expected                          | Actual        | Evidence                   | Owning Stage   | Verdict                           |
| --------- | -------------------------------------------------- | --------------------------------- | ------------- | -------------------------- | -------------- | --------------------------------- |
| BT-01     | `project.md` Mandated；Testing Contract `ordering` | build 通過                        | exit 0        | `test-results.md` Build 段 | build-and-test | Met                               |
| BT-02     | Testing Contract `scope_floor`                     | 既有測試維持綠燈                  | 既有測試 0 個 | 沒有測試檔                 | build-and-test | Met                               |
| BT-03     | Testing Contract `strategy_volume`                 | 每項需求一個測試                  | 0 個          | `test-results.md`          | build-and-test | Not Met                           |
| BT-04     | Testing Contract `strategy_volume`                 | 每個元件一個 happy-path unit test | 0 個          | `test-results.md`          | build-and-test | Not Met                           |
| BT-05     | `org.md` Testing Posture                           | CI 在 merge 前執行測試            | —             | `ci-pipeline` 為 SKIP      | —              | N/A：the plan runs no CI Pipeline |
| BT-06     | 人工檢視清單 1、3–6、9、10                         | 頁面在瀏覽器正常顯示              | 正常          | Chromium 人工檢視          | build-and-test | Met                               |
| BT-07     | Q-FE-1                                             | 重新整理不會被導回 `/login`       | 正常          | Chromium 人工檢視          | build-and-test | Met                               |
| BT-08     | 計畫 Step 9、11                                    | 錯誤狀態正確顯示                  | 正常          | Chromium 人工檢視          | build-and-test | Met                               |
| BT-09     | 人工檢視清單 2、7、8                               | 寫入資料的流程正常                | 未執行        | API 無回應                 | build-and-test | Unverified                        |
| BT-10     | 人工檢視清單 11                                    | 游標、磁吸、3D 傾斜               | 未執行        | 需要真實滑鼠               | build-and-test | Unverified                        |
| BT-11     | 計畫 Step 13                                       | 寬螢幕版面                        | 正常          | Chromium 1280×800          | build-and-test | Met                               |

## 就緒評估

- **Build-ready**：是。
- **Test-ready**：否。沒有自動化測試（BT-03、BT-04 Not Met）；寫入資料的流程與滑鼠效果尚未驗證（BT-09、BT-10 Unverified）。
- **Deployment-ready**：不適用。團隊決定這次不部署。

## 使用者決定

使用者在 Build and Test 的失敗詢問中選擇 **Accept failure**：保留上述落差，不補自動化測試，直接進入核准。BT-03、BT-04 維持 Not Met，BT-09、BT-10 維持 Unverified。

## 已知限制

- 沒有自動化測試是團隊在 Practices Discovery 的決定（以開發速度為優先），和 Minimal 測試策略的要求有落差。這個落差沒有被調低或忽略，照實列為 Not Met。
- 檢查時 API 停止回應，因為另一個 session 正在重構後端架構，所以 BT-09 無法在這次執行。API 恢復後可以依 `unit-test-instructions.md` 第 2、7、8 項補驗。
- Code Generation review 的 R-02（AdminOrders 連續改狀態）與 R-03（登出多一筆 history）尚未修正。
