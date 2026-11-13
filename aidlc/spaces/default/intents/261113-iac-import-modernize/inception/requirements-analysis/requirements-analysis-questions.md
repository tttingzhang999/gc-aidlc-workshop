# Requirements Analysis Questions

這份問題用來釐清 IaC 匯入與架構現代化的需求。團隊做法已在 Practices Discovery 確定（CDK TypeScript、`cdk migrate` 接手 `workshop-stack` 並驗證 zero-diff、單一環境人工審閱後部署、先 zero-diff 再做最小 serverless 切片），這裡不重問。每題選一個字母填在 `[Answer]: A` 後面。

背景：

- repo 裡的應用程式是 Inventrix（`inventrix-code/`）：React SPA + Express API + SQLite 單檔資料庫，原本以 `deploy.sh` 部署到單台 EC2。帳號上目前沒有 Inventrix 的部署。
- 帳號上實際在跑的是：工作坊 IDE、AIDLC Platform（本身已是 S3 + CloudFront + API Gateway + Lambda）、Bedrock AgentCore（Runtime `strands_agent`、Gateway），以及 AWS 公開範例 retail-store 的 ECS Fargate 服務（`retail-store-sample-ui`、`retail-store-sample-catalog` 1.6.3 的 container image，catalog 目前 0 個 task）。
- 這個 workflow 的計畫目前跳過 code generation，只產出 IaC、CI 與部署相關的工作。（後來使用者把計畫改為 `poc`，計畫已包含 code generation 與 build-and-test。）

> 使用者指示「改為使用較簡易的流程……我要用最快的速度做出 PoC，你直接幫我填」（訊息 2ff38a15），以下答案由 conductor 依建議選項選定。

## Q1. [產品經理] 要現代化的是哪個系統？

你描述的目標架構（前端 S3 + CloudFront、後端 API Gateway + Lambda、資料庫 RDS / Aurora）要套用在哪個系統上？

A. Inventrix（repo 裡的應用程式）：以新的 stack 部署到 S3 + CloudFront、API Gateway + Lambda、Aurora / RDS（建議）
B. 帳號上的 retail-store ECS 範例（ui、catalog）
C. 兩者都要
D. 只評估、不指定系統，產出通用的改善建議
X. Other (please specify)

[Answer]: A

## Q2. [產品經理] 這次要做到多深？

Inventrix 改成 Lambda + Aurora / RDS，需要改應用程式碼：把 SQLite driver 換成 PostgreSQL / MySQL driver，再加上 Lambda 進入點。這些程式碼變更屬於 code generation，而目前的計畫跳過了這個階段。

A. 完整遷移：IaC 加上應用程式碼修改，所有 API（auth、products、orders、analytics、AI 圖片生成）都搬到 Lambda + Aurora / RDS；計畫加回 code generation 階段（建議）
B. 最小切片：IaC 加上只遷移一條 API（例如 `GET /api/products`），用 smoke test 證明整條路徑可行，其餘留待之後
C. 只做 IaC 與架構評估文件，不改應用程式碼
X. Other (please specify)

[Answer]: A

## Q3. [產品經理] AgentCore Runtime 的角色

你說「agentcore runtime 可以續用」。帳號上的 `strands_agent` Runtime 屬於工作坊平台，Inventrix 目前沒有使用它。它在新架構裡扮演什麼角色？

A. 維持現狀：納入 IaC 管理但不改動，Inventrix 不與它整合（建議）
B. 讓 Inventrix 後端呼叫它，提供新的 AI 功能（需要另外定義功能需求）
C. 把 Inventrix 現有的 AI 商品圖生成改成透過 AgentCore Runtime 執行
X. Other (please specify)

[Answer]: A

## Q4. [架構師] 資料庫選型

Inventrix 目前用 SQLite（4 張表：users、products、orders、order_items），資料量很小。要換成哪一種？

A. Aurora Serverless v2（PostgreSQL），開啟 Data API，Lambda 不必放進 VPC、也不需要管理連線池；閒置時可縮到最小容量（建議）
B. Aurora Serverless v2（MySQL）
C. RDS for PostgreSQL 單一 AZ（db.t4g.micro），Lambda 放進 VPC 並透過 RDS Proxy 連線
D. RDS for MySQL 單一 AZ（db.t4g.micro）
X. Other (please specify)

[Answer]: A

## Q5. [架構師] Lambda 後端的切分方式

Inventrix 的 API 是一個 Express app，有 4 組 route。搬到 Lambda 要怎麼切？

A. 單一 Lambda 執行整個 Express app（透過 adapter），API Gateway 用 proxy 整合；程式碼改動最少（建議）
B. 每組 route 一個 Lambda（auth、products、orders、analytics），共用程式碼抽成 layer
C. 每個 endpoint 一個 Lambda，改寫成原生 handler
X. Other (please specify)

[Answer]: A

## Q6. [架構師] 商品圖片的儲存

商品圖片目前存在 API server 本機的 `public/images/`，AI 生成的圖片也寫在那裡。Lambda 沒有持久的本機磁碟。

A. 改存 S3，透過同一個 CloudFront 的 `/images/*` 路徑提供，前端維持相對路徑 `/images/...`（建議）
B. 改存 S3，API 回傳 presigned URL
X. Other (please specify)

[Answer]: A

## Q7. [資安工程師] 登入驗證與機密值

Inventrix 自己簽發 JWT，程式碼裡有寫死的 JWT secret fallback 與預設密碼。已確定的規則要求機密值放在 Secrets Manager 或環境變數。驗證機制要怎麼處理？

A. 保留應用程式自己的 JWT 驗證，JWT secret 改放 Secrets Manager，移除寫死的 fallback（建議）
B. 改用新的 Cognito user pool，API Gateway 用 Cognito authorizer 驗證
C. 共用帳號上既有的 `agentcore-user-pool`
X. Other (please specify)

[Answer]: A

## Q8. [開發者] 資料的初始化

新的資料庫要放什麼資料？目前沒有正式上線的 Inventrix 資料。

A. 用現有的 seed 邏輯（2 個帳號、24 項商品）初始化新資料庫，不遷移舊資料（建議）
B. 從現有的 SQLite 檔 `inventrix.db` 匯出資料再匯入
C. 空資料庫，不放任何 seed
X. Other (please specify)

[Answer]: A
