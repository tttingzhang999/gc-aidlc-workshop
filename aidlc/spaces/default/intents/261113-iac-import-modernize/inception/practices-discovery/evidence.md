# Practices Discovery Evidence

> 狀態：Lead Integration 完成（Step 5）。Collaborators 為 off，本階段由 `aidlc-pipeline-deploy-agent` 單獨完成，沒有 support agent 的 contribution。第 1–3 節是 Lead Draft 的檢視與推論，第 4 節是訪談決定，第 5 節是仍未解決的問題。

## 1. 檢視範圍

| 來源                        | 檢視內容                                                                                                                                          | 結果                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Git 歷史                    | `git log --oneline --all`                                                                                                                         | 只有一個 commit：`c6bbc51 chore: initial commit of AI-DLC workshop workspace`，只有 `main` 分支                                                        |
| Repo 根目錄                 | `README.md`、`AGENTS.md`、`aidlc.settings.json`、`.gitignore`、`.mcp.json`                                                                        | 工作坊範本說明、語言偏好與安全注意事項；沒有 CI 或 IaC                                                                                                 |
| 應用程式                    | `inventrix-code/package.json`、`pnpm-workspace.yaml`、`deploy.sh`、`destroy.sh`（略過 `node_modules`）                                            | pnpm workspace，scripts 只有 `dev`、`build`、`start`；部署是互動式 EC2 腳本                                                                            |
| CI / IaC / lint / test 設定 | 在 repo 內搜尋 `*.yml`、`*.yaml`、`cdk.json`、`*.tf`、`buildspec*`、`Dockerfile`、`template.*`、ESLint、Prettier、EditorConfig、Vitest、Jest 設定 | 只找到 `pnpm-lock.yaml` 與 `pnpm-workspace.yaml`，沒有任何 CI、IaC、lint、formatter 或測試設定                                                         |
| AI-DLC 記憶                 | `aidlc/spaces/default/memory/org.md`、`team.md`、`project.md`、`phases/inception.md`                                                              | `team.md`、`project.md` 為空白範本，沒有已確認的團隊做法；`org.md` 提供預設值                                                                          |
| Scope 設定                  | `.claude/scopes/aidlc-infra.md`、`<record>/aidlc-state.md`                                                                                        | `infra` scope、`skeleton: on`；units-generation、code-generation、build-and-test 為 SKIP                                                               |
| AWS（唯讀）                 | 本 session conductor 提供的 inventory；`aws cloudformation list-stacks`、`get-template-summary`（`--profile aidlc-workshop`）                     | 只有 `workshop-stack` 一個 stack（CREATE_COMPLETE），289 個資源，其中約 25 個 `AWS::CloudFormation::CustomResource`；沒有 `CDKToolkit` bootstrap stack |

## 2. CodeKB 引用（upstream coverage）

reverse-engineering 在本 workflow 被跳過，以下 CodeKB 來自另一個 intent（`261113-frontend-uiux-redesign`）在 2026-11-13T05:48:35Z 的掃描，掃描時 workspace 還不是 git repo（commit unknown）。內容涵蓋 Inventrix 應用程式，不涵蓋 AWS 上的 `workshop-stack`。

| Artifact                     | 用到的內容                                                                                                                                                                               | 影響的做法                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `code-structure.md`          | pnpm monorepo 結構（`packages/api`、`packages/frontend`）、ESM、router-per-resource 模式                                                                                                 | Way of Working（IaC 目錄位置）、Code Style                                                                  |
| `technology-stack.md`        | TypeScript 5.9 `strict`、Node.js 22、Express 4、better-sqlite3、Vite 5、React 18；「沒有測試框架、linter、formatter、CI/CD、container、IaC」                                             | IaC 語言選擇（建議 CDK TypeScript）、Code Style、Testing Posture                                            |
| `dependencies.md`            | SQLite 單檔 DB、圖片存在本機磁碟、Bedrock Nova Canvas、`JWT_SECRET` 環境變數、native module（bcrypt、better-sqlite3）                                                                    | 現代化風險：Lambda 需要處理 native module 打包；DB 改 RDS / Aurora 需要換 driver 與 SQL 方言；圖片需改存 S3 |
| `code-quality-assessment.md` | 測試、lint、CI 全部為「無」；Q-SEC-1（寫死 JWT secret fallback）、Q-SEC-2（寫死預設密碼）、Q-OPS-1（`deploy.sh` 與 `destroy.sh` region 預設不一致）、Q-OPS-2（沒有 health check 或監控） | Testing Posture、候選規則 C2 / C6、Deployment                                                               |
| `architecture.md`            | 單體 Express + SQLite + 單台 EC2（nginx + PM2）；前端以相對路徑 `/api`、`/images` 呼叫後端                                                                                               | 現代化路徑：CloudFront 需以 behavior 把 `/api` 轉到 API Gateway，維持同源慣例                               |
| `business-overview.md`       | Inventrix 為工作坊用的 brownfield 範例電商；功能含 AI 商品圖生成                                                                                                                         | 確認 repo 內的應用程式是 Inventrix，而非帳號上的 retail-store 範例                                          |

## 3. 推論與依據

| 推論                                               | 依據                                                                               | 信心                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| 分支策略只能採 org 預設的 trunk-based + squash     | 只有一個 commit、一個分支，沒有可推論的歷史                                        | 低（證據不足，需訪談）                        |
| Commit message 採 Conventional Commits             | 唯一 commit 使用 `chore:` 前綴                                                     | 中                                            |
| 既有 `workshop-stack` 是 CDK 合成的 CloudFormation | logical ID 形如 `AIDLCPlatformWorkshop/Ide/...`；大量 custom resource              | 中                                            |
| 採 CDK TypeScript 可與既有技術一致                 | 應用程式為 TypeScript + pnpm；既有 stack 為 CDK 產出                               | 中                                            |
| 若採 CDK 需要先 bootstrap                          | 帳號沒有 `CDKToolkit` stack                                                        | 高（但 `WSParticipantRole` 是否有權限未確認） |
| 只能部署到 us-east-1                               | 其他 region 被 IAM explicit deny 擋住                                              | 高                                            |
| 目前只有一個環境、沒有 CI/CD                       | repo 沒有 pipeline 設定；帳號沒有其他 stack；部署靠 Workshop Studio 與 `deploy.sh` | 高                                            |
| 測試方法只能先用 org 預設 test-after               | repo 沒有任何測試                                                                  | 低（需訪談）                                  |
| Walking skeleton 不會觸發正式 checkpoint           | 跳過 units-generation，沒有 Unit DAG                                               | 高                                            |

## 4. 訪談決定

訪談紀錄在 `practices-discovery-questions.md`。使用者在訊息 e2cc4817 指示「現在以開發速度為主 你可以直接決定大部分內容」，conductor 依開發速度優先選定各題答案。使用者接著審閱整合摘要，回覆「Looks correct」確認。

| 題目                  | 答案     | 決定內容                                                                                                                        | 落在                             |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Q1 IaC 工具           | A        | AWS CDK（TypeScript）                                                                                                           | Way of Working                   |
| Q2 匯入方式           | A        | `cdk migrate --from-stack` 接手整個 `workshop-stack`，驗收條件是對線上 stack 的 diff 為零；現代化資源放在新的 stack             | Way of Working、Walking Skeleton |
| Q3 環境與部署核准     | A        | 單一環境 us-east-1；每次部署前人工審閱 diff 或 change set                                                                       | Deployment                       |
| Q4 CI 平台            | A        | 先只用本機指令（synth、測試、diff、deploy），pipeline 之後再補                                                                  | Deployment、Testing Posture      |
| Q5 分支與 commit 流程 | A        | 直接在 `main` 上 commit，訊息採 Conventional Commits；為了速度，不採原本建議的短期分支 + squash merge（B）                      | Way of Working                   |
| Q6 程式碼風格工具     | A        | Prettier + ESLint（`typescript-eslint`），只套用在新的 IaC 程式碼                                                               | Code Style                       |
| Q7 IaC 測試方法       | A        | test-after：synth 後寫 CDK assertion / snapshot 測試，加上 `cdk-nag` 與 `cfn-lint`，全部通過才 diff 與部署                      | Testing Posture                  |
| Q8 端到端切片         | A        | 先證明 zero-diff 匯入，再做最小 serverless 切片（S3 + CloudFront、API Gateway + 一個 Lambda、RDS / Aurora），以 smoke test 驗證 | Walking Skeleton                 |
| Q9 硬性規則           | A–H 全選 | 候選 C1–C8 全部成為正式規則：C1–C5 進 `## Mandated`，C6–C8 進 `## Forbidden`                                                    | `discovered-rules.md`            |

## 5. 仍未解決的問題（交給 requirements-analysis）

- **現代化的對象是哪個系統**：使用者描述的目標架構（前端 S3 + CloudFront、後端 API Gateway + Lambda、DB 改 RDS / Aurora）最符合 repo 內的 Inventrix（React SPA + Express + SQLite），但 inventory 中沒有看到 Inventrix 的 EC2 部署。帳號上實際運行的是 IDE、AIDLC Platform（已是 S3 + CloudFront + API Gateway + Lambda）、retail-store 範例（ECS Fargate，catalog 為 0/0）與 Bedrock AgentCore。「AgentCore runtime 可以續用」指的是帳號上的 `strands_agent` Runtime，而 Inventrix 目前沒有使用 AgentCore。需要確認現代化的範圍。
- **匯入範圍**：「import all existing resources」是否包含 Workshop Studio 管理的 IDE 與 AIDLC Platform？這些資源由活動方建立，改動可能影響工作坊環境本身。
- **`WSParticipantRole` 的權限**：能否建立 IAM role（CDK bootstrap 需要）、更新 `workshop-stack`、建立 RDS / Aurora。
- **工作坊帳號的生命週期**：Workshop Studio 帳號通常在活動結束後回收，IaC 是否需要能在新帳號重建。
- **誰驗證 coverage 下限**：`org.md` 對 `infra` scope 要求 80% line coverage，也適用於 IaC 測試程式碼。本 workflow 跳過 code-generation 與 build-and-test，目前安排由 ci-pipeline stage 驗證，需要 requirements-analysis 確認。
- **匯入範圍與硬性規則的互動**：Q2 決定由程式碼接手整個 `workshop-stack`，而 Forbidden 規則禁止未經核准改動工作坊平台資源。接手時的 zero-diff 部署不改動資源；之後任何觸及平台資源的變更都需要明確核准。
