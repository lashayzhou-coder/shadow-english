---
name: ShadowEnglish Roadmap
description: 项目开发路线图
type: roadmap
---

# ShadowEnglish 开发路线图

## 阶段 1 - P0：音频播放器核心 + PWA 基础（当前阶段）
- 完成率：0%

### 目标
实现音频播放器的核心功能和 PWA 的基础配置。

### 任务
1. 初始化 Vite + React + Tailwind CSS 项目
2. 安装并配置 vite-plugin-pwa
3. 创建 manifest.json 和 PWA 图标
4. 实现 AudioPlayer 组件
   - 播放/暂停
   - 停止
   - 快进/快退
   - 进度条
   - 音量控制
5. 实现变速播放功能
6. 实现 AB 复读功能
7. 实现键盘快捷键

## 阶段 2 - P1：字幕显示 + 单词悬停卡片
- 完成率：0%

### 目标
实现字幕显示和单词交互功能。

### 任务
1. 创建 Transcript 组件
2. 实现文本显示和高亮功能
3. 实现单词悬停卡片
4. 集成翻译 API
5. 实现单词点击详情卡片

## 阶段 3 - P2：听写练习模式
- 完成率：0%

### 目标
实现听写练习功能。

### 任务
1. 创建 DictationMode 组件
2. 实现字幕隐藏功能
3. 实现用户输入和提交功能
4. 实现文本对比 diff 高亮
5. 计算得分

## 阶段 4 - P3：跟读录音与评估
- 完成率：0%

### 目标
实现录音和发音评估功能。

### 任务
1. 创建 ShadowRecording 组件
2. 实现录音功能
3. 实现音频波形可视化
4. 实现 Web Speech API 评估
5. 实现 Google Cloud Speech-to-Text 评估

## 阶段 5 - P4：生词本
- 完成率：0%

### 目标
实现生词本功能。

### 任务
1. 创建 VocabBook 组件
2. 实现 IndexedDB 存储
3. 实现生词本列表和搜索
4. 实现导出 CSV 功能
5. 实现间隔复习提示

## 阶段 6 - P5：Whisper 转录 + 专业评估
- 完成率：0%

### 目标
集成 Whisper 转录和专业评估功能。

### 任务
1. 实现 Whisper API 集成
2. 完善音频转录功能
3. 优化 Google Cloud Speech-to-Text 评估

## 阶段 7 - 优化与发布
- 完成率：0%

### 目标
优化应用并准备发布。

### 任务
1. 优化 UI/UX
2. 修复 bug
3. 测试各功能
4. 生成生产构建

---

## 开发优先级
P0（最高）→ P1 → P2 → P3 → P4 → P5 → 优化与发布
