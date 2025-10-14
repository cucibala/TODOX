# TodoX 打包指南

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 打包应用

#### Windows 打包（推荐在 Windows 系统上执行）
```bash
npm run build:win
```
**生成文件**：
- `dist/TodoX Setup 1.0.0.exe` - NSIS 安装程序（推荐）

**特性**：
- 支持自定义安装目录
- 自动创建桌面快捷方式
- 自动创建开始菜单项
- 支持卸载程序

#### macOS 打包（需要在 macOS 系统上执行）
```bash
npm run build:mac
```
**生成文件**：
- `dist/TodoX-1.0.0.dmg` - DMG 镜像文件

#### Linux 打包（推荐在 Linux 系统上执行）
```bash
npm run build:linux
```
**生成文件**：
- `dist/TodoX-1.0.0.AppImage` - AppImage 格式（通用）
- `dist/todox_1.0.0_amd64.deb` - Debian/Ubuntu 安装包

#### 自动打包（根据当前系统）
```bash
npm run build
```

## 高级配置

### 自定义应用图标（可选）

1. 创建 `assets` 目录：
```bash
mkdir assets
```

2. 准备图标文件：
   - **Windows**: `assets/icon.ico` (256x256 或更大)
   - **macOS**: `assets/icon.icns` (至少包含 512x512)
   - **Linux**: `assets/icon.png` (512x512 PNG)

3. 在线工具推荐：
   - [iConvert Icons](https://iconverticons.com/) - 将 PNG 转换为 ICO/ICNS
   - [CloudConvert](https://cloudconvert.com/) - 格式转换

### 修改版本号

编辑 `package.json`：
```json
{
  "version": "1.0.0"  // 修改此处
}
```

### 修改应用信息

编辑 `package.json` 的 `build` 部分：
```json
{
  "build": {
    "appId": "com.todox.app",      // 应用唯一标识
    "productName": "TodoX",         // 应用显示名称
    "copyright": "Copyright © 2025" // 版权信息
  }
}
```

## 打包配置说明

当前配置位于 `package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "com.todox.app",
    "productName": "TodoX",
    "directories": {
      "output": "dist"  // 输出目录
    },
    "files": [
      // 打包时包含的文件
      "main.js",
      "preload.js",
      "index.html",
      "styles.css",
      "app.js",
      "package.json"
    ],
    "win": {
      "target": "nsis",  // Windows 安装包格式
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",   // macOS 镜像格式
      "icon": "assets/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": ["AppImage", "deb"],  // Linux 打包格式
      "icon": "assets/icon.png",
      "category": "Utility"
    }
  }
}
```

## 常见问题

### Q: 打包很慢怎么办？
A: 首次打包会下载 Electron 二进制文件，后续打包会使用缓存。可以设置镜像加速：
```bash
# 设置 Electron 镜像（中国大陆用户）
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install
```

### Q: 能在 Windows 上打包 macOS 应用吗？
A: 技术上可行但不推荐。建议在对应平台上打包，或使用 CI/CD 服务（如 GitHub Actions）。

### Q: 打包后文件太大？
A: 这是正常的，Electron 应用会包含完整的 Chromium 和 Node.js 运行时。可以：
- 使用 `asar` 压缩（默认启用）
- 排除不必要的依赖
- 使用 UPX 压缩可执行文件（可选）

### Q: 如何添加代码签名？
A: 编辑 `package.json`：
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    },
    "mac": {
      "identity": "Developer ID Application: Your Name"
    }
  }
}
```

## 发布检查清单

- [ ] 更新版本号（`package.json`）
- [ ] 测试应用功能
- [ ] 准备应用图标（可选）
- [ ] 运行打包命令
- [ ] 测试安装包
- [ ] 准备发布说明
- [ ] 上传到发布平台（GitHub Releases、官网等）

## 参考资料

- [electron-builder 文档](https://www.electron.build/)
- [Electron 官方文档](https://www.electronjs.org/)

