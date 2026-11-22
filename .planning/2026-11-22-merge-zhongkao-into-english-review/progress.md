# Progress Log

## Session: 2026-11-22

### Current Status
- **Phase:** 1 - 内容和领域对齐完成
- **Started:** 2026-11-22

### Actions Taken
- 检查 English-review 的 React 前端、英语数据、FSRS 状态、PythonAnywhere API 和 Pages 发布方式
- 检查 zhongkao-recall 的 workspace、领域包、中文内容包、Supabase 和离线同步
- 确定 English-review 前端作为第一阶段合并宿主
- 初始化合并计划和发现记录
- 复制 `zhongkao-qwen-2026.11.22` 内容包到 English-review
- 新增 `/chinese` 中考背诵入口和本地卡片状态保存
- 中文卡片状态接回 English-review 用户档案，沿用现有 Zustand 和 PythonAnywhere 档案同步
- 将首页和侧栏接入中文背诵入口
- 发布 GitHub Pages 并通过浏览器验证首张诗文句段卡片
- 重写统一首页，加入学科任务卡片和专项训练入口
- 增加全部词组默写、全部单词认知和正式/练习模式选择
- 在词库页加入全部词组默写入口
- 建立旧 English profile 到统一卡片状态的迁移映射
- 增加 Supabase preferences 表迁移和前端适配器
- 将首页、专项训练、内容库和进度导航重写为中性产品结构
- 增加全部词组默写、全部单词认知和学科内容库入口
- 建立旧英语档案到统一卡片状态的迁移映射
- 将内容库改为语文、英语、化学统一入口
- 增加统一进度页和化学模块占位
- 将统一产品发布到 `https://nb-group.github.io/study/` 根站点路径
- 增加 PythonAnywhere 档案的无 PIN 迁移快照导出工具并通过测试

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| English-review current build | Existing frontend builds | Previously verified | passed |
| zhongkao-recall content pack counts | Versioned pack is readable | 140 pieces, 440 segments, 354 senses, 794 cards | passed |
| English-review merged build | TypeScript and Vite build | Build completed with a chunk-size warning | passed |
| Merged Chinese route | `/chinese` displays a study card | First poem segment card displayed online | passed |

### Errors
| Error | Resolution |
|-------|------------|
| Planning initializer first ran with an unexpanded environment variable | Exported `PWF_SKILL_DIR` and reran successfully |
