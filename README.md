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
