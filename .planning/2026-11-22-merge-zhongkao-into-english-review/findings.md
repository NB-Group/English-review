# Findings & Decisions

## Requirements
- English-review 前端和交互作为合并后的第一阶段宿主
- 尽快得到一个能展示中文内容并进入复习流程的合并版本
- 后续统一 Supabase 账号和事件同步

## Research Findings
- English-review 的 active frontend 在 `web/src`，使用 React、Vite、Tailwind、Motion 和 Zustand。路由包括 Today、Study、Library、Goals。
- English-review 的英语数据来自 `data/kaogang/*.json`。进度保存在 Zustand persist 的 `kaogang_v2_profile`，可通过 PythonAnywhere `api/account-data` 同步。
- English-review 的调度使用 `SessionCard`、`EntryProgress`、FSRS 和 `w1/w2/s1/s2` 维度。
- zhongkao-recall 当前提交为 `020a047`。它提供 pnpm workspace、`packages/domain`、版本化内容包、Supabase Auth/Postgres/RLS 和 IndexedDB 离线事件队列。
- 当前中文内容包为 `content/packs/zhongkao-qwen-2026.11.22`，包含 140 篇目、440 个段落、354 个实词义项和 794 张卡片。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 第一阶段只合并前端宿主和中文内容包 | 先交付可运行结果，账号迁移另行验证 |
| 中文卡片使用版本化 ID | 保留内容修订和后续学习状态迁移能力 |
| 第二阶段再迁移 Supabase | 当前 PythonAnywhere 是英语旧账号的运行依赖 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 两套系统的学习状态模型不同 | 第一阶段使用适配层，后续把英语维度拆成独立卡片 |

## Resources
- English-review repository at `/Users/mr00112ml/Documents/ChatGPT/English-review`
- zhongkao-recall checkout at `/tmp/zhongkao-recall.q9EgS2`
