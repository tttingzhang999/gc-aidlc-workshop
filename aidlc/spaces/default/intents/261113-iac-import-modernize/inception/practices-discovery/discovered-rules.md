# Discovered Rules

> 狀態：Lead Integration 完成（Step 5）。以下八條規則由使用者在訪談 Q9 全選（A–H），並以「Looks correct」確認整合摘要。

## Mandated

- ALWAYS 只部署到 us-east-1。
- ALWAYS 以環境變數或 AWS Secrets Manager 提供機密值。
- ALWAYS 先確認轉成程式碼的既有 stack 對線上 stack 的 diff 為零，才部署任何 IaC 變更。
- ALWAYS 對 stateful 資源（EFS、Cognito user pool、S3 bucket、RDS / Aurora、Secrets Manager secret）設定保留刪除政策。
- ALWAYS 在每次部署前審閱 diff 或 change set，經人工確認後才部署。

## Forbidden

- NEVER 在 IaC、`deploy.sh` 輸出或文件中寫死密碼、JWT secret 或 API key。
- NEVER 未經明確核准就修改或刪除工作坊平台本身的資源（IDE EC2 / ASG / EFS、AIDLC Platform、Bedrock AgentCore Runtime 與 Gateway）。
- NEVER 移除或繞過既有的安全控制（IAM、security group、加密設定）而不附風險評估與核准。

## 來源說明

這八條規則原本是 Lead Draft 的候選 C1–C8，依序對應訪談 Q9 的選項 A–H。每條規則的推論證據記錄在 `evidence.md`。
