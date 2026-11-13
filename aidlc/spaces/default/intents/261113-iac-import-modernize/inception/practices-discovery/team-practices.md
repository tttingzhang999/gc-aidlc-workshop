# Team Practices

> 狀態：Lead Integration 完成（Step 5）。內容依訪談 `practices-discovery-questions.md` 的答案定稿。使用者指示「現在以開發速度為主 你可以直接決定大部分內容」，conductor 據此選定答案，使用者再以「Looks correct」確認整合摘要。推論依據與決定紀錄見 `evidence.md`。
>
> 本次工作：把 AWS 帳號 471112531231（us-east-1）裡由 CloudFormation stack `workshop-stack` 部署的資源納入 IaC 管理，再評估架構並分階段現代化：前端改 S3 + CloudFront、後端改 API Gateway + Lambda、資料庫改 RDS 或 Aurora，Bedrock AgentCore Runtime 沿用。

## Way of Working

- 我們用 AWS CDK（TypeScript）描述所有 AWS 資源（Q1）。
- 我們用 `cdk migrate --from-stack` 把整個 `workshop-stack` 轉成 CDK 程式碼，由程式碼接手管理。接手的驗收條件是對線上 stack 的 diff 為零（Q2）。
- 現代化的資源（S3 + CloudFront、API Gateway + Lambda、RDS / Aurora）放在新的 stack，不塞進接手後的 `workshop-stack`（Q2）。
- 我們直接在 `main` 上 commit，不開功能分支（Q5）。這是為了開發速度，刻意不採 AI-DLC 預設的短期分支加 squash merge。若 AI-DLC 在 Construction 建立 worktree，base 與 merge target 仍是 `main`。
- Commit message 採 Conventional Commits（`feat:`、`fix:`、`chore:`、`ci:` 等）（Q5）。
- IaC 程式碼放在同一個 repo 的獨立目錄，不放進 `inventrix-code/` 的 pnpm workspace，避免 IaC 相依影響應用程式的建置與 `deploy.sh`。目錄名稱交給 infrastructure-design 決定。

## Walking Skeleton

我們先做最薄的端到端路徑，依序兩條（Q8）：

1. **匯入路徑**：`workshop-stack` 轉成 CDK 程式碼後，`cdk synth` 成功，而且 `cdk diff` 對線上 stack 沒有任何變更。這一步證明程式碼與線上現況一致。
2. **現代化路徑**：在新的 stack 建立最小的 serverless 切片，包含 S3 + CloudFront 提供前端靜態檔、API Gateway 加一個 Lambda route、Lambda 連到 RDS 或 Aurora。部署後以一個 smoke test 驗證整條路徑，例如 `GET /api/products` 回 200。

兩條都通過後，才加入其他現代化工作。本 workflow 跳過 units-generation，沒有 Unit DAG，所以不會觸發 AI-DLC 正式的 skeleton checkpoint；這兩條路徑是團隊自己的順序約定。

## Testing Posture

- **Methodology**: test-after
- **Methodology evidence**: repo 原本沒有任何測試或測試工具；訪談 Q7 選 A（先寫 IaC 再補測試），而且使用者指示以開發速度為主，所以不採 TDD。
- **Ordering**: 每完成一個 CDK stack 或 construct，先讓 `cdk synth` 成功，再撰寫並執行該 stack 的 CDK assertion / snapshot 測試、`cdk-nag` 與 `cfn-lint`，全部通過後才執行 `cdk diff` 與部署。
- 匯入的驗收條件：接手後的 `workshop-stack` 對線上 stack 的 `cdk diff` 必須為零。
- 每次部署後都要跑 smoke test 或 health check。
- 檢查目前只在本機執行（Q4）：synth、測試、diff、deploy。pipeline 之後再補。
- `org.md` 對 `infra` scope 的 80% line coverage 下限仍然適用於 IaC 測試程式碼。本 workflow 跳過 code-generation 與 build-and-test，驗證這個下限的工作交給 ci-pipeline stage；requirements-analysis 要確認這個安排（待決事項）。
- Test Strategy 為 Standard，決定測試數量與類型；scope 的下限只會往上加，不會降低。

## Deployment

- 只用一個環境，就是這個工作坊帳號的 us-east-1（Q3）。其他 region 被 IAM explicit deny 擋住。
- 每次部署前先產生並審閱 `cdk diff` 或 change set，經人工確認後才部署（Q3）。不採 deploy-on-merge。
- 部署目前從本機執行，還沒有 CI/CD pipeline（Q4）。
- stateful 資源（EFS、Cognito user pool、S3 bucket、RDS / Aurora、Secrets Manager secret）一律設定保留的刪除政策，避免 IaC 變更誤刪資料。
- 每個部署程序都要附 rollback 步驟。基本做法是依賴 CloudFormation 的自動 rollback，必要時重新部署前一版 template。
- 帳號目前沒有 `CDKToolkit` bootstrap stack，第一次部署前必須先 bootstrap。`WSParticipantRole` 是否有權限 bootstrap、更新 `workshop-stack` 與建立 RDS / Aurora，交給 requirements-analysis 確認（待決事項）。

## Code Style

- 新的 IaC 程式碼使用 Prettier 格式化、ESLint（`typescript-eslint`）檢查（Q6）。`inventrix-code/` 應用程式這次不套用。
- 在 pipeline 建立之前，lint 與 format 檢查跟測試一樣在本機執行，失敗就不部署。
- TypeScript 開啟 `strict`，模組採 ESM，套件管理用 pnpm，Node.js 22，與應用程式一致。
- 命名遵循語言慣例：TypeScript 變數與函式用 camelCase，CDK construct ID 用 PascalCase。
- 機密值不得寫進程式碼，一律使用環境變數或 AWS Secrets Manager。
