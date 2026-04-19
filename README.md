# ShadowEnglish - 影子英语

英语听说影子训练 PWA 应用。

## 功能特性

- 🎵 音频播放器（变速播放、AB 复读）
- 📝 字幕显示与单词翻译
- 🎤 听写练习
- 🎙️ 跟读录音与发音评估
- 📚 生词本（支持 Anki 导出）
- 📱 PWA 支持（离线使用、添加到主屏幕）

## 技术栈

- React 18 + Vite
- Tailwind CSS
- IndexedDB (idb)
- Web Audio API
- Web Speech API
- PWA (vite-plugin-pwa)

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 版本控制与提交规范

### 每次修改后提交步骤

1. **查看修改状态**
   ```bash
   git status
   ```

2. **暂存修改**
   ```bash
   git add <修改的文件路径>
   # 或者暂存所有修改
   git add .
   ```

3. **提交修改**
   ```bash
   git commit -m "提交说明"
   ```

### 提交信息规范

建议使用以下格式：

```
类型: 描述

详细说明（可选）
```

**类型说明：**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档修改
- `style`: 样式修改
- `refactor`: 代码重构
- `test`: 测试修改
- `chore`: 构建或配置修改

**示例：**
```
feat: 添加强调模式功能 (#15)

- 在视频播放器添加强调模式开关
- 实现强调模式 UI 组件
- 添加键盘快捷键支持 (Ctrl+Shift+E)
```

### 分支管理

- `main`: 主分支，包含稳定的生产版本代码
- `dev`: 开发分支，包含待发布的功能
- 功能分支: 从 `dev` 分支创建，命名格式 `feature/功能名称`

### 推送到远程仓库

```bash
# 推送到当前分支
git push

# 或者指定远程分支
git push origin <分支名>
```

## 开发进度

- [x] P0: 音频播放器核心 + PWA 基础配置
- [ ] P1: 字幕显示 + 单词悬停卡片
- [ ] P2: 听写练习模式
- [ ] P3: 跟读录音与评估
- [ ] P4: 生词本
- [ ] P5: Whisper 转录 + 专业评估

## 项目结构

```
shadow-english/
├── public/
│   └── icons/          # PWA 图标
├── src/
│   ├── components/
│   │   ├── AudioPlayer/
│   │   ├── Transcript/
│   │   ├── WordCard/
│   │   ├── DictationMode/
│   │   ├── ShadowRecording/
│   │   └── VocabBook/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── App.jsx
│   └── main.jsx
└── vite.config.js
```

## 快捷键

- 空格键：播放/暂停
- 左/右箭头：快退/快进 5 秒
- A 键：设置 A 点（AB 复读）
- B 键：设置 B 点（AB 复读）
- C 键：清除 AB 点（AB 复读）
