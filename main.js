const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 数据文件路径
const dataPath = path.join(app.getPath('userData'), 'todos.json');
const imagesPath = path.join(app.getPath('userData'), 'images');

// 确保图片目录存在
if (!fs.existsSync(imagesPath)) {
  fs.mkdirSync(imagesPath, { recursive: true });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f5f7fa',
    show: false,
    frame: true,
    titleBarStyle: 'default'
  });

  mainWindow.loadFile('index.html');

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();

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

