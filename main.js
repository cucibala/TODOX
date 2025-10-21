const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const TodoXDatabase = require('./database');

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

// 数据库实例
let db = null;

// 动态获取数据文件路径（用于数据迁移和向后兼容）
function getDataPath() {
  return path.join(currentDataPath, 'todos.json');
}

function getProjectsPath() {
  return path.join(currentDataPath, 'projects.json');
}

function getChatHistoryPath() {
  return path.join(currentDataPath, 'chat-history.json');
}

function getConversationsPath() {
  return path.join(currentDataPath, 'conversations.json');
}

function getImagesPath() {
  return path.join(currentDataPath, 'images');
}

function getSettingsPath() {
  return globalSettingsPath; // 全局设置始终在 userData
}

function getDatabasePath() {
  return path.join(currentDataPath, 'todox.db');
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

// 初始化数据库
function initDatabase() {
  try {
    const dbPath = getDatabasePath();
    console.log('Default database path:', dbPath);
    db = new TodoXDatabase(dbPath);
    const success = db.init();
    
    if (success) {
      // 检查是否需要从 JSON 迁移数据
      migrateFromJSONIfNeeded();
    }
    
    return success;
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return false;
  }
}

// 从 JSON 迁移数据（如果需要）
function migrateFromJSONIfNeeded() {
  try {
    const todosPath = getDataPath();
    const projectsPath = getProjectsPath();
    const conversationsPath = getConversationsPath();
    
    // 检查是否有旧的 JSON 文件
    const hasOldData = fs.existsSync(todosPath) || 
                       fs.existsSync(projectsPath) || 
                       fs.existsSync(conversationsPath);
    
    if (!hasOldData) {
      console.log('未发现旧数据文件，跳过迁移');
      return;
    }
    
    // 检查数据库是否已有数据
    const todos = db.getTodos();
    const projects = db.getProjects();
    
    if (todos.length > 0 || projects.length > 0) {
      console.log('数据库已有数据，跳过迁移');
      return;
    }
    
    console.log('发现旧数据文件，开始迁移...');
    const jsonData = {};
    
    // 读取项目数据
    if (fs.existsSync(projectsPath)) {
      try {
        const projectData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
        jsonData.projects = projectData.projects || [];
        jsonData.currentProjectId = projectData.currentProjectId;
        console.log(`读取到 ${jsonData.projects.length} 个项目`);
      } catch (error) {
        console.error('读取项目 JSON 失败:', error);
      }
    }
    
    // 读取任务数据
    if (fs.existsSync(todosPath)) {
      try {
        jsonData.todos = JSON.parse(fs.readFileSync(todosPath, 'utf-8'));
        console.log(`读取到 ${jsonData.todos.length} 个任务`);
      } catch (error) {
        console.error('读取任务 JSON 失败:', error);
      }
    }
    
    // 读取会话数据
    if (fs.existsSync(conversationsPath)) {
      try {
        jsonData.conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf-8'));
        const convCount = jsonData.conversations.conversations ? jsonData.conversations.conversations.length : 0;
        console.log(`读取到 ${convCount} 个会话`);
      } catch (error) {
        console.error('读取会话 JSON 失败:', error);
      }
    }
    
    // 执行迁移
    if (Object.keys(jsonData).length > 0) {
      const result = db.migrateFromJSON(jsonData);
      
      if (result.success) {
        console.log('数据迁移成功:', result.migratedCount);
        
        // 清理孤立任务（project_id 为空的任务）
        const cleanedCount = db.cleanOrphanedTasks();
        if (cleanedCount > 0) {
          console.log(`清理了 ${cleanedCount} 个孤立任务`);
        }
        
        // 创建备份目录
        const backupDir = path.join(currentDataPath, 'json-backup');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // 移动（而不是复制）旧文件到备份目录
        const movedFiles = [];
        if (fs.existsSync(todosPath)) {
          fs.renameSync(todosPath, path.join(backupDir, 'todos.json'));
          movedFiles.push('todos.json');
        }
        if (fs.existsSync(projectsPath)) {
          fs.renameSync(projectsPath, path.join(backupDir, 'projects.json'));
          movedFiles.push('projects.json');
        }
        if (fs.existsSync(conversationsPath)) {
          fs.renameSync(conversationsPath, path.join(backupDir, 'conversations.json'));
          movedFiles.push('conversations.json');
        }
        
        // 移动旧的chat-history.json（如果存在）
        const chatHistoryPath = getChatHistoryPath();
        if (fs.existsSync(chatHistoryPath)) {
          fs.renameSync(chatHistoryPath, path.join(backupDir, 'chat-history.json'));
          movedFiles.push('chat-history.json');
        }
        
        console.log(`旧数据文件已移动到备份目录: ${movedFiles.join(', ')}`);
      } else {
        console.error('数据迁移失败:', result.error);
      }
    }
  } catch (error) {
    console.error('数据迁移检查失败:', error);
  }
}

let mainWindow;
let tray = null;
let isAlwaysOnTop = false;

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
      isAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
      
      // 加载自定义数据路径
      if (settings.customDataPath) {
        currentDataPath = settings.customDataPath;
      }
      
      // 初始化数据目录
      initDataDirectory(currentDataPath);
    } else {
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
    // 先读取现有设置，避免覆盖其他配置（如 API 密钥）
    let existingSettings = {};
    if (fs.existsSync(globalSettingsPath)) {
      try {
        existingSettings = JSON.parse(fs.readFileSync(globalSettingsPath, 'utf-8'));
      } catch (error) {
        console.error('读取现有设置失败，将创建新设置:', error);
      }
    }
    
    // 只更新窗口相关的设置，保留其他字段
    const settings = {
      ...existingSettings, // 保留现有的所有设置
      alwaysOnTop: isAlwaysOnTop,
      customDataPath: currentDataPath !== app.getPath('userData') ? currentDataPath : undefined
    };
    fs.writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

function createWindow() {
  // 注意：loadSettings() 已在 app.whenReady() 时调用
  // 这里不再重复调用，以避免重复初始化

  // 设置窗口图标
  const iconPath = path.join(__dirname, 'assets', 'X.png');
  let windowIcon;
  if (fs.existsSync(iconPath)) {
    windowIcon = nativeImage.createFromPath(iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 800,
    minHeight: 600,
    icon: windowIcon, // 设置窗口图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f7fafc',
    show: false,
    frame: false, // 无边框
    transparent: false,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: false,
    resizable: true
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

  // 窗口加载完成后显示（添加短暂延迟，等待初始数据加载）
  mainWindow.once('ready-to-show', () => {
    // 延迟显示窗口，给 Vue 应用更多时间初始化
    setTimeout(() => {
      mainWindow.show();
      
      // 发送初始状态
      mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
    }, 100); // 100ms 延迟，减少闪烁
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
}


// 创建系统托盘
function createTray() {
  // 如果托盘已存在，先销毁
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // 创建托盘图标 - 使用 X.png
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
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
      label: isAlwaysOnTop ? '取消置顶' : '窗口置顶',
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
        saveSettings();
        updateTrayMenu(); // 只更新菜单，不重新创建托盘
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

// 应用准备就绪
app.whenReady().then(() => {
  // 先加载设置（包括自定义数据路径）
  loadSettings();
  
  // 然后初始化数据库（使用正确的数据路径）
  initDatabase();
  
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

// 应用退出前清理
app.on('before-quit', () => {
  if (db) {
    db.close();
    console.log('数据库已关闭');
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

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
  saveSettings();
  updateTrayMenu(); // 只更新托盘菜单，不重新创建托盘
});

// IPC 通信处理 - 读取项目数据
ipcMain.handle('load-projects', async () => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    const projects = db.getProjects();
    const currentProjectId = db.getCurrentProjectId();
    return { projects, currentProjectId };
  } catch (error) {
    console.error('读取项目数据失败:', error);
    return { projects: [], currentProjectId: null };
  }
});

// IPC 通信处理 - 保存项目数据（批量，仅用于兼容）
ipcMain.handle('save-projects', async (event, projectData) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.saveProjects(projectData.projects || []);
    if (projectData.currentProjectId !== undefined) {
      db.setCurrentProjectId(projectData.currentProjectId);
    }
    return { success: true };
  } catch (error) {
    console.error('保存项目数据失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加单个项目
ipcMain.handle('add-project', async (event, project) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addProject(project);
    return { success: true };
  } catch (error) {
    console.error('添加项目失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新单个项目
ipcMain.handle('update-project', async (event, projectId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateProject(projectId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新项目失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除单个项目
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteProject(projectId);
    return { success: true };
  } catch (error) {
    console.error('删除项目失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 设置当前项目ID
ipcMain.handle('set-current-project', async (event, projectId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.setCurrentProjectId(projectId);
    return { success: true };
  } catch (error) {
    console.error('设置当前项目失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 读取任务数据
ipcMain.handle('load-todos', async () => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    return db.getTodos();
  } catch (error) {
    console.error('读取任务数据失败:', error);
    return [];
  }
});

// IPC 通信处理 - 保存任务数据（批量，仅用于兼容）
ipcMain.handle('save-todos', async (event, todos) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.saveTodos(todos);
    return { success: true };
  } catch (error) {
    console.error('保存任务数据失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加单个任务
ipcMain.handle('add-todo', async (event, todo) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addTodo(todo);
    return { success: true };
  } catch (error) {
    console.error('添加任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新单个任务
ipcMain.handle('update-todo', async (event, todoId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateTodo(todoId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除单个任务
ipcMain.handle('delete-todo', async (event, todoId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteTodo(todoId);
    return { success: true };
  } catch (error) {
    console.error('删除任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加子任务
ipcMain.handle('add-subtask', async (event, todoId, subtask) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addSubtask(todoId, subtask);
    return { success: true };
  } catch (error) {
    console.error('添加子任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新子任务
ipcMain.handle('update-subtask', async (event, subtaskId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateSubtask(subtaskId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新子任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除子任务
ipcMain.handle('delete-subtask', async (event, subtaskId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteSubtask(subtaskId);
    return { success: true };
  } catch (error) {
    console.error('删除子任务失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加进度记录
ipcMain.handle('add-progress', async (event, todoId, record) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addProgressRecord(todoId, record);
    return { success: true };
  } catch (error) {
    console.error('添加进度记录失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新进度记录
ipcMain.handle('update-progress', async (event, recordId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateProgressRecord(recordId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新进度记录失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除进度记录
ipcMain.handle('delete-progress', async (event, recordId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteProgressRecord(recordId);
    return { success: true };
  } catch (error) {
    console.error('删除进度记录失败:', error);
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

// IPC 通信处理 - 保存粘贴的图片（base64）
ipcMain.handle('save-image-from-clipboard', async (event, base64Data) => {
  try {
    // 解析 base64 数据
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: '无效的图片数据格式' };
    }

    const ext = matches[1];
    const base64Content = matches[2];
    const fileName = `${Date.now()}.${ext}`;
    const imagesPath = getImagesPath();
    const destPath = path.join(imagesPath, fileName);

    // 将 base64 转换为 buffer 并保存
    const buffer = Buffer.from(base64Content, 'base64');
    fs.writeFileSync(destPath, buffer);

    return { 
      success: true, 
      imagePath: destPath,
      fileName: fileName
    };
  } catch (error) {
    console.error('保存粘贴图片失败:', error);
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

// IPC 通信处理 - 设置 DeepSeek API 密钥
ipcMain.handle('set-deepseek-key', async (event, apiKey) => {
  try {
    if (!apiKey) {
      return { success: false, error: 'API 密钥不能为空' };
    }
    const encrypted = encryptPassword(apiKey); // 复用加密函数
    const settingsPath = getSettingsPath();
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8') || '{}');
    }
    settings.deepseekApiKey = encrypted;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('设置 DeepSeek API 密钥失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 获取 DeepSeek API 密钥
ipcMain.handle('get-deepseek-key', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: false, key: '' };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!settings.deepseekApiKey) {
      return { success: false, key: '' };
    }
    const decrypted = decryptPassword(settings.deepseekApiKey);
    return { success: true, key: decrypted };
  } catch (error) {
    console.error('获取 DeepSeek API 密钥失败:', error);
    return { success: false, key: '', error: error.message };
  }
});

// IPC 通信处理 - 检查是否设置了 DeepSeek API 密钥
ipcMain.handle('has-deepseek-key', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { hasKey: false };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return { hasKey: !!settings.deepseekApiKey };
  } catch (error) {
    console.error('检查 DeepSeek API 密钥失败:', error);
    return { hasKey: false };
  }
});

// IPC 通信处理 - 删除 DeepSeek API 密钥
ipcMain.handle('delete-deepseek-key', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: true };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    delete settings.deepseekApiKey;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('删除 DeepSeek API 密钥失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 豆包 API 配置处理 ====================

// IPC 通信处理 - 设置豆包 API 配置
ipcMain.handle('set-doubao-config', async (event, config) => {
  try {
    if (!config.apiKey) {
      return { success: false, error: 'API 密钥不能为空' };
    }
    const encrypted = encryptPassword(config.apiKey);
    const settingsPath = getSettingsPath();
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8') || '{}');
    }
    settings.doubaoApiKey = encrypted;
    settings.doubaoEndpoint = config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3';
    settings.doubaoModel = config.model || 'ep-20241211105939-jpn2s';
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('设置豆包 API 配置失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 获取豆包 API 配置
ipcMain.handle('get-doubao-config', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: false, key: '', endpoint: '', model: '' };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!settings.doubaoApiKey) {
      return { success: false, key: '', endpoint: '', model: '' };
    }
    const decrypted = decryptPassword(settings.doubaoApiKey);
    return { 
      success: true, 
      key: decrypted,
      endpoint: settings.doubaoEndpoint || 'https://ark.cn-beijing.volces.com/api/v3',
      model: settings.doubaoModel || 'ep-20241211105939-jpn2s'
    };
  } catch (error) {
    console.error('获取豆包 API 配置失败:', error);
    return { success: false, key: '', endpoint: '', model: '', error: error.message };
  }
});

// IPC 通信处理 - 删除豆包 API 配置
ipcMain.handle('delete-doubao-config', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { success: true };
    }
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    delete settings.doubaoApiKey;
    delete settings.doubaoEndpoint;
    delete settings.doubaoModel;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('删除豆包 API 配置失败:', error);
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
    const oldDbPath = getDatabasePath();
    const oldImagesPath = getImagesPath();

    // 初始化新数据目录
    if (!initDataDirectory(newPath)) {
      return { success: false, error: '初始化新数据目录失败' };
    }

    // 迁移数据文件
    let migratedFiles = [];
    
    // 复制数据库文件
    const newDbPath = path.join(newPath, 'todox.db');
    if (fs.existsSync(oldDbPath)) {
      fs.copyFileSync(oldDbPath, newDbPath);
      migratedFiles.push('todox.db');
      
      // 同时复制 WAL 和 SHM 文件（如果存在）
      const oldWalPath = oldDbPath + '-wal';
      const oldShmPath = oldDbPath + '-shm';
      if (fs.existsSync(oldWalPath)) {
        fs.copyFileSync(oldWalPath, newDbPath + '-wal');
      }
      if (fs.existsSync(oldShmPath)) {
        fs.copyFileSync(oldShmPath, newDbPath + '-shm');
      }
    }

    // 复制 images 文件夹
    const newImagesPath = path.join(newPath, 'images');
    if (fs.existsSync(oldImagesPath)) {
      copyFolderSync(oldImagesPath, newImagesPath);
      const imageFiles = fs.readdirSync(oldImagesPath);
      migratedFiles.push(`images (${imageFiles.length} 个文件)`);
    }

    // 关闭当前数据库连接
    if (db) {
      db.close();
    }

    // 更新当前数据路径
    currentDataPath = newPath;

    // 重新初始化数据库
    initDatabase();

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

    // 关闭当前数据库连接
    if (db) {
      db.close();
    }

    currentDataPath = defaultPath;
    initDataDirectory(currentDataPath);
    
    // 重新初始化数据库
    initDatabase();
    
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


// IPC 通信处理 - 加载会话列表
ipcMain.handle('load-conversations', async () => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    const conversations = db.getConversations();
    const currentConversationId = db.getCurrentConversationId();
    return { 
      success: true, 
      data: {
        conversations,
        currentConversationId
      }
    };
  } catch (error) {
    console.error('加载会话列表失败:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        conversations: [],
        currentConversationId: null
      }
    };
  }
});

// IPC 通信处理 - 保存会话列表（批量，仅用于兼容）
ipcMain.handle('save-conversations', async (event, conversationsData) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.saveConversations(conversationsData);
    if (conversationsData.currentConversationId !== undefined) {
      db.setCurrentConversationId(conversationsData.currentConversationId);
    }
    return { success: true };
  } catch (error) {
    console.error('保存会话列表失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加单个会话
ipcMain.handle('add-conversation', async (event, conversation) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addConversation(conversation);
    return { success: true };
  } catch (error) {
    console.error('添加会话失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新单个会话
ipcMain.handle('update-conversation', async (event, conversationId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateConversation(conversationId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新会话失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除单个会话
ipcMain.handle('delete-conversation', async (event, conversationId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteConversation(conversationId);
    return { success: true };
  } catch (error) {
    console.error('删除会话失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 添加消息
ipcMain.handle('add-message', async (event, conversationId, message, order) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.addMessage(conversationId, message, order);
    return { success: true };
  } catch (error) {
    console.error('添加消息失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 更新消息
ipcMain.handle('update-message', async (event, messageId, updates) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.updateMessage(messageId, updates);
    return { success: true };
  } catch (error) {
    console.error('更新消息失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 删除消息
ipcMain.handle('delete-message', async (event, messageId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.deleteMessage(messageId);
    return { success: true };
  } catch (error) {
    console.error('删除消息失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 设置当前会话ID
ipcMain.handle('set-current-conversation', async (event, conversationId) => {
  try {
    if (!db) {
      throw new Error('数据库未初始化');
    }
    db.setCurrentConversationId(conversationId);
    return { success: true };
  } catch (error) {
    console.error('设置当前会话失败:', error);
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

// IPC 通信处理 - 导出项目
ipcMain.handle('export-project', async (event, fileName, encryptedData) => {
  try {
    // 显示保存文件对话框
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出项目',
      defaultPath: fileName,
      filters: [
        { name: 'TodoX 项目文件', extensions: ['todox'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: '用户取消操作' };
    }
    
    // 写入文件
    fs.writeFileSync(result.filePath, encryptedData, 'utf-8');
    
    return { 
      success: true, 
      filePath: result.filePath 
    };
  } catch (error) {
    console.error('导出项目失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 导入项目
ipcMain.handle('import-project', async () => {
  try {
    // 显示打开文件对话框
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入项目',
      properties: ['openFile'],
      filters: [
        { name: 'TodoX 项目文件', extensions: ['todox'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '用户取消操作' };
    }
    
    // 读取文件
    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath, 'utf-8');
    
    return { 
      success: true, 
      data: data,
      filePath: filePath
    };
  } catch (error) {
    console.error('导入项目失败:', error);
    return { success: false, error: error.message };
  }
});

