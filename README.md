# 英语复习助手

一个现代化的英语学习应用，采用液态玻璃UI设计，支持AI智能判题和个性化学习体验。

## ✨ 特性

### 🎨 现代化UI设计
- 液态玻璃效果界面
- 响应式设计，支持桌面和移动设备
- 流畅的页面切换动画
- 深色/浅色主题自适应

### 🤖 AI智能判题
- 集成SiliconFlow API
- 支持语义理解判题
- 个性化学习反馈
- 多模型选择（Qwen3-8B、Qwen2-7B等）

### 📚 分年级学习系统
- 支持七年级、八年级
- 按学期和单元组织内容
- 上册/下册分类管理
- 随机题目顺序

### 📊 学习数据统计
- 实时答题统计
- 正确率分析
- 连击记录
- 错题收集和复习
- 学习时长统计
- 成就系统

### ⚙️ 个性化设置
- API Key配置
- AI模型选择
- 自动进入下一题
- 提示信息开关
- 主题切换

## 🚀 快速开始

### 1. 启动服务器（推荐）
```bash
python server.py
```
然后在浏览器中访问 `http://127.0.0.1:8080`

### 2. 直接打开
直接在浏览器中打开 `index.html` 文件即可开始使用。

### 3. 选择年级
在首页选择你要学习的年级（七年级或八年级）。

### 4. 选择单元
选择要练习的学期和单元，开始答题。

### 5. 配置AI判题（可选）
1. 点击设置按钮（⚙️）
2. 输入SiliconFlow API Key
3. 选择AI模型
4. 启用AI智能判题

## 🔧 AI判题配置

### 获取API Key
1. 访问 [SiliconFlow](https://api.siliconflow.cn/)
2. 注册账号并获取API Key
3. 在应用设置中输入API Key

### 支持的模型
- `Qwen/Qwen3-8B` (推荐)
- `Qwen/Qwen2-7B`
- `Qwen/Qwen2.5-7B-Instruct`
- `meta-llama/Llama-3-8B-Instruct`

## 📁 项目结构

```
English-review/
├── index.html              # 主页面
├── demo.html               # 演示页面
├── style.css               # 样式文件
├── README.md               # 说明文档
├── convert_existing_data.py # 数据转换脚本
└── js/
    ├── app.js              # 主应用文件
    └── modules/
        ├── data-manager.js     # 数据管理
        ├── ui-manager.js       # 界面管理
        ├── ai-grader.js        # AI判题
        ├── settings-manager.js # 设置管理
        └── stats-manager.js    # 统计管理
    └── data/               # 旧版数据文件（可删除）
        └── docx-data.js
└── data/                   # 新版分年级数据结构
    ├── 七年级/
    │   ├── 上册/
    │   │   ├── U1-1.js
    │   │   ├── U1-2.js
    │   │   └── ...
    │   └── 下册/
    │       ├── U3-1.js
    │       ├── U3-2.js
    │       └── ...
    └── 八年级/
        ├── 上册/
        │   ├── U1-1.js
        │   ├── U1-2.js
        │   └── ...
        └── 下册/
            ├── U2-reading.js
            ├── U3-1.js
            └── ...
```

## 📊 数据结构

### 新版分单元文件结构

每个单元文件（如 `data/七年级/上册/U1-1.js`）包含：

```javascript
export const unitData = {
  "title": "七年级上册 Unit 1-1",
  "vocabulary": [
    {
      "english": ["a radio station"],
      "chinese": "一个电台"
    },
    {
      "english": ["a famous musician", "world-famous musician"],
      "chinese": "一位著名的音乐家"
    }
    // ... 更多词汇
  ],
  "wordForms": [
    {
      "word": "able",
      "forms": [
        { "type": "adjective", "chinese": "能够的", "form": "able" },
        { "type": "negative", "chinese": "不能够的", "form": "unable" },
        { "type": "noun", "chinese": "能力", "form": "ability" },
        { "type": "verb", "chinese": "使。。。能", "form": "enable" }
      ]
    }
    // ... 更多词性转换
  ]
};
```

## 🎯 使用指南

### 基础学习流程
1. **选择年级** → 选择要学习的年级
2. **选择单元** → 选择具体的学期和单元
3. **开始答题** → 看中文翻译英文
4. **查看结果** → 获得即时反馈
5. **查看统计** → 分析学习成果

### AI判题模式
启用AI判题后，系统会：
- 理解答案的语义含义
- 提供详细的反馈信息
- 给出改进建议
- 支持同义词和近义词

### 错题管理
- 自动收集错题
- 支持错题重做
- 标记已掌握的题目
- 错题统计分析

### 学习统计
- 总体学习数据
- 分年级/单元统计
- 日常学习记录
- 学习成就系统

## 🛠️ 技术栈

- **前端框架**: 原生JavaScript ES6+
- **UI设计**: CSS3 + 液态玻璃效果
- **AI服务**: SiliconFlow API
- **数据存储**: LocalStorage
- **构建工具**: 无需构建，直接运行

## 📱 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔧 故障排除

### 常见问题

1. **favicon.ico 404错误**
   - 这是正常的，应用已包含favicon.ico占位文件
   - 不影响应用功能

2. **单元数据加载失败**
   - 确保对应的单元文件存在（如 `data/七年级/上册/U1-1.js`）
   - 检查浏览器开发者工具的控制台错误信息
   - 确认文件路径和名称正确

3. **样式显示异常**
   - 清除浏览器缓存
   - 确保 `style.css` 文件正确加载
   - 检查网络连接

4. **AI判题功能**
   - 需要有效的SiliconFlow API Key
   - 确保网络连接正常
   - 检查API配额和使用限制

### 调试技巧

打开浏览器开发者工具（F12）：
- **Console**: 查看JavaScript错误和警告
- **Network**: 检查资源加载状态
- **Elements**: 查看DOM结构和样式

## 🔄 数据管理

### 本地存储
应用使用LocalStorage存储以下数据：
- 用户设置
- 学习统计
- 错题记录
- 会话数据

### 数据导出
支持导出：
- 学习统计数据
- 应用设置
- 错题记录

## 🎨 自定义主题

应用支持：
- 自动主题（跟随系统）
- 浅色主题
- 深色主题

## 📝 更新日志

### v2.0.0 (2024-12-19)
- 🎉 完全重构应用
- ✨ 新增液态玻璃UI效果
- 🤖 集成AI智能判题
- 📊 全新的统计系统
- ⚙️ 完善的设置管理
- 📱 优化移动端体验

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- SiliconFlow 提供AI服务支持
- 设计灵感来自现代化的玻璃拟态设计
- 感谢所有使用和反馈的用户

---

**开始你的英语学习之旅吧！** 🚀
