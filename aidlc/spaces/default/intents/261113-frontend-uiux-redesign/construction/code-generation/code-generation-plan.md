# Code Generation Plan：Inventrix 前端 UI/UX 全面重構

## Summary

- Builds: 用 Tailwind + GSAP 完整重做 Inventrix 全部 9 個前端頁面，加入誇張的動畫與操作回饋
- Touches: `inventrix-code/packages/frontend/`（package.json、vite.config.ts、index.html、src/ 全部檔案，新增 src/fx、src/ui、src/lib）
- Tests: 不寫自動化測試（團隊決定）；以 `pnpm --filter frontend build` 加上 9 頁的瀏覽器人工驗收清單驗收

## 範圍與依據

這次沒有 Requirements Analysis、User Stories 與設計階段的文件（使用者要求直接開始開發），所以計畫的依據是：

- 使用者的原始需求（以下編號 D1–D4 供追溯）：
  - **D1**：針對 web 服務 UI/UX 做優化
  - **D2**：前端設計與操作介面過於陽春，以資深前端設計與工程師的角度完整重構
  - **D3**：效果越誇張越好，使用者操作後的頁面回饋越誇張越好，不受傳統電商設計限制
  - **D4**：可導入 tailwind、gsap 等前端套件
- 程式碼知識庫 `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/`：`component-inventory.md` 列出的 9 個頁面與各自的缺口；`code-quality-assessment.md` 的 Q-FE-1（重新整理受保護頁面被導回 `/login`）。
- 團隊與專案規則（`aidlc/spaces/default/memory/team.md`、`project.md`）：
  - 不做 walking skeleton，直接重做全部頁面。
  - 每個工作單元結束時 `pnpm --filter frontend build` 必須通過。
  - 不修改後端 REST API（`inventrix-code/packages/api`）的行為或資料格式。
  - 不把機密寫進程式碼；前端維持相對路徑 `/api`、`/images`，不新增部署時才需要的環境變數。
  - 不新增 Prettier / ESLint；延續 2 空白、單引號、分號、PascalCase 元件、camelCase 變數。

## 設計方向：「NEON ORBIT」

不走傳統電商的白底卡片，改成深色宇宙＋霓虹的沉浸式介面，每個操作都有誇張的回饋：

- **視覺**：深色背景上漂浮的霓虹漸層光球（GSAP 持續漂移）、雜訊顆粒質感、巨大的粗體標題、霓虹描邊與發光陰影。
- **游標**：自訂發光游標，滑過可點元素時放大並變形。
- **按鈕**：磁吸效果（游標靠近時被吸過去）；點擊時從點擊位置炸出粒子並有衝擊波。
- **商品卡**：滑鼠移動時 3D 傾斜加上光澤反射；捲動進入畫面時錯落飛入。
- **換頁**：每次切換路由都有全螢幕霓虹色塊掃過的轉場。
- **成功回饋**：下單成功時全螢幕彩帶爆炸，畫面中央衝出「ORDER LAUNCHED」大字，再跳轉。
- **錯誤回饋**：表單錯誤時整張卡片劇烈搖晃並閃紅光；通知以會彈跳飛入的 toast 取代 `alert()`。
- **數字**：儀表板的數字從 0 跳動計數到實際值，長條圖從 0 長出來。
- **標題**：首頁標題用亂碼解碼（text scramble）效果出現，下方有無限捲動的跑馬燈。

## 技術選擇

| 套件                                    | 用途                                                                  | 取捨                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tailwindcss` 4.x + `@tailwindcss/vite` | 取代全部 inline style；design token 寫在 CSS `@theme`                 | v4 不需要 `tailwind.config.js` 與 PostCSS 設定，最快。替代方案 v3 需要多兩個設定檔，所以不選 |
| `gsap` 3.x + `@gsap/react`              | 所有動畫、ScrollTrigger、時間軸；`useGSAP` 會在元件卸載時自動清理動畫 | 替代方案 Framer Motion 對 SVG/捲動/時間軸類的誇張效果較不靈活                                |
| `canvas-confetti`                       | 下單成功、生成圖片成功的彩帶爆炸                                      | 體積小、零設定；自己用 GSAP 畫彩帶比較慢                                                     |

新增套件都是純 JS 或以 optionalDependencies 提供預編譯二進位檔，不需要加進 `pnpm-workspace.yaml` 的 build allowlist。

`index.css` 原本的全域 `button`、`input` 樣式會和 Tailwind 的 preflight 重疊，這次整份移除，樣式改由共用元件提供。

## 實作步驟

每一步完成後勾選。依 Testing Contract（test-after），每一層先實作，最後統一以 build 與人工驗收清單驗收。

- [x] **Step 1：安裝套件與建置設定**（D4）
  - 在 `inventrix-code/` 執行 `pnpm --filter frontend add tailwindcss @tailwindcss/vite gsap @gsap/react canvas-confetti`，以及 `pnpm --filter frontend add -D @types/canvas-confetti`。
  - `vite.config.ts` 加入 `tailwindcss()` plugin，保留現有的 `/api`、`/images` proxy 不變。
  - `index.html`：加入 Google Fonts（顯示字型 `Unbounded`、內文 `Space Grotesk`）、favicon（inline SVG data URI）、meta description、`theme-color`。
- [x] **Step 2：確認驗收方式並記錄指令**
  - 專案沒有測試 runner（團隊決定不引入）。驗收指令是 `pnpm --filter frontend build`，人工驗收清單寫在 `unit-test-instructions.md`。
- [x] **Step 3：Design system 與全域樣式**（D2、D3）
  - `src/index.css` 改寫：`@import "tailwindcss";`，以 `@theme` 定義顏色 token（`--color-void`、`--color-neon-pink`、`--color-neon-cyan`、`--color-neon-lime`、`--color-neon-violet` 等）、字型、陰影與圓角。
  - 定義共用 keyframes 與 utility：霓虹發光（`glow-*`）、雜訊顆粒背景、漸層文字、跑馬燈。
  - 移除舊的全域 `button` / `input` 樣式與紫色漸層 body。
- [x] **Step 4：資料存取層 `src/lib/`**（D1）
  - `src/lib/api.ts`：`apiFetch<T>()` 包裝 `fetch`，仍用相對路徑；自動帶 `Authorization`；非 2xx 時解析伺服器的 `{ error }` 訊息，丟出帶 `status` 的 `ApiError`；網路錯誤也轉成 `ApiError`。不改任何 endpoint 或請求格式。
  - `src/lib/types.ts`：`Product`、`Order`、`OrderItem`、`DashboardData`、`InventoryItem`、`User` 型別，取代各頁的 `any[]`。
  - `src/lib/format.ts`：`formatPrice()`（固定兩位小數）、`formatDate()`。
- [x] **Step 5：狀態與路由修正**（D1）
  - `AuthContext.tsx`：`user` 改在 `useState` 初始值同步從 `localStorage` 讀取（修正 Q-FE-1：重新整理受保護頁面不再被導回 `/login`）；`login` / `register` 拋出伺服器回傳的錯誤訊息（含 429 限流訊息），不再丟固定字串；收到 401 時自動登出。
  - `App.tsx`：`ProtectedRoute` 導向時帶 `replace`，並記住原本要去的頁面，登入後導回；新增 404 catch-all 頁面。
- [x] **Step 6：動畫與特效層 `src/fx/`**（D3、D4）
  - `gsap.ts`：註冊 `ScrollTrigger` 與 `useGSAP`，集中設定 ease 與時間預設值。
  - `CustomCursor.tsx`：發光游標與尾跡；滑過 `a`、`button`、`[data-cursor]` 時放大變形；觸控裝置不顯示。
  - `useMagnetic.ts`：按鈕被游標吸引的磁吸 hook。
  - `useTilt.ts`：卡片 3D 傾斜與光澤反射 hook。
  - `burst.ts`：從指定座標炸出粒子與衝擊波（DOM + GSAP，結束後移除元素）。
  - `celebrate.ts`：`canvas-confetti` 全螢幕彩帶爆炸。
  - `shake.ts`：元素劇烈搖晃並閃紅光。
  - `TextScramble.tsx`：亂碼解碼文字效果。
  - `PageTransition.tsx`：路由切換時全螢幕霓虹色塊掃過。
  - `AmbientBackground.tsx`：漂浮漸層光球與雜訊顆粒背景。
- [x] **Step 7：共用 UI 元件 `src/ui/`**（D2、D3）
  - `Button.tsx`：variant（primary / ghost / danger）、`loading` 狀態、磁吸效果、點擊粒子爆炸；送出中自動 disabled，避免重複送出。
  - `Input.tsx`、`Select.tsx`、`TextArea.tsx`：浮動 label、focus 霓虹光環、錯誤訊息。
  - `Card.tsx`、`StatusPill.tsx`（訂單與庫存狀態色彩統一）、`Skeleton.tsx`、`EmptyState.tsx`、`ErrorState.tsx`、`Spinner.tsx`。
  - `Toast.tsx` + `ToastProvider`：彈跳飛入的通知，取代 `alert()`。
  - `ConfirmDialog.tsx`：帶動畫的確認對話框，取代 `confirm()`。
  - `CountUp.tsx`：數字從 0 計數到目標值。
  - 所有可互動元素加上 `data-testid`。
- [x] **Step 8：App shell 與 Layout**（D2、D3）
  - `Layout.tsx`：霓虹玻璃質感導覽列，目前頁面有滑動的發光指示條；行動版漢堡選單（全螢幕展開動畫）；登入使用者頭像膠囊；footer 跑馬燈。
  - `App.tsx` 掛上 `ToastProvider`、`CustomCursor`、`AmbientBackground`、`PageTransition`。
  - `main.tsx` 維持 `StrictMode`。
- [x] **Step 9：Storefront（`/`）**（D2、D3）
  - Hero：巨大的 `TextScramble` 標題、副標、無限捲動跑馬燈。
  - 商品格：`useTilt` 3D 卡片、ScrollTrigger 錯落飛入、hover 時圖片放大並出現「VIEW →」霓虹標籤。
  - 前端搜尋框與庫存篩選（只在前端過濾已取得的資料，不新增 API 參數）。
  - Loading skeleton、空狀態、錯誤狀態（含重試按鈕）；價格固定兩位小數。
- [x] **Step 10：ProductDetail（`/products/:id`）**（D2、D3）
  - 左側大圖帶滑鼠視差，右側資訊依序飛入；返回列表連結。
  - 數量 stepper（+/- 按鈕，範圍限制在 1 到庫存量）。
  - 「LAUNCH ORDER」按鈕：送出中有充能動畫並 disabled；成功時彩帶爆炸＋全螢幕「ORDER LAUNCHED」大字，1.8 秒後跳到 `/orders`；失敗時搖晃並顯示伺服器訊息的 toast。
  - 未登入時導向 `/login`，登入後回到原商品頁。
  - 商品不存在（API 回 `{ error }`）時顯示 404 狀態。
- [x] **Step 11：Login / Register**（D2、D3）
  - 全螢幕分割版面：一側是動態霓虹視覺，一側是表單卡片。
  - 浮動 label 輸入框；送出中按鈕 loading；錯誤時卡片搖晃並顯示伺服器訊息；成功時卡片爆開成粒子後換頁。
  - 註冊頁顯示密碼長度提示。
- [x] **Step 12：Orders（`/orders`）**（D2、D3）
  - 訂單以時間軸卡片呈現，狀態用 `StatusPill`；點擊展開，以 `GET /api/orders/:id` 載入品項明細（既有 endpoint，前端原本沒用到）。
  - Loading、空狀態（大字「NO ORDERS YET」加上前往商店的按鈕）、錯誤狀態。
- [x] **Step 13：Admin Dashboard（`/admin`）**（D2、D3）
  - 4 張統計卡用 `CountUp` 跳數；RWD 改成 1、2、4 欄。
  - 顯示 `ordersByStatus`：依狀態的霓虹長條圖，從 0 長出來。
  - Recent Orders 與 Top Products 卡片化；子頁面導覽改成正確的連結按鈕（不再 `<Link><button>` 巢狀）。
  - Loading 與錯誤狀態。
- [x] **Step 14：Admin Products（`/admin/products`）**（D2、D3）
  - 新增 / 編輯表單：浮動 label；按 Edit 時平滑捲動到表單並閃光提示。
  - 「Generate Image」：生成中顯示旋轉的召喚陣動畫；成功時圖片以閃光淡入並噴彩帶；失敗時 toast。
  - 送出時檢查回應狀態，失敗不清空表單並顯示錯誤；成功 toast。
  - 刪除用 `ConfirmDialog`；刪除成功時該列爆成粒子後移除。
  - 商品表格加縮圖、前端搜尋；窄螢幕改成卡片列表。
- [x] **Step 15：Admin Orders（`/admin/orders`）**（D2、D3）
  - 狀態欄改用 `StatusPill`；改狀態時立即更新畫面，失敗則回復原狀態並顯示 toast；成功時該列閃光。
  - 前端狀態篩選；窄螢幕改成卡片列表。
- [x] **Step 16：Admin Inventory（`/admin/inventory`）**（D2、D3）
  - 每個商品加一條庫存量長條，捲動進入時從 0 長出；缺貨的列以紅色脈動提示。
  - Loading、空狀態、錯誤狀態。
- [x] **Step 17：404 頁面**（D2、D3）
  - 巨大的故障風（glitch）「404」與返回首頁的磁吸按鈕。
- [x] **Step 18：驗收**（D1–D4）
  - 在 `inventrix-code/` 執行 `pnpm --filter frontend build`，必須通過（包含 `tsc` strict、`noUnusedLocals`、`noUnusedParameters`）。
  - 依 `unit-test-instructions.md` 的人工驗收清單，用本機 `pnpm dev` 在瀏覽器逐頁檢視。
- [x] **Step 19：文件與追溯**
  - 寫 `code-summary.md` 與 `traceability.json`。

## 偏離說明

- **沒有自動化測試檔**：Code Generation 預設要求計畫包含測試檔，Minimal 測試策略也要求每項需求一個測試。團隊在 Practices Discovery 決定以開發速度為優先、不引入測試框架（`team.md` 的 `## Testing Posture`），所以這份計畫以 build 與人工驗收清單代替。這個落差會原樣留給 Build and Test 檢視，不會被當成已滿足。
- **沒有上游需求與設計文件**：使用者要求跳過 Inception 的其餘 stage，追溯改以原始需求 D1–D4 為準。
- **不處理 prefers-reduced-motion**：團隊決定不列為硬性規定（速度優先）。

## 不在範圍內

- 後端（`inventrix-code/packages/api`）任何修改，包括 `code-quality-assessment.md` 列出的後端安全問題。
- 部署（團隊決定這次只在本機驗證）。
- 購物車、多品項下單等需要新 API 的功能。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "每個工作單元先完成實作，再以 `pnpm --filter frontend build` 通過與本機瀏覽器人工檢視驗收；這次不撰寫自動化測試。",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: **[證據]** 專案沒有任何測試檔、測試框架、test script、coverage 設定或 CI（見 `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/code-quality-assessment.md`）。團隊以開發速度為優先，這次不引入測試框架。驗收方式是 `pnpm --filter frontend build` 通過，再加上本機瀏覽器人工檢視；動畫與視覺效果只能靠人眼確認。\n- **Ordering**: 每個工作單元先完成實作，再以 `pnpm --filter frontend build` 通過與本機瀏覽器人工檢視驗收；這次不撰寫自動化測試。\n- 自動化檢查只有前端 build 第一步的 `tsc`（`strict`、`noUnusedLocals`、`noUnusedParameters`）。未使用的 import 也會讓 build 失敗。\n- 人工檢視的方式：在 `inventrix-code/` 執行 `pnpm dev`，以瀏覽器逐頁確認畫面、互動與動畫。\n- **[證據]** 本 intent 的 Test Strategy 為 Minimal；`workshop` scope 不加新測試門檻，只要求既有測試維持綠燈。既有測試數量為 0，所以回歸基準就是 build 成功。\n- 不做自動化視覺回歸測試，也不引入 Playwright 等瀏覽器自動化工具。"
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:0c4517a5b1b0fa4ab1ab71e8c640ea6ec38e3abe5e75455bcaaa7afc3d6f5705",
  "contract_sha256": "sha256:d4a407e458751131bcd24447283c42d95b780e9f7acbdb36a3195865714f6652"
}
```
