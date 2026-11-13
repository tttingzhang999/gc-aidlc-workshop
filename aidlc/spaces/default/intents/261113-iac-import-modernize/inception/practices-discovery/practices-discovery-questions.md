# Practices Discovery Questions

這份問題用來確認這次 IaC 匯入與架構現代化工作的團隊做法。草稿見 `team-practices.md`、`discovered-rules.md`，推論依據見 `evidence.md`。每題選一個字母填在 `[Answer]:` 後面；複選題可填多個字母。

> 使用者指示「現在以開發速度為主，你可以直接決定大部分內容」（訊息 e2cc4817），以下答案由 conductor 依開發速度優先選定。

## Q1. [平台工程師] IaC 工具

repo 目前沒有任何 IaC。既有的 `workshop-stack` 看起來是 CDK 合成的 CloudFormation，應用程式本身是 TypeScript + pnpm。之後所有資源要用哪個工具描述？

A. AWS CDK（TypeScript），與應用程式語言和既有 stack 的產生方式一致（建議）
B. Terraform（HCL）
C. 直接維護 CloudFormation YAML
X. Other (please specify)

[Answer]: A

## Q2. [平台工程師] 既有資源的匯入方式

帳號裡的資源全部屬於同一個 CloudFormation stack `workshop-stack`（289 個資源，約 25 個 custom resource），包含工作坊 IDE、AIDLC Platform、AgentCore 與 retail 範例。要怎麼把它們納入程式碼管理？

A. 用 `cdk migrate --from-stack` 把整個 `workshop-stack` 轉成程式碼，由程式碼接手管理，驗收條件是對線上 stack 的 diff 為零（建議）
B. 用 `cdk import` 或 Terraform `import`，把選定的資源搬進新的 stack，原 stack 只留下其餘資源
C. 只匯出 template 當作參考文件，不接手既有 stack；現代化的資源全部放在新的 stack
D. 只匯入現代化會用到的資源（例如 retail 範例的 VPC 與 ECS），工作坊平台資源保持原狀
X. Other (please specify)

[Answer]: A

## Q3. [發佈工程師] 環境與部署核准

這個帳號只能用 us-east-1，目前只有一個環境，也沒有 CI/CD。IaC 變更要怎麼部署？

A. 只用一個環境；每次部署前先產生並審閱 diff 或 change set，人工確認後才部署（建議）
B. 同一個帳號內用名稱前綴區分 dev 與 prod；dev 自動部署，prod 需要人工核准
C. 合併到 `main` 後自動部署
X. Other (please specify)

[Answer]: A

## Q4. [發佈工程師] CI 平台

部署與檢查要在哪裡執行？帳號內已經有 CodeCommit repo `aidlc-workshop`。

A. 先只用本機指令（synth、測試、diff、deploy），之後再補 pipeline（建議）
B. AWS CodeBuild + CodePipeline，搭配帳號內的 CodeCommit
C. GitHub Actions
X. Other (please specify)

[Answer]: A

## Q5. [開發者] 分支與 commit 流程

repo 只有一個 commit、一個 `main` 分支，看不出既有習慣。程式碼變更要怎麼進到 `main`？

A. 直接在 `main` 上 commit，訊息採 Conventional Commits（`feat:`、`fix:`、`chore:` 等）
B. 每項工作開短期分支，完成後 squash merge 回 `main`，訊息採 Conventional Commits（AI-DLC 預設）（建議）
C. 推到 CodeCommit `aidlc-workshop`，透過 pull request 審閱後合併
X. Other (please specify)

[Answer]: A

## Q6. [開發者] 程式碼風格工具

repo 目前沒有 ESLint、Prettier 或 EditorConfig，只有 TypeScript `strict`。要導入哪些工具、範圍多大？

A. Prettier + ESLint（`typescript-eslint`），只套用在新的 IaC 程式碼（建議）
B. Prettier + ESLint，IaC 與 `inventrix-code/` 應用程式一起套用
C. 暫時不導入工具，只依 TypeScript `strict` 與語言慣例
X. Other (please specify)

[Answer]: A

## Q7. [品質工程師] IaC 的測試方法

repo 目前沒有任何測試。`infra` 這類工作預設要求 80% line coverage，並在合併前執行檢查。IaC 要怎麼測？

A. 先寫 IaC，再補測試：synth 成功後，寫 CDK assertion / snapshot 測試，加上 `cdk-nag` 與 `cfn-lint`，全部通過才 diff 與部署（建議）
B. 先寫測試再寫 IaC（TDD）：先寫期望的資源 assertion，再實作 construct
C. 只做靜態檢查（`cdk-nag`、`cfn-lint`），不寫單元測試
X. Other (please specify)

[Answer]: A

## Q8. [交付負責人] 先做一條最薄的端到端路徑？

先做最薄的端到端路徑嗎？walking skeleton 指一個最小、但從頭到尾跑得通的版本，先做出來證明各環節接得起來，再加入其他功能。

A. 兩條都做，依序進行：先證明匯入後對線上 stack 的 diff 為零，再做最小的 serverless 切片（S3 + CloudFront、API Gateway + 一個 Lambda、連到 RDS / Aurora，以一個 smoke test 驗證）（建議）
B. 只做匯入的 zero-diff 驗證
C. 只做現代化的最小 serverless 切片
D. 不做，直接完整實作
X. Other (please specify)

[Answer]: A

## Q9. [交付負責人] 硬性規則（select all that apply）

以下規則是從證據推論的候選。選中的會成為這個專案的正式規則，之後每個階段都必須遵守；沒選的不會生效。

A. ALWAYS 只部署到 us-east-1。
B. ALWAYS 以環境變數或 AWS Secrets Manager 提供機密值。
C. ALWAYS 先確認轉成程式碼的既有 stack 對線上 stack 的 diff 為零，才部署任何 IaC 變更。
D. ALWAYS 對 stateful 資源（EFS、Cognito user pool、S3 bucket、RDS / Aurora、Secrets Manager secret）設定保留刪除政策。
E. ALWAYS 在每次部署前審閱 diff 或 change set，經人工確認後才部署。
F. NEVER 在 IaC、`deploy.sh` 輸出或文件中寫死密碼、JWT secret 或 API key。
G. NEVER 未經明確核准就修改或刪除工作坊平台本身的資源（IDE EC2 / ASG / EFS、AIDLC Platform、Bedrock AgentCore Runtime 與 Gateway）。
H. NEVER 移除或繞過既有的安全控制（IAM、security group、加密設定）而不附風險評估與核准。
X. Other (please specify)

[Answer]: A, B, C, D, E, F, G, H

## Consolidated Summary Confirmation

- IaC 工具：AWS CDK（TypeScript）
- 匯入方式：`cdk migrate --from-stack` 接手整個 `workshop-stack`，驗收條件是對線上 stack 的 diff 為零；現代化資源放在新的 stack
- 部署：單一環境（us-east-1），每次部署前人工審閱 diff 或 change set
- CI：先只用本機指令（synth、測試、diff、deploy），之後再補 pipeline
- 分支：直接在 `main` 上 commit，訊息採 Conventional Commits
- 程式碼風格：Prettier + ESLint（`typescript-eslint`），只套用在新的 IaC 程式碼
- 測試：test-after，synth 後寫 CDK assertion / snapshot 測試，加上 `cdk-nag` 與 `cfn-lint`，全部通過才 diff 與部署
- 端到端切片：先做 zero-diff 匯入，再做最小 serverless 切片並以 smoke test 驗證
- 硬性規則：採用全部 8 條（A–H）

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
