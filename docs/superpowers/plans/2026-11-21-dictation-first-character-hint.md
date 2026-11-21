# 默写首字符提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在新版 `/study` 的英文默写题中自动显示答案字符串去掉前置空格后的第一个字符。

**Architecture:** 将首字符提取封装为 `web/src/lib/hints.ts` 的纯函数，由 `Study.tsx` 的新词拼写和复习默写卡片共同调用。提示作为只读界面文本呈现，不进入输入框，也不改变 `grade` 判分。

**Tech Stack:** React 19、TypeScript、Vite、现有 Tailwind 样式。

**Spec:** `docs/superpowers/specs/2026-11-21-dictation-first-character-hint-design.md`

## Global Constraints

- 提示只显示答案的第一个字符，`take care of` 只显示 `t`。
- 新词拼写和复习默写都显示提示。
- 不改变输入值、答案校验、评分和学习进度逻辑。

## Review Focus

- 前置空格答案应跳过空格后取字符。测试 `"  take care of"` 得到 `t`。
- 多词答案只取整条答案的首字符。测试 `"take care of"` 得到 `t`。
- 空答案不应渲染无意义提示。测试空字符串得到空字符串。
- 提示出现时输入框仍为空且仍由用户输入。通过前端构建和代码检查确认。
- 两种默写卡片都使用同一提取逻辑。通过 `Study.tsx` 调用点检查和构建确认。

### Task 1: Add and test the first-character helper

**Files:**
- Create: `web/src/lib/hints.ts`
- Create: `web/src/lib/hints.test.ts`

**Interfaces:**
- Produces `firstCharacterHint(answer: string): string`.

- [x] **Step 1: Write the failing test**

  Add tests for a normal word, a phrase, leading whitespace, and an empty answer. The phrase assertion must expect `t` for `take care of`.

- [x] **Step 2: Run the focused test and verify it fails**

  Run `pnpm dlx tsx@4.19.2 web/src/lib/hints.test.ts`. Expected result is a failure because `firstCharacterHint` has not been implemented.

- [x] **Step 3: Implement the minimal helper**

  Implement `firstCharacterHint` by trimming leading whitespace and returning the first Unicode character, or an empty string for an empty answer.

- [x] **Step 4: Run the focused test and verify it passes**

  Run `pnpm dlx tsx@4.19.2 web/src/lib/hints.test.ts` and confirm all helper cases pass.

### Task 2: Render the hint in both spelling flows

**Files:**
- Modify: `web/src/views/Study.tsx`

**Interfaces:**
- Consumes `firstCharacterHint` from `web/src/lib/hints.ts`.

- [x] **Step 1: Add the helper import and render the hint in `NewWordCard` step 1**

  Render a small read-only hint above the input using `firstCharacterHint(card.headword)`.

- [x] **Step 2: Render the same hint in `ReviewCard` W2**

  Place the hint next to the existing spelling prompt, before the input, without changing submit or feedback behavior.

- [x] **Step 3: Run the frontend build**

  Run `pnpm --dir web build` and confirm TypeScript and Vite complete successfully.

### Task 3: Verify the requested behavior

**Files:**
- Review: `web/src/lib/hints.ts`, `web/src/views/Study.tsx`

- [x] **Step 1: Run the focused helper tests**

  Run `pnpm dlx tsx@4.19.2 web/src/lib/hints.test.ts` and confirm the phrase case still returns only `t`.

- [x] **Step 2: Run the full frontend build again**

  Confirm the final source compiles and bundles without errors.

- [x] **Step 3: Inspect the diff and repository status**

  Confirm only the design, plan, helper, test, and study-card changes are present and no generated build output is unintentionally tracked.
