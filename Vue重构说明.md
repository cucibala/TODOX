# TodoX Vue 3 重构说明

## 概述

已成功将 TodoX 应用的前端部分重构为 Vue 3 + Vite 架构，保留了所有原有功能，并提升了代码的可维护性和开发体验。

## 项目结构

```
TodoX/
├── main.js                 # Electron 主进程（已更新以支持 Vue）
├── preload.js              # Electron 预加载脚本（保持不变）
├── package.json            # 根项目配置（已更新构建脚本）
├── index.html              # 原始 HTML 版本（作为后备）
├── app.js                  # 原始 JS 版本（作为后备）
├── styles.css              # 原始 CSS 版本（作为后备）
│
└── src/                    # Vue 项目目录
    ├── package.json        # Vue 项目依赖
    ├── vite.config.js      # Vite 配置
    ├── index.html          # Vue HTML 入口
    │
    └── src/
        ├── main.js         # Vue 入口文件
        ├── App.vue         # 根组件
        │
        ├── assets/
        │   └── styles/     # 样式文件（已模块化）
        │       ├── index.css
        │       ├── variables.css
        │       ├── base.css
        │       ├── titlebar.css
        │       ├── header.css
        │       ├── sidebar.css
        │       ├── tasks.css
        │       ├── dialogs.css
        │       └── components.css
        │
        ├── components/     # Vue 组件
        │   ├── TitleBar.vue         # 标题栏
        │   ├── Header.vue           # 头部统计
        │   ├── Sidebar.vue          # 侧边栏
        │   ├── TaskContent.vue      # 任务内容区
        │   ├── TaskItem.vue         # 任务项
        │   ├── ImagePreview.vue     # 图片预览
        │   ├── LockScreen.vue       # 锁定界面
        │   ├── SubtaskDialog.vue    # 子任务对话框
        │   ├── DataPathDialog.vue   # 数据路径对话框
        │   ├── ProjectDialog.vue    # 项目对话框
        │   ├── PasswordDialog.vue   # 密码对话框
        │   ├── ConfirmDialog.vue    # 确认对话框
        │   ├── Toast.vue            # 提示消息
        │   └── ImageViewer.vue      # 图片查看器
        │
        ├── stores/         # Pinia 状态管理
        │   ├── app.js      # 应用全局状态
        │   ├── project.js  # 项目管理
        │   └── todo.js     # 任务管理
        │
        └── utils/          # 工具函数
            ├── date.js     # 日期格式化
            └── progress.js # 进度计算
```

## 快速开始

### 方式一：直接运行（使用 Vue 版本）

```bash
# 1. 安装根目录依赖
npm install

# 2. 进入 src 目录，安装 Vue 依赖
cd src
npm install

# 3. 构建 Vue 应用
npm run build

# 4. 返回根目录，运行 Electron
cd ..
npm start
```

### 方式二：开发模式（推荐）

```bash
# 1. 开发 Vue 应用（在 src 目录）
cd src
npm run dev
# 浏览器访问 http://localhost:5173 预览

# 2. 在另一个终端，构建并运行 Electron
npm run build
cd ..
npm start
```

### 方式三：打包发布

```bash
# 在根目录执行（会自动构建 Vue）
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

## 核心功能对照

所有原有功能都已在 Vue 版本中实现：

### ✅ 已实现功能

- [x] 自定义标题栏
- [x] 窗口控制（最小化、关闭、置顶、迷你模式、桌面模式）
- [x] 项目管理（创建、删除、切换）
- [x] 任务管理（添加、编辑、删除、完成、置顶）
- [x] 子任务系统（带权重计算）
- [x] 进度记录
- [x] 多图片附件
- [x] 筛选和搜索
- [x] 优先级管理
- [x] 截止日期
- [x] 密码锁定
- [x] 数据路径设置
- [x] 系统托盘
- [x] 数据持久化

## 技术亮点

### 1. 组件化架构
- 将 2000+ 行的单文件拆分为 14 个独立组件
- 每个组件职责单一，易于维护和测试
- 组件可复用性高

### 2. 状态管理
- 使用 Pinia 进行集中式状态管理
- 3 个 Store 分别管理应用、项目、任务状态
- 响应式数据流，自动更新 UI

### 3. 现代化开发体验
- Vite 提供极快的开发服务器
- HMR 热模块替换，无需刷新页面
- Vue 3 Composition API，更好的 TypeScript 支持

### 4. 样式模块化
- CSS 按功能模块拆分
- 使用 CSS 变量统一主题
- 支持迷你模式和桌面模式样式切换

### 5. 兼容性设计
- main.js 自动检测 Vue 构建文件
- 如果 Vue 构建失败，自动回退到原始版本
- 数据格式完全兼容

## 开发指南

### 添加新功能

1. **创建新组件**
```bash
cd src/src/components
# 创建 YourComponent.vue
```

2. **添加到 App.vue**
```vue
<script setup>
import YourComponent from './components/YourComponent.vue'
</script>

<template>
  <YourComponent />
</template>
```

3. **如需状态管理**
- 在对应的 store 文件中添加状态和方法
- 或创建新的 store 文件

### 调试技巧

1. **浏览器调试**
```bash
cd src
npm run dev
# 在浏览器中打开开发者工具调试
```

2. **Electron 调试**
```bash
npm run start
# 在 Electron 窗口中按 F12 打开开发者工具
```

3. **查看 Pinia 状态**
- 安装 Vue DevTools 浏览器扩展
- 可以实时查看和修改 store 状态

## 性能优化

### 已实现的优化

1. **图片懒加载** - 只在需要时加载图片
2. **图片缓存** - 避免重复加载相同图片
3. **按需渲染** - 只渲染可见的任务
4. **事件防抖** - 搜索输入使用防抖
5. **代码分割** - Vite 自动进行代码分割

## 常见问题

### Q1: 如何切换回原始版本？

A: 删除或重命名 `dist-vue` 文件夹，Electron 会自动使用原始的 index.html。

### Q2: Vue 版本的数据存储在哪里？

A: 与原始版本完全相同，存储在 Electron 的 userData 目录，或用户自定义的路径。

### Q3: 如何在 Vue 中访问 Electron API？

A: 通过 `window.electronAPI` 访问，例如：
```javascript
const electronAPI = window.electronAPI
const todos = await electronAPI.loadTodos()
```

### Q4: 构建失败怎么办？

A: 
1. 检查 Node.js 版本 (推荐 16+)
2. 删除 `node_modules` 和 `package-lock.json` 重新安装
3. 确保在正确的目录执行命令

### Q5: 如何自定义样式？

A: 修改 `src/src/assets/styles/variables.css` 中的 CSS 变量，或直接修改对应的样式文件。

## 升级路径

### 从原始版本升级到 Vue 版本

1. **备份数据**
```bash
# 备份 userData 目录中的 todos.json 和 projects.json
```

2. **安装依赖**
```bash
npm install
cd src
npm install
```

3. **构建运行**
```bash
npm run build
cd ..
npm start
```

## 下一步计划

- [ ] 添加 TypeScript 支持
- [ ] 添加单元测试和 E2E 测试
- [ ] 优化打包体积
- [ ] 支持自定义主题
- [ ] 添加更多快捷键
- [ ] 支持导入导出功能
- [ ] 添加数据同步功能

## 技术支持

如有问题，请查看：
- `src/README.md` - 详细的技术文档
- `build-guide.md` - 原始构建指南
- `更新日志.md` - 版本更新记录

## 总结

Vue 3 重构带来了：
- ✨ 更好的代码组织和可维护性
- ⚡ 更快的开发速度和构建性能
- 🎯 更清晰的数据流和状态管理
- 🔧 更好的开发者体验
- 🚀 为未来的功能扩展打下良好基础

同时保持了：
- ✅ 100% 功能兼容
- ✅ 数据格式兼容
- ✅ 用户体验一致
- ✅ 性能表现稳定

