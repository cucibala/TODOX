const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImage: (fileName) => ipcRenderer.invoke('read-image', fileName),
  deleteImage: (fileName) => ipcRenderer.invoke('delete-image', fileName),
  
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

