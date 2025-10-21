# TodoX - 现代化任务管理应用

<div align="center">

![TodoX](assets/X.png)

一个现代化的桌面任务清单应用，使用 Vue 3 + Electron 构建

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-27.0-blue.svg)](https://www.electronjs.org/)

</div>

## 核心功能

- **项目管理**：多项目分类管理、导出导入（加密保护）
- **任务管理**：新增/编辑/删除/完成/置顶，优先级与截止日期
- **子任务**：权重计算整体进度、拖拽排序、支持必填输入
- **进度追踪**：文字 + 图片记录，支持粘贴图片（Ctrl+V）
- **图片附件**：多图上传、缩略图预览、点击放大
- **内置 AI 助手**：创建/管理/修改任务、制定计划、智能拆解
- **筛选与搜索**：按状态、优先级、关键词快速定位
- **安全与存储**：应用锁定、自定义数据路径、自动清理孤立数据
- **窗口模式**：迷你模式、置顶、桌面背景模式
- **系统托盘**：最小化到托盘，快速显示/隐藏

## AI 助手

内置多模型 AI 助手（支持 DeepSeek、豆包）：帮你创建任务、管理任务、制定计划，并基于项目上下文给出建议。

### 功能
- **双模型支持**：DeepSeek 和火山引擎豆包，智能自动选择或手动切换
- **多模态输入**：支持文字+图片同时发送，AI 可理解图片内容
- **思考过程**：显示 AI 推理过程（可折叠），了解决策思路
- **角色系统**：通用助手、项目助手（可扩展）
- **项目上下文**：可关联项目，自动读取项目/任务/子任务信息
- **任务操作**：创建/修改/删除任务、调整现有项目计划
- **子任务管理**：批量添加/修改/删除子任务
- **流式回复**：长文本分段输出，阅读更流畅
- **进度提示**：批量操作显示实时状态与耗时
- **后台运行**：切换页面不中断聊天，自动保存
- **对话管理**：新建/切换/删除/清空，对话本地持久化
- **密钥安全**：API 密钥本地加密保存，可随时更新/删除

### 使用方法
- 在"设置"中配置 AI 模型密钥（DeepSeek 或豆包）
- 打开"聊天"页面，选择 AI 角色（项目助手可勾选关联项目）
- 点击顶部模型按钮可切换 DeepSeek/豆包
- 直接用自然语言提出需求，例如：
  - "为项目 A 创建发布计划并拆解任务"
  - "把登录模块拆成具体子任务"
  - "第3天太难了，简化一下"（调整现有计划）
  - "删除第2个任务"
  - "给环境准备任务增加权限申请子任务"
- 点击图片按钮上传图片，或按 Ctrl+V 粘贴图片
- 使用 Ctrl+Enter 发送消息

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
- **数据库**: SQLite (better-sqlite3)
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

**数据库**：使用 SQLite 存储所有数据（项目、任务、聊天记录等）

默认存储位置：
- Windows: `%APPDATA%/todox/todox.db`
- macOS: `~/Library/Application Support/todox/todox.db`
- Linux: `~/.config/todox/todox.db`

**特性**：
- 自动从旧版 JSON 文件迁移数据
- 原 JSON 文件自动备份至 `json-backup/` 目录
- WAL 模式提升并发性能
- 事务处理保证数据一致性
- 版本管理系统支持平滑升级
- 可在应用内修改存储路径（自动迁移数据库文件）

**版本管理**：
- 当前数据库版本：v1
- 自动检测版本并逐版本升级
- 详见 `数据库升级指南.md`

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
