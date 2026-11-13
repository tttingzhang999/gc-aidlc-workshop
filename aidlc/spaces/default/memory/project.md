# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER 在 IaC、`deploy.sh` 輸出或文件中寫死密碼、JWT secret 或 API key。 (affirmed 2026-11-13)

- NEVER 未經明確核准就修改或刪除工作坊平台本身的資源（IDE EC2 / ASG / EFS、AIDLC Platform、Bedrock AgentCore Runtime 與 Gateway）。 (affirmed 2026-11-13)

- NEVER 移除或繞過既有的安全控制（IAM、security group、加密設定）而不附風險評估與核准。 (affirmed 2026-11-13)

- NEVER 為了這次前端重構修改後端 REST API（`inventrix-code/packages/api`）的行為或資料格式。 (affirmed 2026-11-13)

- NEVER 把 API key、密碼或其他機密寫進程式碼。 (affirmed 2026-11-13)

- NEVER 把前端改成使用絕對的 API base URL，也不新增部署時才需要設定的前端環境變數。 (affirmed 2026-11-13)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS 只部署到 us-east-1。 (affirmed 2026-11-13)

- ALWAYS 以環境變數或 AWS Secrets Manager 提供機密值。 (affirmed 2026-11-13)

- ALWAYS 先確認轉成程式碼的既有 stack 對線上 stack 的 diff 為零，才部署任何 IaC 變更。 (affirmed 2026-11-13)

- ALWAYS 對 stateful 資源（EFS、Cognito user pool、S3 bucket、RDS / Aurora、Secrets Manager secret）設定保留刪除政策。 (affirmed 2026-11-13)

- ALWAYS 在每次部署前審閱 diff 或 change set，經人工確認後才部署。 (affirmed 2026-11-13)

- ALWAYS 在每個工作單元結束時讓 `pnpm --filter frontend build` 通過。 (affirmed 2026-11-13)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
