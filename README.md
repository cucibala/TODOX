# TodoX - 现代化任务管理应用

<div align="center">

![TodoX](assets/tray-icon.png)

一个现代化的桌面任务清单应用，使用 Vue 3 + Electron 构建

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-27.0-blue.svg)](https://www.electronjs.org/)

</div>

## ✨ 特性

- 🎯 **项目管理** - 多项目支持，轻松管理不同类别的任务
- 📝 **任务管理** - 添加、编辑、删除、完成、置顶任务
- 🎨 **子任务系统** - 支持带权重的子任务，自动计算完成进度
- 📊 **进度追踪** - 记录任务进度，可添加文字和图片
- 🖼️ **多图片附件** - 每个任务支持添加多张图片
- 📋 **粘贴图片** - 任务、子任务、进度描述均支持直接粘贴图片（Ctrl+V）
- 🤖 **AI 智能拆解** - 使用 DeepSeek AI 自动分析任务并生成子任务
- 🔍 **智能筛选** - 按状态、优先级、关键词筛选任务
- 🔒 **密码保护** - 支持密码锁定应用
- 💾 **灵活存储** - 自定义数据存储路径
- 🎨 **多种模式** - 支持迷你模式、窗口置顶、桌面背景模式
- 🔔 **系统托盘** - 最小化到系统托盘，快捷访问

## 🖥️ 系统要求

- Windows 10/11
- macOS 10.13+
- Linux (主流发行版)

## 📦 安装

### 下载预编译版本

前往 [Releases](../../releases) 页面下载适合你系统的安装包。

### 从源码构建

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/TodoX.git
cd TodoX

# 2. 安装依赖
npm install
cd src && npm install && cd ..

# 3. 构建并运行
npm start

# 4. 打包（可选）
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## 🚀 快速开始

### 开发模式

需要同时运行两个终端：

**终端 1 - Vite 开发服务器：**
```bash
cd src
npm run dev
```

**终端 2 - Electron：**
```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## 📖 使用指南

### 创建项目

1. 点击侧边栏的 "+" 按钮
2. 输入项目名称
3. 选择项目颜色
4. 点击"创建"

### 添加任务

1. 选择一个项目
2. 在输入框中输入任务内容
3. 设置优先级和截止日期（可选）
4. 添加图片附件（可选）
   - 点击图片按钮选择文件
   - 或直接按 `Ctrl+V` 粘贴剪贴板中的图片
5. 点击"添加"按钮

### 添加子任务

1. 点击任务左侧的圆环进度条
2. 输入子任务内容
3. 选择重要程度（高/中/低）
4. 添加图片（可选）
   - 点击图片按钮选择文件
   - 或直接按 `Ctrl+V` 粘贴图片
5. 点击"添加"

### 快捷键

- `Ctrl/Cmd + L` - 锁定应用
- `F12` - 打开开发者工具（开发模式）

## 🏗️ 技术栈

- **前端框架**: Vue 3 (Composition API)
- **状态管理**: Pinia
- **构建工具**: Vite
- **桌面框架**: Electron
- **样式**: CSS Variables

## 📁 项目结构

```
TodoX/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── package.json         # 项目配置
│
└── src/                 # Vue 源代码
    ├── vite.config.js   # Vite 配置
    ├── package.json     # Vue 依赖
    └── src/
        ├── App.vue      # 根组件
        ├── main.js      # 入口文件
        ├── components/  # 组件目录
        ├── stores/      # 状态管理
        ├── utils/       # 工具函数
        └── assets/      # 静态资源
```

## 🔧 配置

### 数据存储

默认存储位置：
- Windows: `%APPDATA%/todox/`
- macOS: `~/Library/Application Support/todox/`
- Linux: `~/.config/todox/`

可在应用内修改存储路径。

### 自定义主题

编辑 `src/src/assets/styles/variables.css`：

```css
:root {
  --primary-color: #667eea;  /* 主题色 */
  --success-color: #48bb78;  /* 成功色 */
  --danger-color: #f56565;   /* 危险色 */
  --warning-color: #ed8936;  /* 警告色 */
}
```

## 📝 开发文档

- [开发指南](开发指南.md) - 详细的开发说明
- [Vue 重构说明](Vue重构说明.md) - 架构说明
- [构建指南](build-guide.md) - 打包说明

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/)

## 📮 联系方式

如有问题或建议，请：
- 提交 [Issue](../../issues)
- 发送邮件至：cucibala@gmail.com

## 🔮 路线图

- [ ] TypeScript 支持
- [ ] 暗黑模式
- [ ] 数据同步（云端）
- [ ] 移动端应用
- [ ] 团队协作功能
- [ ] 自动更新
- [ ] 多语言支持
- [ ] 插件系统

---

<div align="center">
Made with ❤️ using Vue 3 + Electron
</div>
