# Discovered Rules

> 本檔只收錄人在 practices-discovery 訪談（Q4）中確認的硬性限制。`prefers-reduced-motion` 候選規則以開發速度為優先，沒有採用，只記錄在 `evidence.md`。

## Mandated

- ALWAYS 在每個工作單元結束時讓 `pnpm --filter frontend build` 通過。

## Forbidden

- NEVER 為了這次前端重構修改後端 REST API（`inventrix-code/packages/api`）的行為或資料格式。
- NEVER 把 API key、密碼或其他機密寫進程式碼。
- NEVER 把前端改成使用絕對的 API base URL，也不新增部署時才需要設定的前端環境變數。
