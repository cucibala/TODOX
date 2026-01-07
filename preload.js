const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 项目管理
  loadProjects: () => ipcRenderer.invoke('load-projects'),
  addProject: (project) => ipcRenderer.invoke('add-project', project),
  updateProject: (projectId, updates) => ipcRenderer.invoke('update-project', projectId, updates),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  addProjectGroup: (group) => ipcRenderer.invoke('add-project-group', group),
  updateProjectGroup: (groupId, updates) => ipcRenderer.invoke('update-project-group', groupId, updates),
  deleteProjectGroup: (groupId) => ipcRenderer.invoke('delete-project-group', groupId),
  setCurrentProject: (projectId) => ipcRenderer.invoke('set-current-project', projectId),
  exportProject: (fileName, encryptedData) => ipcRenderer.invoke('export-project', fileName, encryptedData),
  importProject: () => ipcRenderer.invoke('import-project'),
  
  // 任务管理
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  addTodo: (todo) => ipcRenderer.invoke('add-todo', todo),
  addTodosBatch: (todos) => ipcRenderer.invoke('add-todos-batch', todos),
  updateTodo: (todoId, updates) => ipcRenderer.invoke('update-todo', todoId, updates),
  deleteTodo: (todoId) => ipcRenderer.invoke('delete-todo', todoId),
  addSubtask: (todoId, subtask) => ipcRenderer.invoke('add-subtask', todoId, subtask),
  updateSubtask: (subtaskId, updates) => ipcRenderer.invoke('update-subtask', subtaskId, updates),
  deleteSubtask: (subtaskId) => ipcRenderer.invoke('delete-subtask', subtaskId),
  replaceSubtasks: (todoId, subtasks) => ipcRenderer.invoke('replace-subtasks', todoId, subtasks),
  addProgress: (todoId, record) => ipcRenderer.invoke('add-progress', todoId, record),
  updateProgress: (recordId, updates) => ipcRenderer.invoke('update-progress', recordId, updates),
  deleteProgress: (recordId) => ipcRenderer.invoke('delete-progress', recordId),
  onTodosChanged: (callback) => ipcRenderer.on('todos-changed', () => callback()),
  
  // 图片管理
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImage: (fileName) => ipcRenderer.invoke('read-image', fileName),
  deleteImage: (fileName) => ipcRenderer.invoke('delete-image', fileName),
  saveImageFromClipboard: (base64Data) => ipcRenderer.invoke('save-image-from-clipboard', base64Data),

  // 工具箱 - HTTP 图片接收
  startToolboxHttp: () => ipcRenderer.invoke('toolbox-http-start'),
  stopToolboxHttp: () => ipcRenderer.invoke('toolbox-http-stop'),
  getToolboxHttpStatus: () => ipcRenderer.invoke('toolbox-http-status'),
  onToolboxHttpStatus: (callback) => ipcRenderer.on('toolbox-http-status', (event, status) => callback(status)),
  onToolboxImageReceived: (callback) => ipcRenderer.on('toolbox-image-received', (event, payload) => callback(payload)),
  
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
  
  // 文档管理
  getDocuments: () => ipcRenderer.invoke('get-documents'),
  addDocument: (document) => ipcRenderer.invoke('add-document', document),
  updateDocument: (documentId, updates) => ipcRenderer.invoke('update-document', documentId, updates),
  deleteDocument: (documentId) => ipcRenderer.invoke('delete-document', documentId),
  getCurrentDocumentId: () => ipcRenderer.invoke('get-current-document-id'),
  setCurrentDocumentId: (documentId) => ipcRenderer.invoke('set-current-document-id', documentId),
  moveDocument: (documentId, newParentId, newOrderIndex) => ipcRenderer.invoke('move-document', documentId, newParentId, newOrderIndex),
  getDescendantIds: (folderId) => ipcRenderer.invoke('get-descendant-ids', folderId),

  // 情感分析 - 人物管理
  getPersons: () => ipcRenderer.invoke('get-persons'),
  getPerson: (personId) => ipcRenderer.invoke('get-person', personId),
  addPerson: (person) => ipcRenderer.invoke('add-person', person),
  updatePerson: (personId, updates) => ipcRenderer.invoke('update-person', personId, updates),
  deletePerson: (personId) => ipcRenderer.invoke('delete-person', personId),

  // 情感分析 - 聊天记录
  getChatRecords: (personId, limit) => ipcRenderer.invoke('get-chat-records', personId, limit),
  addChatRecord: (record) => ipcRenderer.invoke('add-chat-record', record),
  addChatRecords: (records) => ipcRenderer.invoke('add-chat-records', records),
  deleteChatRecord: (recordId) => ipcRenderer.invoke('delete-chat-record', recordId),
  clearChatRecords: (personId) => ipcRenderer.invoke('clear-chat-records', personId),

  // 情感分析 - 日记管理
  getDiaries: (personId, limit) => ipcRenderer.invoke('get-diaries', personId, limit),
  addDiary: (diary) => ipcRenderer.invoke('add-diary', diary),
  updateDiary: (diaryId, updates) => ipcRenderer.invoke('update-diary', diaryId, updates),
  deleteDiary: (diaryId) => ipcRenderer.invoke('delete-diary', diaryId),

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

  notifyRendererReady: () => ipcRenderer.send('renderer-ready'),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  
  // 外部链接
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // 监听模式变化
  onAlwaysOnTopChanged: (callback) => ipcRenderer.on('always-on-top-changed', (event, isOnTop) => callback(isOnTop)),
  onQuickInputModeChanged: (callback) => ipcRenderer.on('quick-input-mode-changed', (event, isQuick) => callback(isQuick)),
  onQuickInputOpened: (callback) => ipcRenderer.on('quick-input-opened', () => callback()),
  onQuickInputFocus: (callback) => ipcRenderer.on('quick-input-focus', () => callback()),
  onQuickInputClosed: (callback) => ipcRenderer.on('quick-input-closed', () => callback()),
  exitQuickInputMode: () => ipcRenderer.send('quick-input-exit'),
  notifyQuickInputSent: () => ipcRenderer.send('quick-input-sent'),
  onQuickInputSent: (callback) => ipcRenderer.on('quick-input-sent', () => callback()),
  openMainWindow: () => ipcRenderer.send('open-main-window'),
  onOpenMainWindow: (callback) => ipcRenderer.on('open-main-window', () => callback()),
  setQuickInputHasMessages: (hasMessages) => ipcRenderer.send('quick-input-has-messages', hasMessages),
  resizeQuickInput: (height) => ipcRenderer.send('quick-input-resize', height)
});
