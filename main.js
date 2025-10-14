const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 数据文件路径
const dataPath = path.join(app.getPath('userData'), 'todos.json');
const imagesPath = path.join(app.getPath('userData'), 'images');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 确保图片目录存在
if (!fs.existsSync(imagesPath)) {
  fs.mkdirSync(imagesPath, { recursive: true });
}

let mainWindow;
let tray = null;
let isCompactMode = false;
let isAlwaysOnTop = true;

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      isCompactMode = settings.compactMode || false;
      isAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 保存设置
function saveSettings() {
  try {
    const settings = {
      compactMode: isCompactMode,
      alwaysOnTop: isAlwaysOnTop
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

function createWindow() {
  loadSettings();

  mainWindow = new BrowserWindow({
    width: isCompactMode ? 350 : 1000,
    height: isCompactMode ? 500 : 700,
    minWidth: 350,
    minHeight: 400,
    maxWidth: isCompactMode ? 350 : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f5f7fa',
    show: false,
    frame: false, // 无边框
    transparent: false,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: false,
    resizable: !isCompactMode
  });

  mainWindow.loadFile('index.html');

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 发送初始状态
    mainWindow.webContents.send('mode-changed', isCompactMode);
    mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时最小化到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// 创建系统托盘
function createTray() {
  // 创建托盘图标
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  // 如果图标文件不存在，创建一个简单的图标
  if (!fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createEmpty();
  } else {
    trayIcon = nativeImage.createFromPath(iconPath);
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: isAlwaysOnTop ? '取消置顶' : '窗口置顶',
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
        saveSettings();
        createTray(); // 重新创建托盘菜单
      }
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
  
  tray.setToolTip('TodoX - 任务清单');
  tray.setContextMenu(contextMenu);
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow.show();
  });
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
  createTray(); // 更新托盘菜单
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
  createTray();
});

// IPC 通信处理 - 读取任务数据
ipcMain.handle('load-todos', async () => {
  try {
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

