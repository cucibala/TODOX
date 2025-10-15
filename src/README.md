# TodoX Vue 版本

这是 TodoX 应用的 Vue 3 重构版本，使用 Vite 作为构建工具。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Pinia** - Vue 状态管理库
- **Vite** - 新一代前端构建工具
- **Electron** - 跨平台桌面应用框架

## 项目结构

```
src/
├── index.html          # HTML 入口文件
├── package.json        # Vue 项目依赖配置
├── vite.config.js      # Vite 配置文件
└── src/
    ├── main.js         # Vue 应用入口
    ├── App.vue         # 根组件
    ├── assets/         # 静态资源
    │   └── styles/     # CSS 样式文件
    ├── components/     # Vue 组件
    │   ├── TitleBar.vue
    │   ├── Header.vue
    │   ├── Sidebar.vue
    │   ├── TaskContent.vue
    │   ├── TaskItem.vue
    │   ├── LockScreen.vue
    │   └── ...
    ├── stores/         # Pinia 状态管理
    │   ├── app.js      # 应用全局状态
    │   ├── project.js  # 项目管理状态
    │   └── todo.js     # 任务管理状态
    └── utils/          # 工具函数
        ├── date.js     # 日期处理
        └── progress.js # 进度计算
```

## 开发步骤

### 1. 安装 Vue 项目依赖

```bash
cd src
npm install
```

### 2. 开发模式

在 `src/` 目录下启动 Vite 开发服务器：

```bash
npm run dev
```

这会在 http://localhost:5173 启动开发服务器，可以实时预览和调试 Vue 组件。

### 3. 构建 Vue 应用

在 `src/` 目录下构建生产版本：

```bash
npm run build
```

构建产物会输出到 `dist-vue/` 目录（项目根目录下）。

### 4. 运行 Electron 应用

回到项目根目录，运行 Electron：

```bash
cd ..
npm run start
```

Electron 会自动检测 `dist-vue/index.html` 是否存在：
- 如果存在，使用 Vue 构建的版本
- 如果不存在，回退到原始的 HTML 版本

### 5. 打包完整应用

在项目根目录执行：

```bash
npm run build        # 构建 Vue + 打包 Electron (所有平台)
npm run build:win    # 仅 Windows
npm run build:mac    # 仅 macOS
npm run build:linux  # 仅 Linux
```

这会自动：
1. 构建 Vue 应用 (`npm run vue:build`)
2. 打包 Electron 应用 (`electron-builder`)

## 快速开始

### 完整的开发流程

```bash
# 1. 安装根目录依赖（Electron）
npm install

# 2. 安装 Vue 项目依赖
cd src
npm install

# 3. 开发 Vue 应用（可选，用于调试前端）
npm run dev

# 4. 构建 Vue 应用
npm run build

# 5. 回到根目录运行 Electron
cd ..
npm run start
```

### 一键打包

```bash
# 从根目录执行
npm run build:win
```

## 主要改进

### 1. 组件化开发
- 所有 UI 组件都被拆分为独立的 Vue 组件
- 组件之间通过 props 和 events 通信
- 更好的代码复用和维护性

### 2. 状态管理
- 使用 Pinia 进行集中式状态管理
- 清晰的数据流向
- 响应式数据更新

### 3. 构建优化
- Vite 提供极快的开发服务器启动速度
- HMR (热模块替换) 提升开发体验
- 生产构建优化和代码分割

### 4. 类型安全
- 使用 Vue 3 Composition API
- 更好的 IDE 支持和代码提示

## 组件说明

### 核心组件

- **TitleBar** - 自定义标题栏，包含窗口控制按钮
- **Header** - 显示任务统计信息
- **Sidebar** - 项目管理、筛选器和设置
- **TaskContent** - 任务列表和添加任务表单
- **TaskItem** - 单个任务项，包含子任务、进度等

### 对话框组件

- **LockScreen** - 锁定界面
- **SubtaskDialog** - 添加子任务对话框
- **ProjectDialog** - 创建项目对话框
- **PasswordDialog** - 密码设置对话框
- **DataPathDialog** - 数据路径设置对话框
- **ConfirmDialog** - 确认对话框

### 工具组件

- **Toast** - 消息提示
- **ImageViewer** - 图片查看器
- **ImagePreview** - 图片预览

## Electron 集成

Vue 应用通过 `preload.js` 暴露的 `window.electronAPI` 与 Electron 主进程通信：

```javascript
// 在 Vue 组件中使用
const electronAPI = window.electronAPI

// 加载数据
const todos = await electronAPI.loadTodos()

// 保存数据
await electronAPI.saveTodos(todos)

// 窗口控制
electronAPI.windowMinimize()
electronAPI.toggleCompactMode()
```

## 注意事项

1. **兼容性** - main.js 会自动检测 Vue 构建文件，如果不存在会回退到原始 HTML 版本
2. **数据迁移** - Vue 版本使用相同的数据格式，无需迁移
3. **开发调试** - 建议使用 `npm run vue:dev` 在浏览器中调试，然后再集成到 Electron
4. **打包前构建** - 记得先运行 `npm run vue:build` 再打包 Electron 应用

## 常见问题

### Q: Vue 开发服务器无法访问 electronAPI？
A: 这是正常的，因为 `window.electronAPI` 只在 Electron 环境中可用。可以添加 mock 数据用于开发调试。

### Q: 如何在浏览器中测试？
A: 在 `src/` 目录运行 `npm run dev`，但需要注意某些 Electron 特定功能无法在浏览器中使用。

### Q: 构建后应用无法启动？
A: 检查 `dist-vue/` 目录是否存在，以及文件路径配置是否正确。

## 下一步

- [ ] 添加 TypeScript 支持
- [ ] 添加单元测试
- [ ] 优化打包体积
- [ ] 添加更多主题

