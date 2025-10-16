const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 单实例锁定 - 只允许运行一个应用实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果已经有实例在运行，退出当前实例
  app.quit();
} else {
  // 当尝试打开第二个实例时，聚焦到第一个实例的窗口
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 全局设置文件路径（固定在 userData 目录）
const globalSettingsPath = path.join(app.getPath('userData'), 'settings.json');

// 当前数据存储路径（可自定义）
let currentDataPath = app.getPath('userData');

// 动态获取数据文件路径
function getDataPath() {
  return path.join(currentDataPath, 'todos.json');
}

function getProjectsPath() {
  return path.join(currentDataPath, 'projects.json');
}

function getImagesPath() {
  return path.join(currentDataPath, 'images');
}

function getSettingsPath() {
  return globalSettingsPath; // 全局设置始终在 userData
}

// 初始化数据目录
function initDataDirectory(dataDir) {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 确保图片目录存在
    const imgPath = path.join(dataDir, 'images');
    if (!fs.existsSync(imgPath)) {
      fs.mkdirSync(imgPath, { recursive: true });
    }
    
    return true;
  } catch (error) {
    console.error('初始化数据目录失败:', error);
    return false;
  }
}

let mainWindow;
let tray = null;
let isCompactMode = false;
let isAlwaysOnTop = true;
let isDesktopMode = false; // 桌面模式

// 简单的密码加密（Base64 + 混淆）
function encryptPassword(password) {
  const salt = 'TodoX-Secret-Key-2025';
  const mixed = password.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
  ).join('');
  return Buffer.from(mixed).toString('base64');
}

// 密码解密
function decryptPassword(encrypted) {
  try {
    const salt = 'TodoX-Secret-Key-2025';
    const mixed = Buffer.from(encrypted, 'base64').toString();
    return mixed.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
  } catch (error) {
    return null;
  }
}

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(globalSettingsPath)) {
      const data = fs.readFileSync(globalSettingsPath, 'utf-8');
      const settings = JSON.parse(data);
      isCompactMode = settings.compactMode || false;
      isAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
      isDesktopMode = settings.desktopMode || false;
      
      // 加载自定义数据路径
      if (settings.customDataPath) {
        currentDataPath = settings.customDataPath;
      }
      
      // 初始化数据目录
      initDataDirectory(currentDataPath);
    } else {
      // 首次运行，初始化默认数据目录
      initDataDirectory(currentDataPath);
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    initDataDirectory(currentDataPath);
  }
}

// 保存设置
function saveSettings() {
  try {
    const settings = {
      compactMode: isCompactMode,
      alwaysOnTop: isAlwaysOnTop,
      desktopMode: isDesktopMode,
      customDataPath: currentDataPath !== app.getPath('userData') ? currentDataPath : undefined
    };
    fs.writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

function createWindow() {
  loadSettings();

  // 设置窗口图标
  const iconPath = path.join(__dirname, 'assets', 'X.png');
  let windowIcon;
  if (fs.existsSync(iconPath)) {
    windowIcon = nativeImage.createFromPath(iconPath);
  }

  mainWindow = new BrowserWindow({
    width: isCompactMode ? 350 : 1400,
    height: isCompactMode ? 500 : 880,
    minWidth: 350,
    minHeight: 400,
    maxWidth: isCompactMode ? 350 : undefined,
    icon: windowIcon, // 设置窗口图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: isDesktopMode ? 'rgba(0, 0, 0, 0)' : '#f5f7fa',
    show: false,
    frame: false, // 无边框
    transparent: isDesktopMode, // 桌面模式时启用透明
    alwaysOnTop: isDesktopMode ? false : isAlwaysOnTop, // 桌面模式时不置顶
    skipTaskbar: isDesktopMode, // 桌面模式时不显示在任务栏
    resizable: !isCompactMode
  });

  // 开发模式：加载 Vite 开发服务器
  // 生产模式：加载 Vue 构建的文件
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  if (isDev) {
    // 开发模式：使用 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // 生产模式：使用构建好的文件
    const vueDistPath = path.join(__dirname, 'dist-vue', 'index.html');
    mainWindow.loadFile(vueDistPath);
  }

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 如果是桌面模式，设置为最底层
    if (isDesktopMode) {
      setDesktopLevel();
    }
    
    // 发送初始状态
    mainWindow.webContents.send('mode-changed', isCompactMode);
    mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
    mainWindow.webContents.send('desktop-mode-changed', isDesktopMode);
  });


  
  // // 开发模式下，监听页面加载失败（Vite 服务器可能未启动）
  // if (isDev) {
  //   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  //     console.error('页面加载失败:', errorDescription);
  //     console.log('请确保 Vite 开发服务器已启动：cd src && npm run dev');
  //   });
  // }

  // 窗口关闭时最小化到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // 监听窗口移动，智能切换模式
  let moveTimeout = null;
  mainWindow.on('moved', () => {
    // 防抖处理，避免频繁触发
    if (moveTimeout) clearTimeout(moveTimeout);
    
    moveTimeout = setTimeout(() => {
      checkWindowPosition();
    }, 300);
  });
}

// 检查窗口位置并自动切换模式
function checkWindowPosition() {
  if (!mainWindow) return;

  const { screen } = require('electron');
  const windowBounds = mainWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: windowBounds.x, y: windowBounds.y });
  const { workArea } = display;

  // 定义右上角区域：屏幕右侧 30% 且顶部 30% 的区域
  const rightEdge = workArea.x + workArea.width;
  const topEdge = workArea.y;
  const rightThreshold = workArea.x + workArea.width * 0.7; // 右侧30%区域
  const topThreshold = workArea.y + workArea.height * 0.3; // 顶部30%区域

  const windowCenterX = windowBounds.x + windowBounds.width / 2;
  const windowCenterY = windowBounds.y + windowBounds.height / 2;

  // 检查窗口是否在右上角区域
  const isInTopRight = windowCenterX >= rightThreshold && windowCenterY <= topThreshold;

  if (isInTopRight && !isCompactMode) {
    // 自动切换到迷你模式和置顶
    console.log('窗口移动到右上角，自动切换到迷你模式');
    
    if (!isCompactMode) {
      toggleCompactMode();
    }
    
    if (!isAlwaysOnTop) {
      isAlwaysOnTop = true;
      mainWindow.setAlwaysOnTop(isAlwaysOnTop);
      mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
      saveSettings();
      updateTrayMenu(); // 只更新托盘菜单，不重新创建托盘
    }
  }
}

// 创建系统托盘
function createTray() {
  // 如果托盘已存在，先销毁
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // 创建托盘图标 - 使用 X.png
  const iconPath = path.join(__dirname, 'assets', 'X.png');
  let trayIcon;
  
  // 如果图标文件不存在，创建一个简单的图标
  if (!fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createEmpty();
  } else {
    trayIcon = nativeImage.createFromPath(iconPath);
    // 调整托盘图标大小（通常托盘图标应该是 16x16 或 32x32）
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);
  
  updateTrayMenu();
  
  tray.setToolTip('TodoX - 任务清单');
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// 更新托盘菜单（不重新创建托盘）
function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: isDesktopMode ? '退出桌面模式' : '桌面背景模式',
      click: () => {
        toggleDesktopMode();
      }
    },
    {
      label: isAlwaysOnTop ? '取消置顶' : '窗口置顶',
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
        saveSettings();
        updateTrayMenu(); // 只更新菜单，不重新创建托盘
      },
      enabled: !isDesktopMode // 桌面模式下禁用
    },
    {
      label: isCompactMode ? '完整模式' : '迷你模式',
      click: () => {
        toggleCompactMode();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

// 切换迷你模式
function toggleCompactMode() {
  isCompactMode = !isCompactMode;
  
  if (isCompactMode) {
    mainWindow.setSize(350, 500);
    mainWindow.setResizable(false);
    mainWindow.setMaximumSize(350, 2000);
  } else {
    mainWindow.setSize(1000, 700);
    mainWindow.setResizable(true);
    mainWindow.setMaximumSize(0, 0);
  }
  
  mainWindow.webContents.send('mode-changed', isCompactMode);
  saveSettings();
  updateTrayMenu(); // 只更新托盘菜单，不重新创建托盘
}

// 设置桌面层级
function setDesktopLevel() {
  if (process.platform === 'win32') {
    // Windows 上设置为最底层
    mainWindow.setAlwaysOnTop(false, 'normal', -1);
  } else if (process.platform === 'darwin') {
    // macOS 上设置为桌面层级
    mainWindow.setAlwaysOnTop(false);
    app.dock.hide();
  } else {
    // Linux 上设置为桌面层级
    mainWindow.setAlwaysOnTop(false);
  }
}

// 切换桌面模式
function toggleDesktopMode() {
  isDesktopMode = !isDesktopMode;
  
  if (isDesktopMode) {
    // 进入桌面模式
    // 先关闭窗口，重新创建以应用透明背景
    const bounds = mainWindow.getBounds();
    mainWindow.close();
    
    setTimeout(() => {
      createWindow();
      mainWindow.setBounds(bounds);
    }, 100);
  } else {
    // 退出桌面模式
    const bounds = mainWindow.getBounds();
    mainWindow.close();
    
    setTimeout(() => {
      createWindow();
      mainWindow.setBounds(bounds);
    }, 100);
  }
  
  saveSettings();
  updateTrayMenu();
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 窗口控制 IPC
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.hide();
});

ipcMain.on('toggle-compact-mode', () => {
  toggleCompactMode();
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
  saveSettings();
  updateTrayMenu(); // 只更新托盘菜单，不重新创建托盘
});

// 手动触发位置检查（用于测试）
ipcMain.on('check-window-position', () => {
  checkWindowPosition();
});

// 切换桌面模式
ipcMain.on('toggle-desktop-mode', () => {
  toggleDesktopMode();
});

// IPC 通信处理 - 读取项目数据
ipcMain.handle('load-projects', async () => {
  try {
    const projectsPath = getProjectsPath();
    if (fs.existsSync(projectsPath)) {
      const data = fs.readFileSync(projectsPath, 'utf-8');
      return JSON.parse(data);
    }
    return { projects: [], currentProjectId: null };
  } catch (error) {
    console.error('读取项目数据失败:', error);
    return { projects: [], currentProjectId: null };
  }
});

// IPC 通信处理 - 保存项目数据
ipcMain.handle('save-projects', async (event, projectData) => {
  try {
    const projectsPath = getProjectsPath();
    fs.writeFileSync(projectsPath, JSON.stringify(projectData, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('保存项目数据失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 读取任务数据
ipcMain.handle('load-todos', async () => {
  try {
    const dataPath = getDataPath();
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('读取任务数据失败:', error);
    return [];
  }
});

// IPC 通信处理 - 保存任务数据
ipcMain.handle('save-todos', async (event, todos) => {
  try {
    const dataPath = getDataPath();
    fs.writeFileSync(dataPath, JSON.stringify(todos, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('保存任务数据失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 选择图片文件
ipcMain.handle('select-image', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath);
    const fileName = `${Date.now()}${ext}`;
    const imagesPath = getImagesPath();
    const destPath = path.join(imagesPath, fileName);

    // 复制图片到应用数据目录
    fs.copyFileSync(sourcePath, destPath);

    return { 
      success: true, 
      imagePath: destPath,
      fileName: fileName
    };
  } catch (error) {
    console.error('选择图片失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 读取图片文件
ipcMain.handle('read-image', async (event, fileName) => {
  try {
    const imagesPath = getImagesPath();
    const imagePath = path.join(imagesPath, fileName);
    if (!fs.existsSync(imagePath)) {
      return { success: false, error: '图片不存在' };
    }

    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const ext = path.extname(fileName).slice(1);
    
    return { 
      success: true, 
      data: `data:image/${ext};base64,${base64}`
    };
  } catch (error) {
    console.error('读取图片失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除图片文件
ipcMain.handle('delete-image', async (event, fileName) => {
  try {
    if (!fileName) return { success: true };
    
    const imagesPath = getImagesPath();
    const imagePath = path.join(imagesPath, fileName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    return { success: true };
  } catch (error) {
    console.error('删除图片失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 设置密码
ipcMain.handle('set-password', async (event, password) => {
  try {
    if (!password) {
      return { success: false, error: '密码不能为空' };
    }
    const encrypted = encryptPassword(password);
    const settingsPath = getSettingsPath();
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8') || '{}');
    settings.password = encrypted;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('设置密码失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 验证密码
ipcMain.handle('verify-password', async (event, password) => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: false, hasPassword: false };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!settings.password) {
      return { success: false, hasPassword: false };
    }
    const decrypted = decryptPassword(settings.password);
    const isValid = decrypted === password;
    return { success: isValid, hasPassword: true };
  } catch (error) {
    console.error('验证密码失败:', error);
    return { success: false, hasPassword: true, error: error.message };
  }
});

// IPC 通信处理 - 检查是否设置了密码
ipcMain.handle('has-password', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { hasPassword: false };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return { hasPassword: !!settings.password };
  } catch (error) {
    console.error('检查密码失败:', error);
    return { hasPassword: false };
  }
});

// IPC 通信处理 - 修改密码
ipcMain.handle('change-password', async (event, oldPassword, newPassword) => {
  try {
    // 先验证旧密码
    const verifyResult = await ipcMain.invoke('verify-password', oldPassword);
    if (!verifyResult.success) {
      return { success: false, error: '旧密码不正确' };
    }
    // 设置新密码
    const encrypted = encryptPassword(newPassword);
    const settingsPath = getSettingsPath();
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    settings.password = encrypted;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('修改密码失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 清除密码
ipcMain.handle('clear-password', async (event, password) => {
  try {
    // 先验证密码
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: false, error: '未设置密码' };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!settings.password) {
      return { success: false, error: '未设置密码' };
    }
    const decrypted = decryptPassword(settings.password);
    if (decrypted !== password) {
      return { success: false, error: '密码不正确' };
    }
    // 清除密码
    delete settings.password;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('清除密码失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 获取当前数据路径
ipcMain.handle('get-data-path', async () => {
  try {
    return {
      success: true,
      path: currentDataPath,
      isDefault: currentDataPath === app.getPath('userData')
    };
  } catch (error) {
    console.error('获取数据路径失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 选择新的数据路径
ipcMain.handle('select-data-path', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择数据存储路径',
      buttonLabel: '选择文件夹'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return {
      success: true,
      path: result.filePaths[0]
    };
  } catch (error) {
    console.error('选择数据路径失败:', error);
    return { success: false, error: error.message };
  }
});

// 复制文件夹内容
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// IPC 通信处理 - 更改数据路径（包含数据迁移）
ipcMain.handle('change-data-path', async (event, newPath) => {
  try {
    // 验证新路径
    if (!newPath || newPath === currentDataPath) {
      return { success: false, error: '路径无效或与当前路径相同' };
    }

    // 确保新路径存在
    if (!fs.existsSync(newPath)) {
      return { success: false, error: '路径不存在' };
    }

    const oldPath = currentDataPath;
    const oldTodosPath = getDataPath();
    const oldProjectsPath = getProjectsPath();
    const oldImagesPath = getImagesPath();

    // 创建新的数据目录结构
    const newTodosPath = path.join(newPath, 'todos.json');
    const newProjectsPath = path.join(newPath, 'projects.json');
    const newImagesPath = path.join(newPath, 'images');

    // 初始化新数据目录
    if (!initDataDirectory(newPath)) {
      return { success: false, error: '初始化新数据目录失败' };
    }

    // 迁移数据文件
    let migratedFiles = [];
    
    // 复制 todos.json
    if (fs.existsSync(oldTodosPath)) {
      fs.copyFileSync(oldTodosPath, newTodosPath);
      migratedFiles.push('todos.json');
    }

    // 复制 projects.json
    if (fs.existsSync(oldProjectsPath)) {
      fs.copyFileSync(oldProjectsPath, newProjectsPath);
      migratedFiles.push('projects.json');
    }

    // 复制 images 文件夹
    if (fs.existsSync(oldImagesPath)) {
      copyFolderSync(oldImagesPath, newImagesPath);
      const imageFiles = fs.readdirSync(oldImagesPath);
      migratedFiles.push(`images (${imageFiles.length} 个文件)`);
    }

    // 更新当前数据路径
    currentDataPath = newPath;

    // 保存新路径到设置
    saveSettings();

    return {
      success: true,
      oldPath,
      newPath,
      migratedFiles
    };
  } catch (error) {
    console.error('更改数据路径失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 重置数据路径为默认
ipcMain.handle('reset-data-path', async () => {
  try {
    const defaultPath = app.getPath('userData');
    
    if (currentDataPath === defaultPath) {
      return { success: false, error: '当前已是默认路径' };
    }

    currentDataPath = defaultPath;
    initDataDirectory(currentDataPath);
    saveSettings();

    return {
      success: true,
      path: currentDataPath
    };
  } catch (error) {
    console.error('重置数据路径失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 获取开机自启状态
ipcMain.handle('get-auto-launch', async () => {
  try {
    const enabled = app.getLoginItemSettings().openAtLogin;
    return {
      success: true,
      enabled
    };
  } catch (error) {
    console.error('获取开机自启状态失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 设置开机自启
ipcMain.handle('set-auto-launch', async (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false // 启动时不隐藏窗口
    });
    
    return { success: true };
  } catch (error) {
    console.error('设置开机自启失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 获取应用版本
ipcMain.handle('get-app-version', async () => {
  try {
    return {
      success: true,
      version: app.getVersion()
    };
  } catch (error) {
    console.error('获取应用版本失败:', error);
    return { success: false, error: error.message };
  }
});

