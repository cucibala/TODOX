const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImage: (fileName) => ipcRenderer.invoke('read-image', fileName),
  deleteImage: (fileName) => ipcRenderer.invoke('delete-image', fileName)
});

