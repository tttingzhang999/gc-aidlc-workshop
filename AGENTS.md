# AGENTS.md

## Project Overview

AIDLC (AI-Driven Development Life Cycle) v2 workshop project — a sample website used as a brownfield codebase.
The AI-DLC v2 engine runs the workflow in 5 gated phases: Initialization, Ideation, Inception, Construction, Operation.
Which stages run depends on the scope/profile chosen at the start of each `/aidlc` run.

## Language Preference

- Respond in Traditional Chinese (zh-TW) except for technical terms
- Technical terms remain in English (e.g., API, function, class)
- Generated documents under `aidlc/` should also be written in Traditional Chinese, keeping technical terms in English

## Workflow & Session Continuity

- Start or resume work with `/aidlc` (Codex CLI: `$aidlc`); the AI-DLC engine manages state, gates, and the audit trail
- Do not read or edit files under `aidlc/` by hand to change workflow state; use the engine commands
- Do not skip approval gates; wait for human approval at each gate

## Security Considerations

- Never include sensitive info (API keys, passwords) directly in code
- Use environment variables or AWS Secrets Manager
