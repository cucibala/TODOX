# TodoX - 现代化任务清单应用

一个基于 Electron 开发的桌面任务清单程序，界面美观，功能完善。

## 功能特性

- ✅ 添加、编辑、删除任务
- ✅ 标记任务完成/未完成
- ✅ 任务优先级设置（高/中/低）
- ✅ 📅 任务截止日期设置
- ✅ 🖼️ 任务图片附件上传
- ✅ 图片查看器（点击放大查看）
- ✅ 本地数据持久化
- ✅ 现代化 UI 设计
- ✅ 搜索和筛选功能
- ✅ 智能日期显示（今天/已过期/即将到期）

## 安装运行

1. 安装依赖：
```bash
npm install
```

2. 运行应用：
```bash
npm start
```

3. 开发模式（带开发者工具）：
```bash
npm run dev
```

## 打包应用

### 自动打包（根据当前系统）
```bash
npm run build
```

### 打包为 Windows 安装包
```bash
npm run build:win
```
生成文件：`dist/TodoX Setup 1.0.0.exe`

### 打包为 macOS 应用
```bash
npm run build:mac
```
生成文件：`dist/TodoX-1.0.0.dmg`

### 打包为 Linux 应用
```bash
npm run build:linux
```
生成文件：`dist/TodoX-1.0.0.AppImage` 和 `dist/todox_1.0.0_amd64.deb`

### 注意事项
- 打包后的文件在 `dist` 目录中
- Windows 安装包支持自定义安装路径和创建桌面快捷方式
- 如需自定义图标，请将图标文件放在 `assets` 目录（可选）
- 首次打包会下载必要的依赖，可能需要较长时间

## 技术栈

- Electron
- HTML5 + CSS3
- JavaScript (原生)
- electron-builder (打包工具)

