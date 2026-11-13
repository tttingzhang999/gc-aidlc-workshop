# Requirements：Inventrix Serverless PoC 與既有資源 IaC 化

## 意圖分析

使用者的原始需求：

> create IaC at this repo / import all existing resources / 然後評估架構如何改進 / 前端改成 s3 + cloudfront / 後端改成 api gateway + lambda / Db 改成 rds 或 aurora / agentcore runtime 可以續用

之後使用者把計畫改為 `poc`，並要求「用最快的速度做出 PoC」。這份需求因此有兩個目標：

1. **既有資源程式碼化**：把 AWS 帳號 471112531231（us-east-1）裡由 CloudFormation stack `workshop-stack` 部署的資源，轉成 repo 內的 CDK（TypeScript）程式碼，並證明程式碼與線上現況一致。
2. **Inventrix serverless PoC**：證明 repo 內的 Inventrix 應用程式（見 `business-overview.md`、`architecture.md`）能以 S3 + CloudFront、API Gateway + Lambda、Aurora Serverless v2 的架構運作。

類型：遷移（migration）加上基礎架構程式碼化；範圍跨前端、後端、資料庫與 IaC；複雜度 standard，依 PoC 計畫以 Minimal 深度撰寫。

決定來源：`requirements-analysis-questions.md` 的 Q1–Q8（皆選 A，由 conductor 依使用者指示選定），以及 Practices Discovery 定案的團隊做法（`team-practices.md`）。

## 功能需求

### FR1：既有 `workshop-stack` 程式碼化

- **FR1.1**：repo 內有一個獨立的 IaC 目錄（不在 `inventrix-code/` 的 pnpm workspace 內），以 `cdk migrate --from-stack` 從線上 `workshop-stack` 產生 CDK TypeScript 程式碼。
  - Given 線上 stack `workshop-stack` 為 `CREATE_COMPLETE`；When 執行產生程式碼的指令；Then repo 內出現可編譯的 CDK app，stack 名稱對應 `workshop-stack`。
- **FR1.2**：產生的 CDK app 能 `cdk synth` 成功。
  - Given FR1.1 的程式碼；When 執行 `cdk synth`；Then 指令 exit code 為 0。
  - Given 產生的程式碼含無法合成的 construct；When 執行 `cdk synth`；Then 錯誤訊息指出是哪個資源，並記錄為已知差異，不靜默略過。
- **FR1.3**：`cdk diff` 對線上 `workshop-stack` 的資源差異為零（zero-diff）。
  - Given FR1.2 成功；When 執行 `cdk diff workshop-stack`；Then 沒有任何資源新增、刪除或修改。
  - Given diff 不為零；When 檢視結果；Then 每一項差異都被列出並說明原因，且不部署。
- **FR1.4**：這次不對 `workshop-stack` 執行 `cdk deploy`。工作坊平台資源（IDE、AIDLC Platform、AgentCore Runtime 與 Gateway）維持原狀（Q3、`project.md` 的 Forbidden 規則）。

### FR2：前端改為 S3 + CloudFront

- **FR2.1**：新的 CDK stack（例如 `InventrixServerlessStack`，與 `workshop-stack` 分開）建立一個 S3 bucket 存放 `packages/frontend` 的 build 輸出，以 CloudFront 提供（Origin Access Control，bucket 不公開）。
  - Given 前端 build 完成並部署；When 瀏覽 CloudFront 網域的 `/`；Then 回傳 HTTP 200 與 SPA 的 `index.html`。
- **FR2.2**：SPA 的 client-side route（例如 `/orders`、`/admin/products`）在 CloudFront 重新整理時仍回傳 `index.html`。
  - Given 使用者在 `/admin/products` 重新整理；When CloudFront 從 S3 找不到該路徑；Then 回傳 `index.html` 且 HTTP 200，而不是 403 或 404。
- **FR2.3**：前端維持相對路徑 `/api`、`/images`，不新增 API base URL 環境變數（`architecture.md`、`project.md` 的 Forbidden 規則）。CloudFront 以 behavior 把 `/api/*` 轉送到 API Gateway、把 `/images/*` 轉送到圖片 bucket。
  - Given 前端呼叫 `fetch('/api/products')`；When 經過 CloudFront；Then 請求送到 API Gateway 並回傳商品列表 JSON。

### FR3：後端改為 API Gateway + Lambda

- **FR3.1**：一個 Lambda 執行整個 Express app（透過 adapter），API Gateway 以 proxy 整合把 `/api/*` 全部轉給它（Q5）。
- **FR3.2**：現有的 API 行為在 Lambda 上維持相同：`/api/auth`（login、register）、`/api/products`（列表、單筆、新增、修改、刪除、`generate-image`）、`/api/orders`（列表、建立、修改狀態）、`/api/analytics`（dashboard、inventory）。路徑、HTTP method、request 與 response JSON 格式不變（見 `code-structure.md`）。
  - Given 已登入的 customer；When `POST /api/orders` 送出有效品項；Then 回傳 201 與 subtotal、gst（10%）、total。
  - Given 庫存不足；When `POST /api/orders`；Then 回傳 400，且不建立訂單。
- **FR3.3**：本機開發仍可用 `pnpm dev` 啟動 Express（不必透過 Lambda）。

### FR4：資料庫改為 Aurora Serverless v2（PostgreSQL）

- **FR4.1**：新 stack 建立 Aurora Serverless v2 PostgreSQL cluster，開啟 Data API；Lambda 透過 Data API 存取，不放進 VPC（Q4）。
- **FR4.2**：後端的資料存取從 better-sqlite3 改為 Aurora Data API，4 張表（users、products、orders、order_items）的 schema 改寫為 PostgreSQL 語法。
- **FR4.3**：建立訂單時，寫入 `orders`、`order_items` 與扣庫存在同一個資料庫 transaction 內完成（修正原本沒有 transaction 的問題，見 `architecture.md`）。
  - Given 訂單有兩個品項且第二個寫入失敗；When transaction rollback；Then `orders`、`order_items`、`products.stock` 都沒有變動。
- **FR4.4**：資料庫為空時，以現有 seed 邏輯初始化：2 個帳號、24 項商品（Q8）。初始化可重複執行，第二次執行不產生重複資料。

### FR5：商品圖片改存 S3

- **FR5.1**：24 張 seed 商品圖上傳到圖片 bucket，透過 CloudFront `/images/*` 提供，前端 `image_url` 維持 `/images/<name>.png`（Q6）。
  - Given 商品 `image_url` 為 `/images/laptop.png`；When 瀏覽器載入；Then 經 CloudFront 回傳該 PNG，HTTP 200。
- **FR5.2**：AI 商品圖生成（Bedrock Nova Canvas）的輸出寫入圖片 bucket，而不是 Lambda 本機磁碟；回傳的 `imageUrl` 維持 `/images/<timestamp>-<name>.png` 格式。

### FR6：機密值與驗證

- **FR6.1**：保留應用程式自己的 JWT 驗證；JWT secret 存在 Secrets Manager，Lambda 啟動時讀取（Q7）。
- **FR6.2**：移除程式碼中寫死的 JWT secret fallback。
  - Given Lambda 讀不到 JWT secret；When 啟動或處理請求；Then 回傳 500 並記錄錯誤，不使用任何預設 secret。
- **FR6.3**：Aurora 的資料庫帳密由 CDK 產生並存在 Secrets Manager，不出現在程式碼或輸出中。

### FR7：AgentCore Runtime 續用

- **FR7.1**：AgentCore Runtime `strands_agent` 與 Gateway `agentcore-context-gateway` 維持原狀，只透過 FR1 納入程式碼管理，不改設定，Inventrix 也不與它們整合（Q3）。

### FR8：架構評估

- **FR8.1**：產出一份架構評估文件，比較現況（單台 EC2 + SQLite、帳號上的 `workshop-stack`）與 PoC 後的架構，列出至少兩項改進建議與取捨，以及從 PoC 走向正式環境還缺什麼（例如 CI/CD、監控、WAF、custom domain）。

## 非功能需求

- **NFR1（部署區域）**：所有資源只部署在 us-east-1。驗收：`cdk synth` 產出的每個 stack 的 region 都是 us-east-1。
- **NFR2（資料保留）**：圖片 bucket、Aurora cluster、Secrets Manager secret 設定保留刪除政策（`RemovalPolicy.RETAIN` 或 snapshot）。驗收：synth 後的 template 中這些資源的 `DeletionPolicy` 為 `Retain` 或 `Snapshot`。
- **NFR3（機密值）**：程式碼、CDK 輸出與 log 中不出現密碼、JWT secret 或 API key。驗收：以 `git grep` 搜尋已知 secret 字樣沒有結果，且 synth 後的 template 不含明文 secret。
- **NFR4（安全基線）**：前端與圖片 bucket 封鎖公開存取，只允許 CloudFront OAC 讀取；CloudFront 只接受 HTTPS（HTTP 重導至 HTTPS）；Lambda 的 IAM role 只有 Aurora Data API、該 secret、圖片 bucket 寫入與 Bedrock `InvokeModel` 的權限。驗收：`cdk-nag` 的 AwsSolutions 規則檢查沒有未說明的錯誤。
- **NFR5（部署流程）**：部署前先執行 `cdk diff`，經人工確認後才 `cdk deploy`（`project.md` 的 Mandated 規則）。
- **NFR6（PoC 驗收）**：部署後一個 smoke test 依序呼叫 `GET /api/products`（200 且有 24 項）、`POST /api/auth/login`（seed 帳號回 200 與 token）、`GET /images/<seed>.png`（200），全部通過才算 PoC 成功。
- **NFR7（測試）**：依 Minimal 測試策略，每個需求群組至少一個測試：CDK assertion 測試（新 stack 含 S3、CloudFront、API Gateway、Lambda、Aurora）、後端資料存取層的單元測試，以及 NFR6 的 smoke test。

## 限制

- AWS 帳號是 Workshop Studio 的活動帳號，角色為 `WSParticipantRole`（附 `PowerUserAccess` 與工作坊自訂 policy）。只能使用 us-east-1。
- 帳號沒有 CDK bootstrap stack（`CDKToolkit`），部署新 stack 前必須先 bootstrap。
- 不得未經核准修改工作坊平台資源（`project.md` 的 Forbidden 規則）。
- 前端維持相對路徑 `/api`、`/images`（`project.md` 的 Forbidden 規則）。
- IaC 使用 CDK TypeScript、Node.js 22、pnpm（`team-practices.md`）。

## 假設

- **A1**：`WSParticipantRole` 能建立 CDK bootstrap 所需的 IAM role，以及 Lambda execution role。`PowerUserAccess` 本身不含 IAM 寫入權限，是否允許要看工作坊自訂 policy。若不允許，PoC 改為只 synth、不 deploy，並在評估文件中記錄。
- **A2**：Aurora Serverless v2 PostgreSQL 與 Data API 在 us-east-1 可用。PoC 的資料量很小，最小容量即可。
- **A3**：`cdk migrate --from-stack` 能處理 `workshop-stack` 約 25 個 custom resource 與 CDK asset 參照。若部分資源無法轉換，記錄差異，不阻擋 FR2–FR8。
- **A4**：Bedrock Nova Canvas（`amazon.nova-canvas-v1:0`）在 us-east-1 對這個帳號可用，與現有程式碼相同。
- **A5**：不需要 custom domain，使用 CloudFront 預設網域即可。
- **A6**：沒有正式上線的 Inventrix 資料需要遷移。

## 範圍外

- 修改或部署 `workshop-stack`（只程式碼化並驗證 zero-diff）。
- retail-store ECS 範例的現代化（Q1）。
- 讓 Inventrix 與 AgentCore 整合（Q3）。
- 改用 Cognito（Q7）。
- CI/CD pipeline、監控告警、WAF、custom domain、多環境（列入 FR8.1 的評估建議）。
- 前端 UI/UX 重構（由另一份前端工作處理）。

## 待解問題

- **OQ1**：A1 的 IAM 權限需要在 code generation 階段實際 bootstrap 才能確認。
- **OQ2**：另一份前端 UI/UX 工作在 `project.md` 加了「不為前端重構修改後端 REST API 行為或資料格式」的規則。這次的後端改動維持相同的 API 路徑與 JSON 格式（FR3.2），因此不衝突；若兩份工作同時修改 `inventrix-code/`，需要注意合併衝突。
