# Code Summary：Inventrix 前端「NEON ORBIT」重構

## 產出

這次用 Tailwind 4 與 GSAP 重做了 `inventrix-code/packages/frontend` 的全部 9 個頁面，另外新增 404 頁。後端 `inventrix-code/packages/api` 沒有任何修改。

### 安裝的套件

| 套件                     | 版本    | 類別                                                    |
| ------------------------ | ------- | ------------------------------------------------------- |
| `tailwindcss`            | ^4.3.5  | dependency                                              |
| `@tailwindcss/vite`      | ^4.3.5  | dependency（相容現有的 vite 5.4.21，所以沒有升級 Vite） |
| `gsap`                   | ^3.15.1 | dependency                                              |
| `@gsap/react`            | ^2.1.2  | dependency                                              |
| `canvas-confetti`        | ^1.9.4  | dependency                                              |
| `@types/canvas-confetti` | ^1.9.0  | devDependency                                           |

這些套件都不需要 postinstall build，所以 `pnpm-workspace.yaml` 沒有修改。`inventrix-code/pnpm-lock.yaml` 已一併更新。

### 修改的檔案

以下路徑都在 `inventrix-code/packages/frontend/` 底下。

- `package.json`、`vite.config.ts`（加入 `tailwindcss()`，`/api`、`/images` proxy 不變）、`index.html`（字型、favicon、meta）
- `src/index.css`（整份改寫成 Tailwind `@theme` design token 與共用 utility）
- `src/App.tsx`、`src/context/AuthContext.tsx`、`src/components/Layout.tsx`
- `src/pages/`：Storefront、ProductDetail、Login、Register、Orders、AdminDashboard、AdminProducts、AdminOrders、AdminInventory

### 新增的檔案

- `src/lib/`：`api.ts`、`types.ts`、`format.ts`、`useApi.ts`、`redirect.ts`
- `src/fx/`：`gsap.ts`、`CustomCursor.tsx`、`useMagnetic.ts`、`useTilt.ts`、`burst.ts`、`celebrate.ts`、`shake.ts`、`explodeOut.ts`、`TextScramble.tsx`、`PageTransition.tsx`、`AmbientBackground.tsx`
- `src/ui/`：`Button.tsx`、`LinkButton.tsx`、`buttonStyles.ts`、`Input.tsx`、`Select.tsx`、`TextArea.tsx`、`fieldStyles.ts`、`Card.tsx`、`StatusPill.tsx`、`Skeleton.tsx`、`EmptyState.tsx`、`ErrorState.tsx`、`Spinner.tsx`、`Toast.tsx`、`ConfirmDialog.tsx`、`CountUp.tsx`、`Marquee.tsx`、`SummonCircle.tsx`
- `src/components/`：`AuthShell.tsx`、`LaunchOverlay.tsx`、`OrderTimelineCard.tsx`、`PageHeading.tsx`、`ProductCard.tsx`、`ProductForm.tsx`、`QuantityStepper.tsx`
- `src/pages/NotFound.tsx`

## 主要實作決定

- 修正 Q-FE-1：`AuthContext` 改在 `useState` 初始值同步讀取 `localStorage`，重新整理受保護頁面時不再被導回 `/login`。
- 登入後導回原頁時，`readRedirect()` 只接受站內相對路徑（不接受 `//` 開頭與 `/login`），避免被導到站外。
- `apiFetch` 會把伺服器回傳的 `{ error }` 轉成 `ApiError`，錯誤訊息直接顯示在 toast 或表單上；收到 401 時自動登出。
- `formatDate` 先把 SQLite 的 `YYYY-MM-DD HH:MM:SS` 視為 UTC 再解析，各瀏覽器（包含 Safari）顯示一致。
- 註冊頁的密碼長度提示只做顯示，不擋送出；後端本來就沒有長度驗證。
- UI 文案維持英文，和原本的 app 一致。

## 驗證

- `pnpm --filter frontend build`（Node 22）通過：`tsc` strict 沒有錯誤，`vite build` 產出 JS 370.6 kB（gzip 125.5 kB）、CSS 58.1 kB。
- 已在本機瀏覽器逐頁開啟：首頁、商品頁、我的訂單（含展開明細）、登入、管理儀表板、商品管理、訂單管理、庫存與 404 頁都正常顯示，並讀到真實 API 資料。
- 在 `/orders` 直接載入時停留在原頁，確認 Q-FE-1 已修正。
- 登入時輸入錯誤密碼，會顯示伺服器訊息「Invalid credentials」、卡片閃紅光並出現粒子效果。
- 測試覆蓋率：無。團隊決定這次不寫自動化測試，沒有寫了卻沒執行的測試。

## 尚未驗證

- 下單成功的彩帶與「ORDER LAUNCHED」、新增／刪除商品、生成圖片、修改訂單狀態，這些會寫入資料庫，所以沒有實際送出。
- 寬螢幕版面：瀏覽器面板只有約 800px 寬，看到的是窄螢幕版面。
- 自訂游標、磁吸與 3D 傾斜需要真實的滑鼠操作，請用人眼確認。

## 偏離計畫

- 多建了幾個計畫沒有列出的小型輔助檔（`lib/useApi.ts`、`lib/redirect.ts`、`fx/explodeOut.ts`、`ui/buttonStyles.ts`、`ui/fieldStyles.ts`、`ui/LinkButton.tsx`、`ui/Marquee.tsx`、`ui/SummonCircle.tsx`，以及 `components/` 底下 7 個子元件），目的是讓每個檔案保持精簡，各自對應到原本的計畫步驟。
- **引號風格：** 使用者本機的 PostToolUse formatter hook（Prettier 預設設定）會把寫入的檔案改成雙引號加 trailing comma，和 `team.md` 規定的單引號不一致。專案沒有 `.prettierrc`，團隊也決定不新增，所以沒有改回來。這不影響 build。
