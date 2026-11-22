# 统一中考复习产品 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 English-review 的产品外壳和学习会话，让语文、英语和未来化学使用统一的今日计划与专项训练入口。

**Architecture:** 以新的中性产品壳层承载学科轨道。内容包、卡片、学习状态和复习事件使用统一接口，具体学科通过任务类型适配交互。第一阶段保留 PythonAnywhere 兼容桥，第二阶段迁移 Supabase Auth 和事件同步。

**Tech Stack:** React 19、TypeScript、Vite、Motion、Zustand、Supabase、IndexedDB。

**Spec:** `docs/superpowers/specs/2026-11-22-unified-zhongkao-product-design.md`

## Global Constraints

- 产品名称暂用「中考复习」，实现中保留可替换能力。
- 首页同时展示各学科今日任务和专项训练。
- 英语支持「认识即可」和「需要默写」两种目标。
- 化学保留学科类型，界面等用户提供内容后接入。
- PythonAnywhere 数据在迁移完成前保持可回退。
- Supabase 迁移需要备份、映射、试导入和核对。

## Review Focus

- 认识即可的英语目标不会被强制进入默写输入。
- 全部词组专项训练会覆盖完整范围，结果按正式默写规则保存。
- 语文选择题和诗文句段使用各自的卡片交互。
- 旧英语进度能通过映射进入新卡片状态。
- 刷新、断网和登录恢复不会丢失本地学习状态。

### Task 1: Product shell and route model

**Files:**
- Modify: `web/src/App.tsx`
- Create: `web/src/views/ProductToday.tsx`
- Create: `web/src/views/PracticeLauncher.tsx`
- Create: `web/src/views/ProductLibrary.tsx`
- Modify: `web/src/styles.css`
- Modify: `web/src/redesign.css`

- [x] **Step 1: Write route and scope tests**
- [x] **Step 2: Implement subject-aware navigation and the unified Today screen**
- [x] **Step 3: Implement the Practice launcher with subject, scope and mode controls**
- [x] **Step 4: Verify English and Chinese entry points from the new shell**

### Task 2: Unified card and session contracts

**Files:**
- Create: `web/src/lib/product-types.ts`
- Create: `web/src/lib/session-builder.ts`
- Create: `web/src/lib/session-builder.test.ts`
- Modify: `web/src/views/Study.tsx`
- Modify: `web/src/views/ChineseStudy.tsx`

- [x] **Step 1: Add failing tests for all-phrase scope and subject filters**
- [x] **Step 2: Implement `ReviewScope`, `PracticeRequest` and card adapters**
- [x] **Step 3: Route both tracks through one session shell**
- [x] **Step 4: Verify formal and practice-only result modes**

### Task 3: English goals and content-range practice

**Files:**
- Modify: `web/src/views/Library.tsx`
- Modify: `web/src/lib/engine.ts`
- Modify: `web/src/lib/store.ts`
- Create: `web/src/lib/practice-selection.test.ts`

- [x] **Step 1: Test recognition-only and dictation goals**
- [x] **Step 2: Add all phrases, filtered phrases and manual selection scopes**
- [x] **Step 3: Add the library-to-practice flow**
- [x] **Step 4: Verify results update the intended learning state**

### Task 4: Supabase migration boundary

**Files:**
- Create: `web/src/lib/unified-backend.ts`
- Create: `web/src/lib/migration-map.ts`
- Create: `web/src/lib/migration-map.test.ts`
- Modify: `web/src/lib/sync.ts`
- Add: `supabase/migrations/` in the selected backend repository

- [x] **Step 1: Test old English keys map to stable card IDs**
- [x] **Step 2: Add the preference schema, migration snapshot boundary and dry-run exporter**
- [x] **Step 3: Integrate Supabase events and locally verify the configured sync path**
- [x] **Step 4: Verify the PythonAnywhere backup and reconcile its baseline in Supabase**
- [x] **Step 5: Let each legacy account verify its PIN and set a Supabase password. Refresh its baseline from the authenticated source during activation.**

### Task 5: Root deployment and cutover

**Files:**
- Modify: GitHub Pages workflow and Vite base configuration
- Add: old-path redirect handling
- Add: release verification record

- [x] **Step 1: Publish the new shell under the chosen canonical domain**
- [x] **Step 2: Verify old `/English-review` links redirect**
- [ ] **Step 3: Verify production Supabase sign-in and account progress after cutover**

## Verification

- Pages release `d78b1c3` serves the app and vocabulary at `https://nb-group.github.io/study/`. Browser checks covered the mixed daily queue, full and selected phrase scopes, session resume, practice-only scoring, settings, and the legacy URL redirect into an independently scored example card.
- The Supabase build was tested with a local browser API fixture. It covers sign-in, review queueing during an outage, retry after reload, and isolation from the old local profile. The PostgreSQL fixture verified role isolation, repeat imports, rejected conflicts, and atomic rollback. These fixtures use synthetic accounts.
- The Aleph project has the additive study migrations. The PythonAnywhere archive checksum matched the downloaded tar. The two reserved Supabase accounts matched all 228 imported card states in both a rollback rehearsal and the committed import.
- A synthetic account exercised the deployed activation endpoint with an incorrect PIN and an accepted PIN. The browser restored the imported scheduler state, reloaded the session, rejected a second activation, and opened the existing local guest profile.
