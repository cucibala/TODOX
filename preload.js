const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 项目管理
  loadProjects: () => ipcRenderer.invoke('load-projects'),
  addProject: (project) => ipcRenderer.invoke('add-project', project),
  updateProject: (projectId, updates) => ipcRenderer.invoke('update-project', projectId, updates),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  setCurrentProject: (projectId) => ipcRenderer.invoke('set-current-project', projectId),
  exportProject: (fileName, encryptedData) => ipcRenderer.invoke('export-project', fileName, encryptedData),
  importProject: () => ipcRenderer.invoke('import-project'),
  
  // 任务管理
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  addTodo: (todo) => ipcRenderer.invoke('add-todo', todo),
  updateTodo: (todoId, updates) => ipcRenderer.invoke('update-todo', todoId, updates),
  deleteTodo: (todoId) => ipcRenderer.invoke('delete-todo', todoId),
  addSubtask: (todoId, subtask) => ipcRenderer.invoke('add-subtask', todoId, subtask),
  updateSubtask: (subtaskId, updates) => ipcRenderer.invoke('update-subtask', subtaskId, updates),
  deleteSubtask: (subtaskId) => ipcRenderer.invoke('delete-subtask', subtaskId),
  addProgress: (todoId, record) => ipcRenderer.invoke('add-progress', todoId, record),
  updateProgress: (recordId, updates) => ipcRenderer.invoke('update-progress', recordId, updates),
  deleteProgress: (recordId) => ipcRenderer.invoke('delete-progress', recordId),
  
  // 图片管理
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImage: (fileName) => ipcRenderer.invoke('read-image', fileName),
  deleteImage: (fileName) => ipcRenderer.invoke('delete-image', fileName),
  saveImageFromClipboard: (base64Data) => ipcRenderer.invoke('save-image-from-clipboard', base64Data),
  
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
  
  // 豆包 API 配置
  setDoubaoConfig: (config) => ipcRenderer.invoke('set-doubao-config', config),
  getDoubaoConfig: () => ipcRenderer.invoke('get-doubao-config'),
  getDoubaoKey: () => ipcRenderer.invoke('get-doubao-config'), // 别名，为了兼容 chatStore
  deleteDoubaoConfig: () => ipcRenderer.invoke('delete-doubao-config'),
  
  // 会话管理
  loadConversations: () => ipcRenderer.invoke('load-conversations'),
  saveConversations: (conversationsData) => ipcRenderer.invoke('save-conversations', conversationsData), // 仅用于批量保存消息
  addConversation: (conversation) => ipcRenderer.invoke('add-conversation', conversation),
  updateConversation: (conversationId, updates) => ipcRenderer.invoke('update-conversation', conversationId, updates),
  deleteConversation: (conversationId) => ipcRenderer.invoke('delete-conversation', conversationId),
  addMessage: (conversationId, message, order) => ipcRenderer.invoke('add-message', conversationId, message, order),
  updateMessage: (messageId, updates) => ipcRenderer.invoke('update-message', messageId, updates),
  deleteMessage: (messageId) => ipcRenderer.invoke('delete-message', messageId),
  setCurrentConversation: (conversationId) => ipcRenderer.invoke('set-current-conversation', conversationId),
  
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

