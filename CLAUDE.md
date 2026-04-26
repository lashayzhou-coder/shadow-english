# Shadow English

英语听说影子训练工具 (English Shadowing Training Tool)

## 项目概述

Shadow English 是一个帮助用户学习英语听力和口语的 Web 应用，支持：
- 音频/视频播放（本地文件、URL、YouTube）
- 字幕显示与翻译
- 单词悬停查词
- 生词本管理
- AB 复读功能

## 技术栈

- React 18 + Vite
- Tailwind CSS
- Zustand (状态管理)
- idb (IndexedDB 封装)
- Workbox (PWA)

## 开发

```bash
npm install
npm run dev      # 开发服务器 localhost:5173
npm run build    # 生产构建
npm run preview # 预览生产构建
```

## Git 版本管理规范

**重要：每次对项目进行修改后，必须提交 git 版本备份。**

### 提交规范

使用中文提交，格式：`fix/feat/chore: 简要描述`

### 常用命令

```bash
git add .
git commit -m "fix: 修复空白页问题"
git push
```

### 提交检查清单

- [ ] 代码修改已完成并测试通过
- [ ] 遵循项目提交规范
- [ ] 无敏感信息泄露

## 目录结构

```
src/
├── components/      # React 组件
│   ├── AudioPlayer/
│   ├── Transcript/
│   ├── WordCard/
│   ├── Settings/
│   └── VocabularyList.jsx
├── services/        # API 服务
│   ├── GeminiApi.js
│   ├── dictionaryApi.js
│   ├── transcriptionApi.js
│   └── storageService.js
├── hooks/          # 自定义 Hooks
└── App.jsx          # 主应用组件
```

## API 配置

项目使用 Gemini API 进行翻译，需要在设置中配置 API Key：
- 默认 Key：`AIzaSyDAuZjMzw0OP7GMKQqsK6-NWjeohi-ohFU`
- 可在应用设置界面修改
