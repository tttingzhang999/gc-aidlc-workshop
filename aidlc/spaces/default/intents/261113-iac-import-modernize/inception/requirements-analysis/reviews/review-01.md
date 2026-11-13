## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-11-13T06:16:53Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > FR1.3 與 假設 A3 | FR1.3 要求 zero-diff，A3 卻預期 `cdk migrate` 可能轉不完，並寫明「不阻擋 FR2–FR8」。但 `project.md` 的 Mandated 規則要求先確認 zero-diff 才能部署任何 IaC 變更，所以 zero-diff 失敗時，新 stack 能不能部署沒有答案。 | 明確寫出 zero-diff 未達成時的決定：新 stack 是否仍可部署（需要在 `project.md` 記錄這條規則的例外或範圍，說明該規則只管 `workshop-stack`），或 PoC 改為只 synth。同時把 FR1.3 的驗收與 A3 的退路對齊。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > FR4.4、FR6、NFR3、NFR6 | seed 會建立 2 個帳號，但現有程式碼寫死預設密碼（Q7 已指出）。FR6 只要求移除 JWT secret fallback，沒有處理 seed 帳號的密碼；NFR3 與 `project.md` 的 Forbidden 規則禁止程式碼出現密碼。NFR6 的 smoke test 要用 seed 帳號登入，但沒說憑證從哪裡來。 | 規定 seed 帳號密碼的來源（例如由 Secrets Manager 或部署時參數提供，不進程式碼），並規定 smoke test 如何取得該憑證。NFR3 的 `git grep` 驗收要涵蓋 seed 檔案。 | New |
| R-03 | Major | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > FR3.3、FR4.1–FR4.4、OQ2 | FR3.3 要求 `pnpm dev` 仍能在本機啟動 Express，但 FR4.2 把 better-sqlite3 換成 Aurora Data API，本機沒有 Aurora，兩者矛盾。另一份前端重構靠本機 `pnpm dev` 的 API 驗收，資料層改成 Data API 會讓它失效，OQ2 只提合併衝突。此外，Lambda 沒進 VPC，資料表 DDL 與 seed 由誰、何時執行（cold start、custom resource 或手動）沒有寫，兩個 Lambda 同時 cold start 時是否重複 seed 也沒有條件。 | 決定本機開發的資料來源（保留 SQLite 的雙 driver、連到 Aurora，或其他），並說明對前端工作的影響。寫出 schema 建立與 seed 的執行機制，並加一條併發初始化不產生重複資料的驗收條件。 | New |
| R-04 | Major | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > FR2.3 與 NFR6 | CloudFront 的 `/api/*` behavior 沒有規定快取關閉、允許 POST/PUT/PATCH/DELETE、以及轉送 `Authorization` header；漏掉任何一項，登入後的呼叫會壞掉或被快取。NFR6 的 smoke test 只打未驗證的 GET 與 login，不會發現這類問題，也沒覆蓋下單（FR4.3 transaction）或 admin 圖片生成（FR5.2）。 | 在 FR2.3 加上 `/api/*` behavior 的條件（不快取、全部 method、轉送 Authorization）。擴充 NFR6：加入一個帶 token 的呼叫（例如建立訂單）、驗證 admin 圖片生成寫入 S3、驗證 SPA route 重新整理（FR2.2）。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > 假設 A1、NFR6 | A1 的退路是「只 synth、不 deploy」，但此時 NFR6 的 smoke test 無法執行，PoC 成功與否沒有定義。IAM 權限可以在現在先用唯讀方式探測，不必等到 code generation（OQ1）。 | 寫出退路情境下的 PoC 驗收標準（例如 synth、cdk-nag、assertion 測試通過），並在進入 code generation 前先確認 bootstrap 與 IAM 能否建立。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > NFR7 與 team-practices.md 的 Testing Posture | NFR7 要求後端資料存取層單元測試，但 `packages/api` 沒有測試框架；`team-practices.md` 要求 IaC 的 80% coverage 並交給 ci-pipeline 驗證，而此 workflow 已改為 `poc`、沒有該 stage，需求沒有確認這個待決事項。IaC 的 Prettier/ESLint 慣例也沒提。 | 說明 80% 下限在 `poc` scope 下是否放寬，並寫明要引入的測試框架（含 `packages/api` 的新增相依），或把後端單元測試降為 smoke test。 | New |
| R-07 | Minor | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > FR3.2、FR4.2 | 「response JSON 格式不變」缺少驗證方式。PostgreSQL 經 Data API 回傳的 numeric、timestamp、boolean 型別與 SQLite 不同，容易讓 `price`、`created_at` 等欄位的型別或格式改變而破壞前端。Express 的 in-memory rate limit 在 Lambda 上也變成每個 instance 各自計數，且 API Gateway 後的 client IP 取法不同，需求沒提。 | 加一條欄位型別與格式與現況一致的驗收（至少涵蓋 products 與 orders），並說明 rate limit 在 Lambda 上是維持、改用其他機制，或列為已知差異。 | New |
| R-08 | Minor | aidlc/spaces/default/intents/261113-iac-import-modernize/inception/requirements-analysis/requirements.md > 意圖分析、FR1、範圍外 | 使用者要求「import all existing resources」，需求只涵蓋 `workshop-stack`，並把 retail-store ECS 的現代化列為範圍外，但沒說明 retail-store 與其他非 `workshop-stack` 資源是否由其他 stack 管理，也沒明說它們不納入程式碼化。 | 在範圍外或假設中明列哪些帳號資源不納入 FR1，並註明這是對原始需求「all」的縮減。 | New |

### Summary

需求涵蓋面完整，FR 與 NFR 大多有可測的 Given/When/Then，也可追溯到 Q1–Q8；但有四個會讓 engineering 回頭問的缺口：zero-diff 與部署規則互相卡住、seed 帳號密碼與機密規則矛盾、本機開發與資料初始化機制未定，以及 CloudFront 設定與 smoke test 覆蓋不足。建議在核准前先補上這四項。
