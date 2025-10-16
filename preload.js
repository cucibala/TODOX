const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 项目管理
  loadProjects: () => ipcRenderer.invoke('load-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),
  
  // 任务管理
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  
  // 图片管理
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImage: (fileName) => ipcRenderer.invoke('read-image', fileName),
  deleteImage: (fileName) => ipcRenderer.invoke('delete-image', fileName),
  
  // 密码管理
  setPassword: (password) => ipcRenderer.invoke('set-password', password),
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  hasPassword: () => ipcRenderer.invoke('has-password'),
  changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('change-password', oldPassword, newPassword),
  clearPassword: (password) => ipcRenderer.invoke('clear-password', password),
  
  // DeepSeek API 管理
  setDeepSeekKey: (apiKey) => ipcRenderer.invoke('set-deepseek-key', apiKey),
  getDeepSeekKey: () => ipcRenderer.invoke('get-deepseek-key'),
  hasDeepSeekKey: () => ipcRenderer.invoke('has-deepseek-key'),
  deleteDeepSeekKey: () => ipcRenderer.invoke('delete-deepseek-key'),
  aiBreakdownTask: (taskText) => ipcRenderer.invoke('ai-breakdown-task', taskText),
  generateDailySummary: (tasks) => ipcRenderer.invoke('generate-daily-summary', tasks),
  
  // 数据路径管理
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  selectDataPath: () => ipcRenderer.invoke('select-data-path'),
  changeDataPath: (newPath) => ipcRenderer.invoke('change-data-path', newPath),
  resetDataPath: () => ipcRenderer.invoke('reset-data-path'),
  
  // 设置管理
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  toggleCompactMode: () => ipcRenderer.send('toggle-compact-mode'),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  toggleDesktopMode: () => ipcRenderer.send('toggle-desktop-mode'),
  
  // 监听模式变化
  onModeChanged: (callback) => ipcRenderer.on('mode-changed', (event, isCompact) => callback(isCompact)),
  onAlwaysOnTopChanged: (callback) => ipcRenderer.on('always-on-top-changed', (event, isOnTop) => callback(isOnTop)),
  onDesktopModeChanged: (callback) => ipcRenderer.on('desktop-mode-changed', (event, isDesktop) => callback(isDesktop))
});

