# Practices Discovery Evidence

> 狀態：Lead 整合版。`aidlc-pipeline-deploy-agent` 單獨作業；本次 scope 的 collaborators 為 off，沒有 quality / developer / devsecops 的 spoke 審查，也沒有 contribution 檔。訪談已完成，Consolidated Summary Confirmation 為 `Looks correct`。

## 檢查範圍

### Reverse-engineering artifacts（brownfield 上游）

| Artifact                | 路徑                                                                       | 取用的內容                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code-structure          | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/code-structure.md`          | workspace 配置、檔案分類、命名與 import 慣例（ESM、`.js` 副檔名、PascalCase 頁面檔、inline style 慣例）                                                                                                                           |
| technology-stack        | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/technology-stack.md`        | TypeScript 5.9 `strict`、React 18.3、Vite 5.4、Node 22、pnpm workspace、PM2 + nginx；沒有測試、linter、formatter、CI/CD、container、IaC                                                                                           |
| dependencies            | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/dependencies.md`            | 前後端只透過 HTTP 相依；新增前端套件只影響 `packages/frontend/package.json`；native build allowlist 與 `deploy.sh` 在 Amazon Linux 2023 + Node 22 建置的限制；`noUnused*` 讓未使用的 import 使 build 失敗                         |
| code-quality-assessment | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/code-quality-assessment.md` | 無測試、無 lint / format、無 CI；Q-FE-1 至 Q-FE-14 的前端缺口；Q-OPS-1（`destroy.sh` region 不一致）、Q-OPS-2（無 health check / 監控）；UI/UX 重構的建議基線（`prefers-reduced-motion`、送出中鎖定按鈕、唯一自動化檢查是 `tsc`） |
| architecture            | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/architecture.md`            | 單體式前後端分離、單一 EC2 部署、Vite proxy / nginx 同源慣例（前端只用相對路徑 `/api`、`/images`）                                                                                                                                |
| business-overview       | `aidlc/spaces/default/codekb/AIDLC-Workshop-v2/business-overview.md`       | 業務功能與 REST API 不在本 intent 範圍；重構對象是 `inventrix-code/packages/frontend/`；目前的使用者旅程（店面、下單、後台）                                                                                                      |

### Workspace 檔案與 git

| 來源                                              | 發現                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| git（整合時檢查）                                 | Workspace 根目錄是 git repository；目前 branch 為 `main`，追蹤 `origin/main`；remote `origin` 為 `https://github.com/tttingzhang999/gc-aidlc-workshop.git`；HEAD 為 `c6bbc51`。起草時 `.git` 尚不存在，訪談期間由人完成初始化（Q6）                       |
| `AGENTS.md`                                       | 回覆與 `aidlc/` 下的文件使用繁體中文、技術名詞保留英文；不可把 API key、密碼寫進程式碼，改用環境變數或 AWS Secrets Manager；不可手動編輯 `aidlc/` 狀態、不可跳過 approval gate                                                                            |
| `inventrix-code/package.json`                     | root scripts：`dev`（兩個 package 以 `&` 並行）、`build`（先 api 後 frontend）、`start`（只啟動 api）；沒有 `test`、`lint`、`format` script                                                                                                               |
| `inventrix-code/pnpm-workspace.yaml`              | `packages/*`；`path-to-regexp`、`qs` overrides；native build allowlist 只有 `bcrypt`、`better-sqlite3`、`esbuild`                                                                                                                                         |
| `inventrix-code/.gitignore`                       | 排除 `node_modules`、`dist`、`*.log`、`.env`、`*.db`、`.DS_Store`、`*.pem`                                                                                                                                                                                |
| `inventrix-code/packages/frontend/package.json`   | scripts：`dev`（vite）、`build`（`tsc && vite build`）、`preview`；相依只有 react、react-dom、react-router-dom                                                                                                                                            |
| `inventrix-code/packages/frontend/tsconfig.json`  | `strict`、`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`moduleResolution: bundler`、`noEmit`                                                                                                                                     |
| `inventrix-code/packages/frontend/vite.config.ts` | React plugin；`/api`、`/images` proxy 到 `http://localhost:3000`；2 空白、單引號、分號                                                                                                                                                                    |
| `inventrix-code/packages/api/package.json`        | `dev`（`tsx watch`）、`build`（`tsc`）、`start`（`node dist/index.js`）；沒有測試或 lint script                                                                                                                                                           |
| `inventrix-code/packages/frontend/`（目錄列表）   | 沒有 `tailwind.config.*`、`postcss.config.*`、`.eslintrc*`、`.prettierrc*`、`vitest.config.*`                                                                                                                                                             |
| `inventrix-code/deploy.sh`（265 行）              | 互動式：選 AWS profile、region 預設 `ap-northeast-2`、instance type 預設 `t3.small`；每次執行都建立新 instance；安裝 Node 22、gcc、make、nginx、pnpm、pm2；tar + scp 上傳原始碼；在 instance 上 `pnpm install`、`pnpm build`、`pm2 start`；nginx 自簽 TLS |
| `inventrix-code/destroy.sh`（146 行）             | 對應的資源清除腳本；手動模式預設 region 與 `deploy.sh` 不同（Q-OPS-1）                                                                                                                                                                                    |
| CI 設定                                           | 找不到 `.github/workflows/`、`buildspec.yml` 或任何 pipeline 定義                                                                                                                                                                                         |

### Active-space memory

| 檔案                                     | 狀態                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aidlc/spaces/default/memory/team.md`    | 五個 practice 區段全為空；本次不是 re-run                                                                                                                           |
| `aidlc/spaces/default/memory/project.md` | 五個 practice 區段全為空                                                                                                                                            |
| `aidlc/spaces/default/memory/org.md`     | 作為建議預設的來源：trunk-based + squash 到 `main`；scope 決定 walking skeleton；test-after；merge 後部署 staging、production 人工核准；交由專案 linter / formatter |

### 狀態檔

`aidlc/spaces/default/intents/261113-frontend-uiux-redesign/aidlc-state.md`：Project Type 為 Brownfield；Scope 為 `workshop`；Depth 為 Standard；Test Strategy 為 Minimal；Guard Policy 為 off；Collaborators 為 off；`Construction Checkpoints: enabled`、`unit-major`、`serial`。

## 訪談決定

訪談檔：`practices-discovery-questions.md`。使用者直接在檔案中修改答案，並把 Q2、Q3、Q4、Q5 交給 conductor 決定，其中 Q4、Q5 指示「以開發速度為優先」。conductor 記錄的選擇就是確認後的答案。

| 問題                    | 最終答案                                                                         | 誰決定                           |
| ----------------------- | -------------------------------------------------------------------------------- | -------------------------------- |
| Q1 先做薄的端到端切片？ | C：不做切片，直接完整重做所有頁面                                                | 使用者                           |
| Q2 每段重構的驗收方式   | A：`pnpm --filter frontend build` 通過，再加本機 `pnpm dev` 後瀏覽器人工檢視     | 交給 conductor                   |
| Q3 格式與 lint 工具     | A：不新增工具，延續現有寫法，靠 `tsc` 把關                                       | 交給 conductor                   |
| Q4 硬性規定             | A、C、D、E 採用；B（`prefers-reduced-motion`）不採用                             | 交給 conductor，以開發速度為優先 |
| Q5 自動化測試量         | A：不引入測試框架，以 build 通過加人工驗收為主                                   | 交給 conductor，以開發速度為優先 |
| Q6 git 版本控制         | A：workspace 根目錄已是 git repo，主幹 `main`，每個工作單元 squash 成一個 commit | 使用者（已完成初始化）           |
| Q7 重構後是否部署       | A：只在本機驗證，不部署；團隊正在重構 IaC                                        | 使用者                           |

Consolidated Summary Confirmation：`Looks correct`。

## 整合結論

1. **Way of Working**：git 已就緒，採 trunk-based、squash 到 `main`，與 `org.md` 預設一致。草稿中「沒有 git」的敘述已移除。
2. **Walking Skeleton**：團隊明確選擇不做 skeleton ceremony，取代 `workshop` scope 的 `skeleton: on` 預設。
3. **Testing Posture**：Methodology 為 `test-after`；驗收為 build 通過加人工瀏覽器檢視，這次不寫自動化測試。這與 `workshop` scope「不加新測試門檻」一致。
4. **Deployment**：這次不部署，`org.md` 的「merge 後部署 staging」不適用；`deploy.sh` 保留為之後的手動路徑。
5. **Code Style**：不新增 Prettier / ESLint，延續現有慣例，由 `tsc` strict 把關。
6. **硬性規定**：只把 Q4 確認的四項寫入 `discovered-rules.md`。

### 未採用的候選規則

- `ALWAYS 在所有動畫與轉場中處理 prefers-reduced-motion`（依據：`code-quality-assessment.md` 的重構基線第 4 點）。conductor 依「以開發速度為優先」的指示判斷：這項會讓每個動畫多一套處理，所以不列為硬性規定。之後的設計 stage 仍可自行決定是否支援，只是不強制。

## 本機環境觀察

- 起草時，使用者全域的 Prettier PostToolUse hook 失敗：Homebrew 的 Node 26.12.0 缺少 `libsimdjson.34.dylib`，無法啟動。這表示本機預設的 `node` 不是專案要求的 Node 22。Construction 執行 `pnpm --filter frontend build` 與 `pnpm dev` 之前，需要先確認本機有可用的 Node 22（例如透過 nvm / fnm / Volta 切換，或修復 Homebrew 的 simdjson）。這是環境問題，不是團隊 practice。

## 仍未解決的不確定性

1. **本機 Node 環境**：上述 Node 22 問題若沒解決，Mandated 的 build 規則在 Construction 會直接失敗。需要在第一個工作單元前確認。
2. **上游 artifact 尚未 commit**：整合時 `git status` 顯示 `aidlc/spaces/default/codekb/` 與本 stage 目錄仍是 untracked。這不影響 practice 內容，但團隊可能想在 Construction 建立第一個 worktree 前先 commit，讓 worktree 也看得到這些檔案。
3. **Construction 驗證指令**：團隊不做 skeleton，所以沒有 skeleton checkpoint。實際的 Construction Verification Command 仍需在 Construction 時由人授權；建議值為 `pnpm --filter frontend build`。
4. **人工驗收沒有書面清單**：瀏覽器人工檢視沒有固定的檢查清單，驗收品質取決於當下檢視的範圍。
5. **之後部署的相容性**：這次不部署，但新增的前端相依（例如 Tailwind、GSAP）仍需在 Amazon Linux 2023 + Node 22 能安裝；若需要 postinstall native build，要加入 `pnpm-workspace.yaml` 的 allowlist。IaC 重構完成後，部署方式可能改變，屆時應重新執行 practices-discovery 更新 `## Deployment`。
