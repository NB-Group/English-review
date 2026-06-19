# 英语复习助手

英语词汇复习系统，支持 AI 智能判题与词形转换特训。

## 快速开始

```bash
pip install -r requirements.txt    # 仅数据提取脚本需要
python server.py                   # 启动开发服务器
```

浏览器打开 `http://127.0.0.1:8080`。

## 功能

### 两种学习模式

| 模式 | 内容 | 判题 |
|------|------|------|
| **普通模式** | 看中文写英文词组 | 精确匹配 → AI 语义判题（可选） |
| **词转特训** | 词形/词性转换（如动词→名词、形容词→副词） | 精确匹配 |

词转数据由 AI（Qwen3-8B）从教师 DOCX 词组清单自动提取，按源词分组存储。

### AI 判题

集成 SiliconFlow API，语义级别判断答案正误。可配置 API Key 和模型。词转模式不使用 AI 判题以减少延迟。

### 错题本

自动收集错题，支持标记已掌握、删除、重做。可导出双栏 `.doc` 文件。

### 账号系统

首次打开输入用户名，学习数据（设置、进度、错题）自动同步到服务器 `local_accounts/` 目录。

### 进度恢复

每道题实时保存，刷新页面自动恢复到离开时的位置。支持上一题回退和跳过。

## 项目结构

```
English-review/
├── index.html                  # 主页面
├── style.css                   # 液态玻璃暗色主题
├── server.py                   # 静态文件 + API 服务器
├── CLAUDE.md                   # Claude Code 指引
├── requirements.txt            # Python 依赖
│
├── js/
│   ├── main.js                 # 入口，全局 EnglishReview 对象
│   ├── app.js                  # 核心调度（导航、判题、进度）
│   └── modules/
│       ├── data-manager.js     # 加载数据文件并转换格式
│       ├── ui-manager.js       # 页面渲染与交互
│       ├── ai-grader.js        # SiliconFlow API 判题
│       ├── settings-manager.js # 设置 CRUD
│       ├── stats-manager.js    # 统计、错题本、导出
│       └── account-storage.js  # 多用户账号 + 服务器存档
│
├── data/
│   └── 八年级/
│       ├── Down/               # 单元数据 .js 文件
│       │   ├── U1-reading.js
│       │   ├── U1-speaking.js
│       │   ├── ...
│       │   └── transform/      # 词转特训 .json（AI 提取）
│       └── Up/
│
├── tools/
│   ├── extract_transform_data_with_qwen.py  # AI 提取词转数据
│   └── build_grade8_down_from_docx.py       # DOCX → JS 单元数据
│
└── local_accounts/             # 用户数据（自动生成）
```

## 数据格式

### 单元数据（`.js`）

```js
const unitData = {
  "title": "八年级下册 Unit 1 Reading(1)",
  "vocabulary": [
    { "english": ["a master of art"], "chinese": "艺术大师" }
  ],
  "wordForms": [
    { "word": "able", "forms": [
      { "type": "adjective", "chinese": "能够的", "form": "able" },
      { "type": "noun", "chinese": "能力", "form": "ability" }
    ]}
  ]
};
// 底部双导出兼容 CommonJS 和全局变量
```

### 词转数据（`transform/*.json`）

```json
{
  "unit": "U4-reading",
  "transformGroups": [
    {
      "source": "confident",
      "sourcePos": "adj",
      "sourceMeaning": "自信的",
      "transforms": [
        { "type": "noun", "form": "confidence", "meaning": "信心" }
      ]
    }
  ]
}
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/scan-units` | GET | 扫描 `data/` 目录，返回所有可用单元 |
| `/api/account-data?user=xxx` | GET | 加载用户数据 |
| `/api/account-data?user=xxx` | POST | 保存用户数据 |

## 数据提取工具

```bash
# 从 DOCX 提取词转数据（并行调用 AI）
python tools/extract_transform_data_with_qwen.py --force --workers 8

# 仅提取文本快照（不调 AI）
python tools/extract_transform_data_with_qwen.py --txt-only

# 从 DOCX 构建单元 JS 文件
python tools/build_grade8_down_from_docx.py
```
