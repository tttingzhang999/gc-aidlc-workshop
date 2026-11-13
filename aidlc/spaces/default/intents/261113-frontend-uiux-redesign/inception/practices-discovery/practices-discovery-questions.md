# Practices Discovery 問題

這些問題只問程式碼和現有設定無法確定的部分。草稿見 `team-practices.md`，證據見 `evidence.md`。

## Q1. [開發者] 先做一個薄的端到端切片？

Walking skeleton 是一個最精簡、能從頭跑到尾的版本，在正式功能之前先做出來，證明各部分接得起來。這次建議的切片是：裝好 Tailwind 與 GSAP、建立 design token、重做 Storefront 首頁並接上真實的 `/api/products`、加上一個誇張的操作回饋。

A. 要，先做上面建議的切片，確認後再做其他頁面
B. 要，但切片內容換成別的（請在 Other 說明）
C. 不要，直接依序重做各頁面
X. Other (please specify)

[Answer]: 直接重做全部頁面就好，完全重做（對應 C：不做切片，直接完整重做所有頁面）

## Q2. [開發者] 怎麼確認每一段前端重構是可用的？

專案目前沒有自動化測試，唯一的自動檢查是 TypeScript 編譯。這個做法會用在之後每個工作單元的驗收。

A. `pnpm --filter frontend build` 通過，再加上本機 `pnpm dev` 後在瀏覽器人工檢視
B. 只要 build 通過即可
C. build 通過，再加上自動化的瀏覽器操作測試（例如 Playwright）
X. Other (please specify)

[Answer]: 你自己決定 → 選 A（build 通過，再加上本機瀏覽器人工檢視；動畫效果只能靠眼睛確認）

## Q3. [開發者] 程式碼格式與 lint 工具

目前沒有 Prettier 或 ESLint 設定。現有寫法是 2 空白縮排、單引號、分號、元件用 PascalCase、變數用 camelCase，並由 `tsc` strict 把關。

A. 不新增工具，延續現有寫法，靠 `tsc` 把關
B. 新增 Prettier（只管格式）
C. 新增 Prettier 與 ESLint
X. Other (please specify)

[Answer]: 你自己決定 → 選 A（不新增工具，最快）

## Q4. [開發者] 哪些規則要列為這個專案的硬性規定？(select all that apply)

以下是從程式碼與專案文件推得的候選，選中的會寫成必須遵守的規則，沒選的只當參考。

A. 一定要：每個工作單元結束時 `pnpm --filter frontend build` 必須通過
B. 一定要：所有動畫與轉場都要支援系統的「減少動態效果」（prefers-reduced-motion）設定
C. 禁止：為了這次前端重構去修改後端 REST API 的行為或資料格式
D. 禁止：把 API key、密碼或其他機密寫進程式碼
E. 禁止：改用絕對的 API 網址，或新增部署時才需要設定的前端環境變數
X. Other (please specify)

[Answer]: 你自己決定，但已開發速度效率為優先考量 → 選 A, C, D, E（這四項幾乎不增加開發成本；B 會讓每個動畫都多一套處理，以速度為優先所以不列為硬性規定）

## Q5. [品質工程師] 這次要寫多少自動化測試？

測試策略目前是 Minimal（每項需求一個測試）。專案還沒有任何測試框架。

A. 不引入測試框架，以 build 通過加上人工驗收為主
B. 引入 Vitest + React Testing Library，每項需求寫一個元件測試，寫在實作之後
C. 引入 Vitest + React Testing Library，先寫測試再實作（TDD）
X. Other (please specify)

[Answer]: 你自己決定，已開發速度為優先考量 → 選 A（不引入測試框架，以 build 通過加上人工驗收為主）

## Q6. [發布工程師] 要不要把專案放進 git 版本控制？

放進 git 後，每個工作單元可以在獨立分支開發，完成後合併成一個 commit 回到 `main`。不放的話，所有修改直接改在現有檔案上。

A. 要，在 workspace 根目錄 `git init`，以 `main` 為主幹，每個工作單元 squash 成一個 commit
B. 要，但只對 `inventrix-code/` 建立 repository
C. 不要，直接在現有檔案上依序修改
X. Other (please specify)

[Answer]: A（已完成：workspace 根目錄已是 git repository，主幹為 `main`，remote 為 https://github.com/tttingzhang999/gc-aidlc-workshop）

## Q7. [發布工程師] 重構完成後要不要部署？

目前的部署方式是手動執行 `inventrix-code/deploy.sh`，部署到單一台 EC2，沒有 staging 也沒有 CI/CD。

A. 只在本機驗證，這次不部署
B. 本機驗證後，手動執行 `deploy.sh` 部署，並用首頁與 `/api/products` 做 smoke test
C. 建立 CI/CD pipeline 自動部署
X. Other (please specify)

[Answer]: 先不用，現在在重構 IaC（對應 A：這次只在本機驗證，不部署）

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- 不做端到端切片：直接完整重做所有前端頁面
- 驗收方式：`pnpm --filter frontend build` 通過，再加上本機 `pnpm dev` 後在瀏覽器人工檢視
- 格式工具：不新增 Prettier 或 ESLint，延續現有寫法，靠 `tsc` strict 把關
- 硬性規定（以開發速度為優先）：每個工作單元結束時 build 必須通過；禁止修改後端 REST API；禁止把機密寫進程式碼；禁止改用絕對 API 網址或新增部署時才需要的前端環境變數。prefers-reduced-motion 不列為硬性規定
- 測試（以開發速度為優先）：不引入測試框架，以 build 通過加上人工驗收為主
- 版本控制：使用 workspace 根目錄現有的 git repo，以 `main` 為主幹，每個工作單元 squash 成一個 commit
- 部署：這次只在本機驗證，不部署（目前正在重構 IaC）

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

[Answer]: 使用者直接在檔案中修改答案：Q1 改為不做切片、直接完整重做所有頁面；Q2、Q3 交給我決定；Q4、Q5 交給我決定並以開發速度為優先；Q7 改為先不部署，因為正在重構 IaC。
