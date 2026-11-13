<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-13T06:04:49Z — repo 只有一個 commit，分支策略無從推論，Way of Working 先採 org 預設 trunk-based + squash，並標為假設待訪談確認
- 2026-11-13T06:04:49Z — `infra` scope 為 `skeleton: on`，但沒有 Unit DAG，不觸發正式 checkpoint；改提「zero-diff 匯入」與「最小 serverless 切片」兩條候選的端到端路徑

## Deviations

- 2026-11-13T06:04:49Z — 從證據推得的硬性限制只列為候選（C1–C8），`## Mandated` / `## Forbidden` 先寫 `None.`，因為使用者還沒有明確說出任何硬性限制
- 2026-11-13T06:09:26Z — Q5 採 A（直接在 `main` 上 commit），不採原本建議的 B（短期分支 + squash merge），依據是使用者「以開發速度為主」的指示（訊息 e2cc4817）；AI-DLC 若建立 Construction worktree，base 與 target 仍是 `main`

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-11-13T06:04:49Z — IaC 工具草擬為 CDK TypeScript（既有 stack 為 CDK 合成、應用程式為 TS + pnpm），代價是帳號尚未 bootstrap，且 `WSParticipantRole` 權限未知；Terraform 需要把資源搬出 CloudFormation，風險較高

## Open questions

- 2026-11-13T06:04:49Z — 現代化對象不明：目標架構符合 repo 內的 Inventrix，但帳號上沒有 Inventrix 部署，而 AgentCore Runtime 屬於工作坊平台；交給 requirements-analysis 確認
- 2026-11-13T06:04:49Z — CodeKB 來自另一個 intent，只涵蓋 Inventrix 程式碼，不涵蓋 `workshop-stack` 的 AWS 資源
- 2026-11-13T06:04:49Z — `infra` scope 的 80% line coverage 下限在 code-generation 與 build-and-test 被跳過時由哪個 stage 驗證

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
