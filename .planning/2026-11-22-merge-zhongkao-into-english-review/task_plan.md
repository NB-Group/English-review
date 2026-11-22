# Task Plan: English-review 与中考背诵合并

## Goal
以 English-review 的前端交互为主，将中考背诵内容接入同一套学习入口，并为后续统一 Supabase 账号和事件同步保留边界。

## Next Step
定义英语卡片状态到统一 Supabase 复习事件的迁移方案。

## Current Phase
Phase 1

## Phases

### Phase 1: 内容和领域对齐
- [x] 复制当前中文内容包到 English-review 的版本化数据目录
- [x] 增加中文轨道的共享卡片和学习状态适配层
- [x] 在 English-review 现有外壳中增加中文学习入口
- [x] 验证构建、内容数量和首个复习流程
- **Status:** complete

### Phase 2: 统一账号和事件边界
- [ ] 定义 English `EntryProgress` 到卡片状态的迁移
- [ ] 增加 Supabase 账号和复习事件适配器
- [ ] 将 PythonAnywhere 用户档案导入为迁移基线
- **Status:** pending

### Phase 3: 部署切换
- [ ] 通过现有 Pages 工作流发布合并前端
- [ ] 在账号迁移验证完成前保留 PythonAnywhere 兼容桥
- [ ] 验证中英文进度在刷新和登录后都能恢复
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| English-review 作为第一阶段前端宿主 | 当前学习交互更完整，先保留用户已有使用路径 |
| 中文内容包在构建时接入 | 避免第一阶段新增运行时跨域内容依赖 |
| PythonAnywhere 账号行为暂时保留 | 先合并前端和内容，降低账号迁移风险 |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| 初次调用计划初始化脚本时环境变量未展开 | 先导出 `PWF_SKILL_DIR` 后重新初始化 |
