// 任务管理应用
class TodoApp {
  constructor() {
    this.projects = []; // 项目列表
    this.currentProjectId = null; // 当前选中的项目ID
    this.todos = [];
    this.currentFilter = 'all';
    this.currentPriorityFilter = 'all';
    this.editingTaskId = null;
    this.currentImages = []; // 当前选择的图片列表
    this.currentProgressImages = {}; // 每个任务的进度图片：{taskId: [images]}
    this.currentSubtaskTaskId = null; // 当前正在添加子任务的任务ID
    
    this.init();
  }

  async init() {
    // 加载数据
    await this.loadProjects();
    await this.loadTodos();
    
    // 绑定事件
    this.bindEvents();
    
    // 绑定窗口控制事件
    this.bindWindowControls();
    
    // 监听模式变化
    this.listenModeChanges();
    
    // 渲染界面
    this.renderProjects();
    this.updateTaskInputState();
    this.render();
    
    // 检查密码保护：启动时如果已设置密码，自动锁定
    await this.checkPasswordOnStartup();
  }

  // 启动时检查密码保护
  async checkPasswordOnStartup() {
    const result = await window.electronAPI.hasPassword();
    if (result.hasPassword) {
      // 已设置密码，自动显示锁定界面
      const lockScreen = document.getElementById('lock-screen');
      lockScreen.style.display = 'flex';
      
      // 清空输入框
      const unlockInput = document.getElementById('unlock-password-input');
      unlockInput.value = '';
      
      // 隐藏错误提示
      const errorEl = document.getElementById('unlock-error');
      errorEl.style.display = 'none';
      
      // 聚焦到输入框
      setTimeout(() => unlockInput.focus(), 100);
    }
  }

  bindWindowControls() {
    // 锁定按钮
    const btnLock = document.getElementById('btn-lock');
    if (btnLock) {
      btnLock.addEventListener('click', async () => {
        await this.lockApp();
      });
    }

    // 桌面模式按钮
    const btnDesktop = document.getElementById('btn-desktop');
    if (btnDesktop) {
      btnDesktop.addEventListener('click', () => {
        window.electronAPI.toggleDesktopMode();
      });
    }

    // 最小化按钮
    const btnMinimize = document.getElementById('btn-minimize');
    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        window.electronAPI.windowMinimize();
      });
    }

    // 关闭按钮（隐藏到托盘）
    const btnClose = document.getElementById('btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        window.electronAPI.windowClose();
      });
    }

    // 迷你模式切换按钮
    const btnCompact = document.getElementById('btn-compact');
    if (btnCompact) {
      btnCompact.addEventListener('click', () => {
        window.electronAPI.toggleCompactMode();
      });
    }

    // 置顶按钮
    const btnPin = document.getElementById('btn-pin');
    if (btnPin) {
      btnPin.addEventListener('click', () => {
        window.electronAPI.toggleAlwaysOnTop();
      });
    }

    // 解锁表单
    const unlockForm = document.getElementById('unlock-form');
    if (unlockForm) {
      unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.unlockApp();
      });
    }

    // 设置密码按钮
    const btnSetPassword = document.getElementById('btn-set-password');
    if (btnSetPassword) {
      btnSetPassword.addEventListener('click', () => {
        this.showPasswordDialog();
      });
    }

    // 数据路径设置按钮
    const btnDataPathSettings = document.getElementById('btn-data-path-settings');
    if (btnDataPathSettings) {
      btnDataPathSettings.addEventListener('click', () => {
        this.showDataPathDialog();
      });
    }

    // 数据路径对话框关闭按钮
    const dataPathDialogClose = document.getElementById('data-path-dialog-close');
    if (dataPathDialogClose) {
      dataPathDialogClose.addEventListener('click', () => {
        this.closeDataPathDialog();
      });
    }

    // 选择新路径按钮
    const btnSelectDataPath = document.getElementById('data-path-btn-select');
    if (btnSelectDataPath) {
      btnSelectDataPath.addEventListener('click', async () => {
        await this.selectAndChangeDataPath();
      });
    }

    // 重置路径按钮
    const btnResetDataPath = document.getElementById('data-path-btn-reset');
    if (btnResetDataPath) {
      btnResetDataPath.addEventListener('click', async () => {
        await this.resetDataPath();
      });
    }
  }

  listenModeChanges() {
    // 监听迷你模式变化
    window.electronAPI.onModeChanged((isCompact) => {
      if (isCompact) {
        document.body.classList.add('compact-mode');
        this.showToast('已切换到迷你模式');
      } else {
        document.body.classList.remove('compact-mode');
        this.showToast('已切换到完整模式');
      }
    });

    // 监听置顶状态变化
    window.electronAPI.onAlwaysOnTopChanged((isOnTop) => {
      const btnPin = document.getElementById('btn-pin');
      if (btnPin) {
        if (isOnTop) {
          btnPin.classList.add('active');
          btnPin.title = '取消置顶';
        } else {
          btnPin.classList.remove('active');
          btnPin.title = '窗口置顶';
        }
      }
    });

    // 监听桌面模式变化
    window.electronAPI.onDesktopModeChanged((isDesktop) => {
      const btnDesktop = document.getElementById('btn-desktop');
      const btnPin = document.getElementById('btn-pin');
      
      if (isDesktop) {
        document.body.classList.add('desktop-mode');
        if (btnDesktop) {
          btnDesktop.classList.add('active');
          btnDesktop.title = '退出桌面模式';
        }
        if (btnPin) {
          btnPin.disabled = true;
          btnPin.style.opacity = '0.5';
        }
        this.showToast('已进入桌面背景模式');
      } else {
        document.body.classList.remove('desktop-mode');
        if (btnDesktop) {
          btnDesktop.classList.remove('active');
          btnDesktop.title = '桌面背景模式';
        }
        if (btnPin) {
          btnPin.disabled = false;
          btnPin.style.opacity = '1';
        }
        this.showToast('已退出桌面背景模式');
      }
    });
  }

  showToast(message) {
    // 创建或获取toast容器
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    // 显示消息
    toast.textContent = message;
    toast.classList.add('show');

    // 3秒后自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }


  async loadProjects() {
    try {
      const data = await window.electronAPI.loadProjects();
      this.projects = data.projects || [];
      this.currentProjectId = data.currentProjectId || null;
      console.log('项目数据加载成功:', this.projects);
    } catch (error) {
      console.error('加载项目数据失败:', error);
      this.projects = [];
      this.currentProjectId = null;
    }
  }

  async saveProjects() {
    try {
      await window.electronAPI.saveProjects({
        projects: this.projects,
        currentProjectId: this.currentProjectId
      });
      console.log('项目数据保存成功');
    } catch (error) {
      console.error('保存项目数据失败:', error);
    }
  }

  async loadTodos() {
    try {
      this.todos = await window.electronAPI.loadTodos();
      console.log('任务数据加载成功:', this.todos);
    } catch (error) {
      console.error('加载任务数据失败:', error);
      this.todos = [];
    }
  }

  async saveTodos() {
    try {
      await window.electronAPI.saveTodos(this.todos);
      console.log('任务数据保存成功');
    } catch (error) {
      console.error('保存任务数据失败:', error);
    }
  }

  bindEvents() {
    // 添加项目按钮
    const addProjectBtn = document.getElementById('btn-add-project');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        this.showAddProjectDialog();
      });
    }

    // 添加任务表单
    const form = document.getElementById('add-task-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addTask();
    });

    // 搜索框
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTasks(e.target.value);
    });

    // 筛选按钮
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        await this.render();
      });
    });

    // 优先级筛选按钮
    const priorityButtons = document.querySelectorAll('.priority-filter-btn');
    priorityButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        priorityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPriorityFilter = btn.dataset.priority;
        await this.render();
      });
    });

    // 添加图片按钮
    const addImageBtn = document.getElementById('add-image-btn');
    if (addImageBtn) {
      addImageBtn.addEventListener('click', async () => {
        await this.selectImage();
      });
    }

    // 子任务弹窗事件
    const subtaskDialog = document.getElementById('subtask-dialog');
    const subtaskDialogClose = document.getElementById('subtask-dialog-close');
    const subtaskDialogOverlay = subtaskDialog.querySelector('.subtask-dialog-overlay');
    const subtaskDialogCancel = document.getElementById('subtask-dialog-cancel');
    const subtaskDialogConfirm = document.getElementById('subtask-dialog-confirm');
    const subtaskDialogInput = document.getElementById('subtask-dialog-input');

    subtaskDialogClose.addEventListener('click', () => this.closeSubtaskDialog());
    subtaskDialogOverlay.addEventListener('click', () => this.closeSubtaskDialog());
    subtaskDialogCancel.addEventListener('click', () => this.closeSubtaskDialog());
    
    subtaskDialogConfirm.addEventListener('click', async () => {
      await this.confirmAddSubtask();
    });

    subtaskDialogInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.confirmAddSubtask();
      }
    });
  }

  async selectImage() {
    try {
      const result = await window.electronAPI.selectImage();
      if (result.success && result.fileName) {
        // 添加到图片列表
        this.currentImages.push(result.fileName);
        
        // 更新预览显示
        await this.updateImagePreviews();
      }
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  }
  
  async updateImagePreviews() {
    const previewContainer = document.getElementById('image-preview-container');
    previewContainer.innerHTML = '';
    
    if (this.currentImages.length === 0) {
      previewContainer.style.display = 'none';
      return;
    }
    
    previewContainer.style.display = 'block';
    
    for (let i = 0; i < this.currentImages.length; i++) {
      const fileName = this.currentImages[i];
      const imageData = await window.electronAPI.readImage(fileName);
      
      if (imageData.success) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        wrapper.innerHTML = `
          <img class="image-preview" src="${imageData.data}" />
          <button type="button" class="btn-remove-image" data-index="${i}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        
        // 绑定删除按钮事件
        const removeBtn = wrapper.querySelector('.btn-remove-image');
        removeBtn.addEventListener('click', () => this.removeImage(i));
        
        previewContainer.appendChild(wrapper);
      }
    }
  }
  
  removeImage(index) {
    this.currentImages.splice(index, 1);
    this.updateImagePreviews();
  }

  removeCurrentImage() {
    this.currentImages = [];
    const previewContainer = document.getElementById('image-preview-container');
    previewContainer.style.display = 'none';
  }

  async addTask() {
    // 检查是否选择了项目
    if (!this.currentProjectId) {
      this.showToast('请先选择一个项目');
      return;
    }

    const input = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const dueDateInput = document.getElementById('due-date-input');
    const text = input.value.trim();

    if (!text) return;

    const task = {
      id: Date.now(),
      text: text,
      projectId: this.currentProjectId, // 关联项目ID
      completed: false,
      priority: prioritySelect.value,
      createdAt: new Date().toISOString(),
      dueDate: dueDateInput.value || null,
      images: [...this.currentImages], // 保存图片数组
      progress: [], // 进度记录数组
      pinned: false, // 是否置顶
      subtasks: [] // 子任务数组
    };

    this.todos.unshift(task);
    input.value = '';
    prioritySelect.value = 'medium';
    dueDateInput.value = ''; // 清空日期
    
    // 清除图片预览
    this.removeCurrentImage();

    await this.saveTodos();
    await this.render();
    
    // 确保输入框重新获得焦点
    setTimeout(() => input.focus(), 0);
  }

  async toggleTask(id) {
    const task = this.todos.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      // 记录完成时间
      if (task.completed) {
        task.completedAt = new Date().toISOString();
      } else {
        // 取消完成时清除完成时间
        task.completedAt = null;
      }
      await this.saveTodos();
      await this.render();
    }
  }

  async togglePinTask(id) {
    const task = this.todos.find(t => t.id === id);
    if (task) {
      task.pinned = !task.pinned;
      await this.saveTodos();
      await this.render();
      this.showToast(task.pinned ? '任务已置顶' : '已取消置顶');
    }
  }

  async deleteTask(id) {
    const task = this.todos.find(t => t.id === id);
    if (task) {
      // 删除旧版本的单张图片（兼容性）
      if (task.image) {
        await window.electronAPI.deleteImage(task.image);
      }
      // 删除多张图片
      if (task.images && task.images.length > 0) {
        for (const image of task.images) {
          await window.electronAPI.deleteImage(image);
        }
      }
    }
    
    this.todos = this.todos.filter(t => t.id !== id);
    await this.saveTodos();
    await this.render();
  }

  async startEditTask(id) {
    this.editingTaskId = id;
    await this.render();
    
    // 聚焦到编辑输入框
    setTimeout(() => {
      const input = document.querySelector(`[data-task-id="${id}"] .task-edit-input`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  async saveEditTask(id, newText) {
    const task = this.todos.find(t => t.id === id);
    if (task && newText.trim()) {
      task.text = newText.trim();
      this.editingTaskId = null;
      await this.saveTodos();
      await this.render();
    } else {
      await this.cancelEdit();
    }
  }

  async cancelEdit() {
    this.editingTaskId = null;
    await this.render();
  }

  async addProgress(taskId, progressText) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && progressText.trim()) {
      if (!task.progress) {
        task.progress = [];
      }
      
      const progressImages = this.currentProgressImages[taskId] || [];
      
      task.progress.push({
        id: Date.now(),
        text: progressText.trim(),
        createdAt: new Date().toISOString(),
        images: [...progressImages]
      });
      
      // 清空当前任务的进度图片
      this.currentProgressImages[taskId] = [];
      
      await this.saveTodos();
      await this.render();
    }
  }

  async deleteProgress(taskId, progressId) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && task.progress) {
      // 找到进度并删除其图片
      const progress = task.progress.find(p => p.id === progressId);
      if (progress && progress.images) {
        for (const image of progress.images) {
          await window.electronAPI.deleteImage(image);
        }
      }
      
      task.progress = task.progress.filter(p => p.id !== progressId);
      await this.saveTodos();
      await this.render();
    }
  }

  async selectProgressImage(taskId) {
    try {
      const result = await window.electronAPI.selectImage();
      if (result.success && result.fileName) {
        if (!this.currentProgressImages[taskId]) {
          this.currentProgressImages[taskId] = [];
        }
        this.currentProgressImages[taskId].push(result.fileName);
        await this.updateProgressImagePreviews(taskId);
      }
    } catch (error) {
      console.error('选择进度图片失败:', error);
    }
  }

  async updateProgressImagePreviews(taskId) {
    const previewContainer = document.querySelector(`[data-task-id="${taskId}"] .progress-image-preview-container`);
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    const images = this.currentProgressImages[taskId] || [];
    
    if (images.length === 0) {
      previewContainer.style.display = 'none';
      return;
    }
    
    previewContainer.style.display = 'flex';
    
    for (let i = 0; i < images.length; i++) {
      const fileName = images[i];
      const imageData = await window.electronAPI.readImage(fileName);
      
      if (imageData.success) {
        const wrapper = document.createElement('div');
        wrapper.className = 'progress-image-preview-wrapper';
        wrapper.innerHTML = `
          <img class="progress-image-preview" src="${imageData.data}" />
          <button type="button" class="btn-remove-progress-image" data-index="${i}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        
        const removeBtn = wrapper.querySelector('.btn-remove-progress-image');
        removeBtn.addEventListener('click', () => this.removeProgressImage(taskId, i));
        
        previewContainer.appendChild(wrapper);
      }
    }
  }

  removeProgressImage(taskId, index) {
    if (this.currentProgressImages[taskId]) {
      this.currentProgressImages[taskId].splice(index, 1);
      this.updateProgressImagePreviews(taskId);
    }
  }

  async addImageToTask(taskId, imageName) {
    const task = this.todos.find(t => t.id === taskId);
    if (task) {
      if (!task.images) {
        task.images = [];
      }
      task.images.push(imageName);
      await this.saveTodos();
      await this.render();
    }
  }

  async removeImageFromTask(taskId, imageIndex) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && task.images && task.images[imageIndex]) {
      const imageName = task.images[imageIndex];
      await window.electronAPI.deleteImage(imageName);
      task.images.splice(imageIndex, 1);
      await this.saveTodos();
      await this.render();
    }
  }

  searchTasks(query) {
    const taskItems = document.querySelectorAll('.task-item');
    const lowerQuery = query.toLowerCase().trim();

    taskItems.forEach(item => {
      const taskText = item.querySelector('.task-text').textContent.toLowerCase();
      if (taskText.includes(lowerQuery)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });

    this.updateEmptyState();
  }

  filterTasks() {
    let filtered = [...this.todos];

    // 按项目筛选
    if (this.currentProjectId) {
      filtered = filtered.filter(t => t.projectId === this.currentProjectId);
    }

    // 按完成状态筛选
    if (this.currentFilter === 'active') {
      filtered = filtered.filter(t => !t.completed);
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed);
    }

    // 按优先级筛选
    if (this.currentPriorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === this.currentPriorityFilter);
    }

    // 排序：置顶 > 完成状态 > 创建时间
    filtered.sort((a, b) => {
      if(a.pinned != undefined && b.pinned != undefined) {
        if(a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
      }
      
      // 2. 显示全部任务时，未完成的在上面，已完成的在下面
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 3. 相同状态下，按创建时间排序（新的在前）
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return filtered;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDueDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // 计算任务耗时
  calculateTaskDuration(createdAt, completedAt) {
    if (!createdAt || !completedAt) return null;
    
    const created = new Date(createdAt);
    const completed = new Date(completedAt);
    const diffMs = completed - created;
    
    if (diffMs < 0) return null;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '不到1分钟';
    if (diffMins < 60) return `${diffMins}分钟`;
    if (diffHours < 24) {
      const mins = diffMins % 60;
      return mins > 0 ? `${diffHours}小时${mins}分钟` : `${diffHours}小时`;
    }
    if (diffDays < 30) {
      const hours = diffHours % 24;
      return hours > 0 ? `${diffDays}天${hours}小时` : `${diffDays}天`;
    }
    
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return days > 0 ? `${months}个月${days}天` : `${months}个月`;
  }

  getDueDateStatus(dateString) {
    if (!dateString) return null;
    
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'upcoming';
  }

  showImageViewer(imageSrc) {
    let viewer = document.getElementById('image-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'image-viewer';
      viewer.className = 'image-viewer';
      viewer.innerHTML = '<img />';
      document.body.appendChild(viewer);
      
      viewer.addEventListener('click', () => {
        viewer.classList.remove('show');
      });
    }
    
    const img = viewer.querySelector('img');
    img.src = imageSrc;
    viewer.classList.add('show');
  }

  showConfirmDialog(message) {
    return new Promise((resolve) => {
      let dialog = document.getElementById('confirm-dialog');
      if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'confirm-dialog';
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
          <div class="confirm-dialog-content">
            <div class="confirm-dialog-title">确认操作</div>
            <div class="confirm-dialog-message"></div>
            <div class="confirm-dialog-buttons">
              <button class="confirm-dialog-btn confirm-dialog-btn-cancel">取消</button>
              <button class="confirm-dialog-btn confirm-dialog-btn-confirm">确定</button>
            </div>
          </div>
        `;
        document.body.appendChild(dialog);
      }

      const messageEl = dialog.querySelector('.confirm-dialog-message');
      const cancelBtn = dialog.querySelector('.confirm-dialog-btn-cancel');
      const confirmBtn = dialog.querySelector('.confirm-dialog-btn-confirm');

      messageEl.textContent = message;

      const closeDialog = (result) => {
        dialog.classList.remove('show');
        resolve(result);
      };

      // 移除旧的事件监听器
      const newCancelBtn = cancelBtn.cloneNode(true);
      const newConfirmBtn = confirmBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

      // 添加新的事件监听器
      newCancelBtn.addEventListener('click', () => closeDialog(false));
      newConfirmBtn.addEventListener('click', () => closeDialog(true));
      
      // 点击背景关闭
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          closeDialog(false);
        }
      };

      dialog.classList.add('show');
      
      // 聚焦到确定按钮
      setTimeout(() => newConfirmBtn.focus(), 100);
    });
  }

  updateStats() {
    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    
    document.getElementById('total-count').textContent = total;
    document.getElementById('completed-count').textContent = completed;
  }

  updateEmptyState() {
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const visibleTasks = taskList.querySelectorAll('.task-item:not([style*="display: none"])');
    
    if (visibleTasks.length === 0) {
      emptyState.classList.add('show');
    } else {
      emptyState.classList.remove('show');
    }
  }

  async render() {
    const taskList = document.getElementById('task-list');
    const filteredTodos = this.filterTasks();

    taskList.innerHTML = '';

    for (const task of filteredTodos) {
      const taskItem = await this.createTaskElement(task);
      taskList.appendChild(taskItem);
    }

    this.updateStats();
    this.updateEmptyState();
  }

  async createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
    div.dataset.taskId = task.id;
    
    if (this.editingTaskId === task.id) {
      div.classList.add('editing');
    }

    const priorityClass = `priority-${task.priority}`;
    
    // 获取任务进度
    const taskProgress = this.getTaskProgress(task);
    const progressCircleHtml = this.createProgressCircle(taskProgress, task.id);

    // 构建日期显示
    let dueDateHtml = '';
    if (task.dueDate) {
      const dueDateStatus = this.getDueDateStatus(task.dueDate);
      const dueDateText = this.formatDueDate(task.dueDate);
      dueDateHtml = `
        <div class="task-due-date ${dueDateStatus}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${dueDateText}
        </div>
      `;
    }

    // 构建完成时间显示
    let completedAtHtml = '';
    if (task.completed && task.completedAt) {
      const duration = this.calculateTaskDuration(task.createdAt, task.completedAt);
      completedAtHtml = `
        <div class="task-completed-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          完成于 ${this.formatDate(task.completedAt)}
        </div>
        ${duration ? `
          <div class="task-duration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            耗时 ${duration}
          </div>
        ` : ''}
      `;
    }

    const isEditing = this.editingTaskId === task.id;
    
    div.innerHTML = `
      <div class="task-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      ${progressCircleHtml}
      <div class="priority-indicator ${priorityClass}"></div>
      <div class="task-content">
        <div class="task-text">${this.escapeHtml(task.text)}</div>
        <input type="text" class="task-edit-input" value="${this.escapeHtml(task.text)}" />
        <div class="task-meta">
          <div class="task-time">${this.formatDate(task.createdAt)}</div>
          ${dueDateHtml}
          ${completedAtHtml}
        </div>
        ${(task.images && task.images.length > 0) || task.image ? '<div class="task-images-container"></div>' : ''}
        ${isEditing ? '<div class="task-edit-images-container"><button type="button" class="btn-add-task-image" title="添加图片">📷 添加图片</button><div class="task-edit-images-list"></div></div>' : ''}
        ${task.subtasks && task.subtasks.length > 0 ? '<div class="task-subtasks-section"><div class="subtasks-list"></div></div>' : ''}
        ${task.progress && task.progress.length > 0 ? `
          <div class="task-progress-section">
            <button class="btn-toggle-progress" title="展开/收起进度">
              <svg class="progress-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <span class="progress-count">进度记录 (${task.progress.length})</span>
            </button>
            <div class="task-progress-container" style="display: none;"></div>
          </div>
        ` : ''}
        <div class="task-add-progress">
          <div class="progress-input-group">
            <input type="text" class="progress-input" placeholder="添加进度描述..." />
            <button class="btn-add-progress-image" title="添加图片">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            <button class="btn-add-progress" title="添加进度">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div class="progress-image-preview-container" style="display: none;"></div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-pin" title="${task.pinned ? '取消置顶' : '置顶'}">
          <svg viewBox="0 0 24 24" fill="${task.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="17" x2="12" y2="22"></line>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
          </svg>
        </button>
        <button class="btn-edit" title="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-delete" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // 加载并显示图片
    const imagesContainer = div.querySelector('.task-images-container');
    if (imagesContainer) {
      try {
        // 兼容旧版本的单张图片
        if (task.image) {
          const imageData = await window.electronAPI.readImage(task.image);
          if (imageData.success) {
            const img = document.createElement('img');
            img.src = imageData.data;
            img.className = 'task-image';
            img.addEventListener('click', () => {
              this.showImageViewer(imageData.data);
            });
            imagesContainer.appendChild(img);
          }
        }
        
        // 显示多张图片
        if (task.images && task.images.length > 0) {
          for (const imageName of task.images) {
            const imageData = await window.electronAPI.readImage(imageName);
            if (imageData.success) {
              const img = document.createElement('img');
              img.src = imageData.data;
              img.className = 'task-image';
              img.addEventListener('click', () => {
                this.showImageViewer(imageData.data);
              });
              imagesContainer.appendChild(img);
            }
          }
        }
      } catch (error) {
        console.error('加载图片失败:', error);
      }
    }

    // 绑定事件
    const checkbox = div.querySelector('.task-checkbox');
    checkbox.addEventListener('click', async () => await this.toggleTask(task.id));

    // 圆环进度条点击事件 - 打开添加子任务弹窗
    const progressCircleWrapper = div.querySelector('.task-progress-circle-wrapper');
    if (progressCircleWrapper) {
      progressCircleWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSubtaskDialog(task.id);
      });
    }

    // 渲染子任务列表
    if (task.subtasks && task.subtasks.length > 0) {
      this.renderSubtasksInline(div, task);
    }

    const pinBtn = div.querySelector('.btn-pin');
    pinBtn.addEventListener('click', async () => await this.togglePinTask(task.id));

    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await this.showConfirmDialog('确定要删除这个任务吗？');
      if (confirmed) {
        await this.deleteTask(task.id);
      }
    });

    const editBtn = div.querySelector('.btn-edit');
    editBtn.addEventListener('click', async () => {
      if (this.editingTaskId === task.id) {
        const input = div.querySelector('.task-edit-input');
        await this.saveEditTask(task.id, input.value);
      } else {
        await this.startEditTask(task.id);
      }
    });

    // 编辑输入框事件
    const editInput = div.querySelector('.task-edit-input');
    editInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.saveEditTask(task.id, editInput.value);
      } else if (e.key === 'Escape') {
        await this.cancelEdit();
      }
    });

    editInput.addEventListener('blur', () => {
      setTimeout(async () => {
        if (this.editingTaskId === task.id) {
          await this.saveEditTask(task.id, editInput.value);
        }
      }, 200);
    });

    // 进度展开/收起按钮
    const toggleProgressBtn = div.querySelector('.btn-toggle-progress');
    if (toggleProgressBtn) {
      toggleProgressBtn.addEventListener('click', () => {
        const progressContainer = div.querySelector('.task-progress-container');
        const toggleIcon = toggleProgressBtn.querySelector('.progress-toggle-icon');
        
        if (progressContainer.style.display === 'none') {
          progressContainer.style.display = 'block';
          toggleIcon.style.transform = 'rotate(180deg)';
        } else {
          progressContainer.style.display = 'none';
          toggleIcon.style.transform = 'rotate(0deg)';
        }
      });
    }

    // 进度记录显示
    const progressContainer = div.querySelector('.task-progress-container');
    if (progressContainer && task.progress && task.progress.length > 0) {
      for (const progress of task.progress) {
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
          <div class="progress-content">
            <div class="progress-text">${this.escapeHtml(progress.text)}</div>
            <div class="progress-time">${this.formatDate(progress.createdAt)}</div>
            ${progress.images && progress.images.length > 0 ? '<div class="progress-images-container"></div>' : ''}
          </div>
          <button class="btn-delete-progress" data-progress-id="${progress.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        
        // 显示进度图片
        if (progress.images && progress.images.length > 0) {
          const progressImagesContainer = progressItem.querySelector('.progress-images-container');
          for (const imageName of progress.images) {
            const imageData = await window.electronAPI.readImage(imageName);
            if (imageData.success) {
              const img = document.createElement('img');
              img.src = imageData.data;
              img.className = 'progress-image';
              img.addEventListener('click', () => {
                this.showImageViewer(imageData.data);
              });
              progressImagesContainer.appendChild(img);
            }
          }
        }
        
        const deleteProgressBtn = progressItem.querySelector('.btn-delete-progress');
        deleteProgressBtn.addEventListener('click', async () => {
          await this.deleteProgress(task.id, progress.id);
        });
        
        progressContainer.appendChild(progressItem);
      }
    }

    // 添加进度按钮事件
    const progressInput = div.querySelector('.progress-input');
    const addProgressBtn = div.querySelector('.btn-add-progress');
    const addProgressImageBtn = div.querySelector('.btn-add-progress-image');
    
    if (addProgressImageBtn) {
      addProgressImageBtn.addEventListener('click', async () => {
        await this.selectProgressImage(task.id);
      });
    }
    
    if (addProgressBtn) {
      addProgressBtn.addEventListener('click', async () => {
        if (progressInput.value.trim()) {
          await this.addProgress(task.id, progressInput.value);
          progressInput.value = '';
        }
      });
    }

    if (progressInput) {
      progressInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && progressInput.value.trim()) {
          await this.addProgress(task.id, progressInput.value);
          progressInput.value = '';
        }
      });
    }

    // 编辑模式下的图片管理
    if (isEditing) {
      const addTaskImageBtn = div.querySelector('.btn-add-task-image');
      const editImagesList = div.querySelector('.task-edit-images-list');
      
      addTaskImageBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectImage();
        if (result.success && result.fileName) {
          await this.addImageToTask(task.id, result.fileName);
        }
      });

      // 显示编辑模式下的图片（带删除按钮）
      if (task.images && task.images.length > 0) {
        for (let i = 0; i < task.images.length; i++) {
          const imageName = task.images[i];
          const imageData = await window.electronAPI.readImage(imageName);
          if (imageData.success) {
            const wrapper = document.createElement('div');
            wrapper.className = 'edit-image-wrapper';
            wrapper.innerHTML = `
              <img class="edit-task-image" src="${imageData.data}" />
              <button type="button" class="btn-remove-edit-image" data-index="${i}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            `;
            
            const removeBtn = wrapper.querySelector('.btn-remove-edit-image');
            removeBtn.addEventListener('click', async () => {
              await this.removeImageFromTask(task.id, i);
            });
            
            editImagesList.appendChild(wrapper);
          }
        }
      }
    }

    return div;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 子任务管理方法 ==========

  // 显示添加子任务弹窗
  showSubtaskDialog(taskId) {
    this.currentSubtaskTaskId = taskId;
    const dialog = document.getElementById('subtask-dialog');
    const input = document.getElementById('subtask-dialog-input');
    const priorityInputs = document.querySelectorAll('input[name="subtask-priority"]');
    
    // 重置表单
    input.value = '';
    priorityInputs.forEach(radio => {
      radio.checked = radio.value === '3'; // 默认选中
    });
    
    dialog.style.display = 'flex';
    setTimeout(() => input.focus(), 100);
  }

  // 关闭添加子任务弹窗
  closeSubtaskDialog() {
    const dialog = document.getElementById('subtask-dialog');
    dialog.style.display = 'none';
    this.currentSubtaskTaskId = null;
  }

  // 确认添加子任务
  async confirmAddSubtask() {
    const input = document.getElementById('subtask-dialog-input');
    const text = input.value.trim();
    
    if (!text) {
      this.showToast('请输入子任务内容');
      return;
    }
    
    const selectedPriority = document.querySelector('input[name="subtask-priority"]:checked');
    const weight = parseInt(selectedPriority.value);
    
    await this.addSubtask(this.currentSubtaskTaskId, text, weight);
    this.closeSubtaskDialog();
  }

  // 渲染子任务列表
  renderSubtasksInline(taskElement, task) {
    const subtasksList = taskElement.querySelector('.subtasks-list');
    
    if (subtasksList && task.subtasks && task.subtasks.length > 0) {
      subtasksList.innerHTML = '';
      
      task.subtasks.forEach(subtask => {
        // 获取权重标识
        const weightClass = subtask.weight === 5 ? 'high' : subtask.weight === 3 ? 'medium' : 'low';
        const weightText = subtask.weight === 5 ? '高' : subtask.weight === 3 ? '中' : '低';
        
        // 构建时间信息
        let timeInfo = '';
        if (subtask.completed && subtask.completedAt) {
          const duration = this.calculateTaskDuration(subtask.createdAt, subtask.completedAt);
          timeInfo = `
            <div class="subtask-time-info">
              <span class="subtask-time">完成于 ${this.formatDate(subtask.completedAt)}</span>
              ${duration ? `<span class="subtask-duration">耗时 ${duration}</span>` : ''}
            </div>
          `;
        } else if (subtask.createdAt) {
          timeInfo = `
            <div class="subtask-time-info">
              <span class="subtask-time">创建于 ${this.formatDate(subtask.createdAt)}</span>
            </div>
          `;
        }
        
        const item = document.createElement('div');
        item.className = 'subtask-item';
        item.innerHTML = `
          <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="subtask-weight subtask-weight-${weightClass}">${weightText}</span>
          <div class="subtask-content">
            <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${this.escapeHtml(subtask.text)}</span>
            ${timeInfo}
          </div>
          <button class="btn-delete-subtask">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;

        const checkbox = item.querySelector('.subtask-checkbox');
        checkbox.addEventListener('click', async () => {
          await this.toggleSubtask(task.id, subtask.id);
        });

        const deleteBtn = item.querySelector('.btn-delete-subtask');
        deleteBtn.addEventListener('click', async () => {
          await this.deleteSubtask(task.id, subtask.id);
        });

        subtasksList.appendChild(item);
      });
    }
  }

  // 获取子任务完成进度
  getSubtasksProgress(subtasks) {
    if (!subtasks || subtasks.length === 0) return '0/0';
    const completed = subtasks.filter(st => st.completed).length;
    return `${completed}/${subtasks.length}`;
  }

  // 计算任务完成百分比（基于权重）
  getTaskProgress(task) {
    if (task.subtasks && task.subtasks.length > 0) {
      // 有子任务：根据权重计算完成百分比
      const totalWeight = task.subtasks.reduce((sum, st) => sum + (st.weight || 3), 0);
      const completedWeight = task.subtasks
        .filter(st => st.completed)
        .reduce((sum, st) => sum + (st.weight || 3), 0);
      return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    } else {
      // 无子任务：根据主任务完成状态
      return task.completed ? 100 : 0;
    }
  }

  // 创建圆环进度条SVG
  createProgressCircle(progress, taskId) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    
    // 根据进度选择颜色
    let color = '#10b981'; // 绿色 (完成)
    if (progress === 0) {
      color = '#e5e7eb'; // 灰色 (未开始)
    } else if (progress < 100) {
      color = '#667eea'; // 蓝色 (进行中)
    }
    
    return `
      <div class="task-progress-circle-wrapper" data-task-id="${taskId}" title="点击添加子任务">
        <svg class="task-progress-circle" viewBox="0 0 44 44">
          <circle class="progress-circle-bg" cx="22" cy="22" r="${radius}"></circle>
          <circle class="progress-circle-fill" cx="22" cy="22" r="${radius}" 
            stroke="${color}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}">
          </circle>
          <text class="progress-circle-text" x="22" y="22" text-anchor="middle" dy="0.35em">
            ${progress}
          </text>
        </svg>
        <div class="progress-circle-add-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </div>
    `;
  }

  // 添加子任务
  async addSubtask(taskId, text, weight = 3) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && text.trim()) {
      if (!task.subtasks) {
        task.subtasks = [];
      }
      
      task.subtasks.push({
        id: Date.now(),
        text: text.trim(),
        weight: weight, // 重要程度：5(高), 3(中), 2(低)
        completed: false,
        createdAt: new Date().toISOString()
      });
      
      await this.saveTodos();
      await this.render();
    }
  }

  // 切换子任务完成状态
  async toggleSubtask(taskId, subtaskId) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && task.subtasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        subtask.completed = !subtask.completed;
        // 记录完成时间
        if (subtask.completed) {
          subtask.completedAt = new Date().toISOString();
        } else {
          // 取消完成时清除完成时间
          subtask.completedAt = null;
        }
        await this.saveTodos();
        await this.render();
      }
    }
  }

  // 删除子任务
  async deleteSubtask(taskId, subtaskId) {
    const task = this.todos.find(t => t.id === taskId);
    if (task && task.subtasks) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
      await this.saveTodos();
      await this.render();
    }
  }

  // ========== 项目管理方法 ==========

  // 渲染项目列表
  async renderProjects() {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    if (this.projects.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'project-empty-hint';
      emptyHint.textContent = '暂无项目，点击 + 创建';
      projectList.appendChild(emptyHint);
      return;
    }

    for (const project of this.projects) {
      const projectItem = document.createElement('div');
      projectItem.className = `project-item ${this.currentProjectId === project.id ? 'active' : ''}`;
      projectItem.dataset.projectId = project.id;

      // 计算项目任务数
      const projectTodos = this.todos.filter(t => t.projectId === project.id);
      const completedCount = projectTodos.filter(t => t.completed).length;
      const totalCount = projectTodos.length;

      projectItem.innerHTML = `
        <div class="project-color" style="background-color: ${project.color}"></div>
        <div class="project-info">
          <div class="project-name">${this.escapeHtml(project.name)}</div>
          <div class="project-count">${completedCount}/${totalCount}</div>
        </div>
        <button class="btn-delete-project" data-project-id="${project.id}" title="删除项目">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // 点击切换项目
      projectItem.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-delete-project')) {
          this.selectProject(project.id);
        }
      });

      // 删除项目按钮
      const deleteBtn = projectItem.querySelector('.btn-delete-project');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deleteProject(project.id);
      });

      projectList.appendChild(projectItem);
    }
  }

  // 显示添加项目对话框
  showAddProjectDialog() {
    // 创建或获取对话框
    let dialog = document.getElementById('add-project-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'add-project-dialog';
      dialog.className = 'project-dialog';
      dialog.innerHTML = `
        <div class="project-dialog-content">
          <div class="project-dialog-title">创建新项目</div>
          <form id="project-form">
            <input type="text" id="project-name-input" class="project-name-input" 
                   placeholder="输入项目名称..." required maxlength="30" />
            <div class="project-color-selector">
              <label class="project-color-label">选择颜色：</label>
              <div class="color-options">
                <div class="color-option" data-color="#667eea" style="background-color: #667eea"></div>
                <div class="color-option" data-color="#f56565" style="background-color: #f56565"></div>
                <div class="color-option" data-color="#ed8936" style="background-color: #ed8936"></div>
                <div class="color-option" data-color="#48bb78" style="background-color: #48bb78"></div>
                <div class="color-option" data-color="#38b2ac" style="background-color: #38b2ac"></div>
                <div class="color-option" data-color="#4299e1" style="background-color: #4299e1"></div>
                <div class="color-option" data-color="#9f7aea" style="background-color: #9f7aea"></div>
                <div class="color-option" data-color="#ed64a6" style="background-color: #ed64a6"></div>
              </div>
              <input type="hidden" id="project-color-input" value="#667eea" />
            </div>
            <div class="project-dialog-buttons">
              <button type="button" class="project-dialog-btn project-dialog-btn-cancel">取消</button>
              <button type="submit" class="project-dialog-btn project-dialog-btn-confirm">创建</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(dialog);

      // 颜色选择
      const colorOptions = dialog.querySelectorAll('.color-option');
      const colorInput = dialog.querySelector('#project-color-input');
      colorOptions.forEach(option => {
        option.addEventListener('click', () => {
          colorOptions.forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');
          colorInput.value = option.dataset.color;
        });
      });
      // 默认选择第一个颜色
      colorOptions[0].classList.add('selected');

      // 表单提交
      const form = dialog.querySelector('#project-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = dialog.querySelector('#project-name-input');
        const colorInput = dialog.querySelector('#project-color-input');
        await this.addProject(nameInput.value.trim(), colorInput.value);
        dialog.classList.remove('show');
        nameInput.value = '';
        colorOptions[0].classList.add('selected');
        colorInput.value = '#667eea';
      });

      // 取消按钮
      const cancelBtn = dialog.querySelector('.project-dialog-btn-cancel');
      cancelBtn.addEventListener('click', () => {
        dialog.classList.remove('show');
        form.reset();
      });

      // 点击背景关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.classList.remove('show');
          form.reset();
        }
      });
    }

    // 显示对话框
    dialog.classList.add('show');
    setTimeout(() => {
      const nameInput = dialog.querySelector('#project-name-input');
      nameInput.focus();
    }, 100);
  }

  // 添加项目
  async addProject(name, color) {
    if (!name) return;

    const project = {
      id: Date.now(),
      name: name,
      color: color,
      createdAt: new Date().toISOString()
    };

    this.projects.push(project);
    
    // 如果是第一个项目，自动选中
    if (this.projects.length === 1) {
      this.currentProjectId = project.id;
    }

    await this.saveProjects();
    await this.renderProjects();
    this.updateTaskInputState();
    this.showToast(`项目"${name}"创建成功`);
  }

  // 选择项目
  async selectProject(projectId) {
    this.currentProjectId = projectId;
    await this.saveProjects();
    await this.renderProjects();
    this.updateTaskInputState();
    await this.render();
    
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      this.showToast(`已切换到项目"${project.name}"`);
    }
  }

  // 删除项目
  async deleteProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    // 检查项目下是否有任务
    const projectTodos = this.todos.filter(t => t.projectId === projectId);
    let message = `确定要删除项目"${project.name}"吗？`;
    if (projectTodos.length > 0) {
      message = `项目"${project.name}"包含 ${projectTodos.length} 个任务，删除后任务也会被删除。确定要删除吗？`;
    }

    const confirmed = await this.showConfirmDialog(message);
    if (!confirmed) return;

    // 删除项目下的所有任务及其图片
    for (const task of projectTodos) {
      if (task.image) {
        await window.electronAPI.deleteImage(task.image);
      }
      if (task.images && task.images.length > 0) {
        for (const image of task.images) {
          await window.electronAPI.deleteImage(image);
        }
      }
      if (task.progress) {
        for (const progress of task.progress) {
          if (progress.images) {
            for (const image of progress.images) {
              await window.electronAPI.deleteImage(image);
            }
          }
        }
      }
    }
    this.todos = this.todos.filter(t => t.projectId !== projectId);

    // 删除项目
    this.projects = this.projects.filter(p => p.id !== projectId);

    // 如果删除的是当前项目，切换到第一个项目
    if (this.currentProjectId === projectId) {
      this.currentProjectId = this.projects.length > 0 ? this.projects[0].id : null;
    }

    await this.saveProjects();
    await this.saveTodos();
    await this.renderProjects();
    this.updateTaskInputState();
    await this.render();
    this.showToast(`项目"${project.name}"已删除`);
  }

  // 更新任务输入状态
  updateTaskInputState() {
    const noProjectHint = document.getElementById('no-project-hint');
    const currentProjectDisplay = document.getElementById('current-project-display');
    const currentProjectName = document.getElementById('current-project-name');
    const taskForm = document.getElementById('add-task-form');

    if (this.projects.length === 0 || !this.currentProjectId) {
      // 没有项目，禁用输入
      noProjectHint.style.display = 'flex';
      currentProjectDisplay.style.display = 'none';
      taskForm.style.opacity = '0.5';
      taskForm.style.pointerEvents = 'none';
    } else {
      // 有项目，启用输入
      noProjectHint.style.display = 'none';
      currentProjectDisplay.style.display = 'flex';
      taskForm.style.opacity = '1';
      taskForm.style.pointerEvents = 'auto';
      
      const project = this.projects.find(p => p.id === this.currentProjectId);
      if (project) {
        currentProjectName.textContent = project.name;
        currentProjectName.style.color = project.color;
      }
    }
  }

  // ========== 锁定/解锁功能 ==========

  // 锁定应用
  async lockApp() {
    const result = await window.electronAPI.hasPassword();
    if (!result.hasPassword) {
      // 未设置密码，显示设置密码对话框
      this.showPasswordDialog();
      return;
    }
    
    // 显示锁定界面
    const lockScreen = document.getElementById('lock-screen');
    lockScreen.style.display = 'flex';
    
    // 清空输入框
    const unlockInput = document.getElementById('unlock-password-input');
    unlockInput.value = '';
    
    // 隐藏错误提示
    const errorEl = document.getElementById('unlock-error');
    errorEl.style.display = 'none';
    
    // 聚焦到输入框
    setTimeout(() => unlockInput.focus(), 100);
  }

  // 解锁应用
  async unlockApp() {
    const unlockInput = document.getElementById('unlock-password-input');
    const errorEl = document.getElementById('unlock-error');
    const password = unlockInput.value;

    if (!password) {
      errorEl.textContent = '请输入密码';
      errorEl.style.display = 'block';
      return;
    }

    const result = await window.electronAPI.verifyPassword(password);
    if (result.success) {
      // 解锁成功
      const lockScreen = document.getElementById('lock-screen');
      lockScreen.style.display = 'none';
      unlockInput.value = '';
      errorEl.style.display = 'none';
      this.showToast('解锁成功');
    } else {
      // 密码错误
      errorEl.textContent = '密码错误，请重试';
      errorEl.style.display = 'block';
      unlockInput.value = '';
      unlockInput.focus();
    }
  }

  // 显示密码设置对话框
  showPasswordDialog() {
    let dialog = document.getElementById('password-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'password-dialog';
      dialog.className = 'password-dialog';
      dialog.innerHTML = `
        <div class="password-dialog-content">
          <div class="password-dialog-title">密码设置</div>
          <form id="password-form">
            <div class="password-form-group" id="old-password-group" style="display: none;">
              <label class="password-label">当前密码</label>
              <input type="password" id="old-password-input" class="password-input" 
                     placeholder="输入当前密码" autocomplete="off" />
            </div>
            <div class="password-form-group">
              <label class="password-label">新密码</label>
              <input type="password" id="new-password-input" class="password-input" 
                     placeholder="输入新密码（至少4位）" autocomplete="off" required minlength="4" />
            </div>
            <div class="password-form-group">
              <label class="password-label">确认密码</label>
              <input type="password" id="confirm-password-input" class="password-input" 
                     placeholder="再次输入新密码" autocomplete="off" required />
            </div>
            <div class="password-error" id="password-error" style="display: none;"></div>
            <div class="password-dialog-buttons">
              <button type="button" class="password-dialog-btn password-dialog-btn-cancel">取消</button>
              <button type="button" class="password-dialog-btn password-dialog-btn-clear" id="btn-clear-password">清除密码</button>
              <button type="submit" class="password-dialog-btn password-dialog-btn-confirm">确定</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(dialog);

      // 表单提交
      const form = dialog.querySelector('#password-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.setPassword();
      });

      // 取消按钮
      const cancelBtn = dialog.querySelector('.password-dialog-btn-cancel');
      cancelBtn.addEventListener('click', () => {
        dialog.classList.remove('show');
        form.reset();
      });

      // 清除密码按钮
      const clearBtn = dialog.querySelector('#btn-clear-password');
      clearBtn.addEventListener('click', async () => {
        await this.clearPassword();
      });

      // 点击背景关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.classList.remove('show');
          form.reset();
        }
      });
    }

    // 检查是否已设置密码
    window.electronAPI.hasPassword().then(result => {
      const oldPasswordGroup = dialog.querySelector('#old-password-group');
      const clearBtn = dialog.querySelector('#btn-clear-password');
      if (result.hasPassword) {
        oldPasswordGroup.style.display = 'block';
        dialog.querySelector('#old-password-input').required = true;
        clearBtn.style.display = 'inline-block';
      } else {
        oldPasswordGroup.style.display = 'none';
        dialog.querySelector('#old-password-input').required = false;
        clearBtn.style.display = 'none';
      }
    });

    // 显示对话框
    dialog.classList.add('show');
    dialog.querySelector('#password-error').style.display = 'none';
    setTimeout(() => {
      const firstInput = dialog.querySelector('input:not([style*="display: none"])');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  // 设置/修改密码
  async setPassword() {
    const dialog = document.getElementById('password-dialog');
    const oldPasswordInput = dialog.querySelector('#old-password-input');
    const newPasswordInput = dialog.querySelector('#new-password-input');
    const confirmPasswordInput = dialog.querySelector('#confirm-password-input');
    const errorEl = dialog.querySelector('#password-error');

    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // 验证
    if (newPassword.length < 4) {
      errorEl.textContent = '密码至少需要4位';
      errorEl.style.display = 'block';
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = '两次输入的密码不一致';
      errorEl.style.display = 'block';
      return;
    }

    // 检查是否已设置密码
    const hasPasswordResult = await window.electronAPI.hasPassword();
    let result;

    if (hasPasswordResult.hasPassword) {
      // 修改密码
      if (!oldPassword) {
        errorEl.textContent = '请输入当前密码';
        errorEl.style.display = 'block';
        return;
      }
      result = await window.electronAPI.changePassword(oldPassword, newPassword);
    } else {
      // 设置新密码
      result = await window.electronAPI.setPassword(newPassword);
    }

    if (result.success) {
      dialog.classList.remove('show');
      dialog.querySelector('#password-form').reset();
      this.showToast(hasPasswordResult.hasPassword ? '密码修改成功' : '密码设置成功');
    } else {
      errorEl.textContent = result.error || '操作失败';
      errorEl.style.display = 'block';
    }
  }

  // 清除密码
  async clearPassword() {
    const dialog = document.getElementById('password-dialog');
    const oldPasswordInput = dialog.querySelector('#old-password-input');
    const errorEl = dialog.querySelector('#password-error');
    const password = oldPasswordInput.value;

    if (!password) {
      errorEl.textContent = '请输入当前密码以清除密码保护';
      errorEl.style.display = 'block';
      return;
    }

    const result = await window.electronAPI.clearPassword(password);
    if (result.success) {
      dialog.classList.remove('show');
      dialog.querySelector('#password-form').reset();
      this.showToast('密码保护已清除');
    } else {
      errorEl.textContent = result.error || '清除失败';
      errorEl.style.display = 'block';
    }
  }

  // 显示数据路径设置对话框
  async showDataPathDialog() {
    const dialog = document.getElementById('data-path-dialog');
    const currentPathEl = document.getElementById('data-path-current');
    
    // 获取当前数据路径
    const result = await window.electronAPI.getDataPath();
    if (result.success) {
      currentPathEl.textContent = result.path;
      currentPathEl.title = result.path; // 鼠标悬停显示完整路径
    } else {
      currentPathEl.textContent = '获取失败';
    }
    
    dialog.style.display = 'flex';
    setTimeout(() => dialog.classList.add('show'), 10);
  }

  // 关闭数据路径设置对话框
  closeDataPathDialog() {
    const dialog = document.getElementById('data-path-dialog');
    dialog.classList.remove('show');
    setTimeout(() => dialog.style.display = 'none', 300);
  }

  // 选择并更改数据路径
  async selectAndChangeDataPath() {
    try {
      // 选择新路径
      const selectResult = await window.electronAPI.selectDataPath();
      
      if (selectResult.canceled || !selectResult.success) {
        return;
      }

      const newPath = selectResult.path;
      
      // 确认对话框
      const confirmed = await this.showConfirmDialog(
        `确定要将数据存储路径更改为：\n${newPath}\n\n所有数据（任务、项目、图片等）将自动迁移到新路径。`
      );
      
      if (!confirmed) {
        return;
      }

      // 显示加载提示
      this.showToast('正在迁移数据，请稍候...', 0);

      // 更改路径并迁移数据
      const changeResult = await window.electronAPI.changeDataPath(newPath);

      if (changeResult.success) {
        this.showToast(
          `数据路径更改成功！\n已迁移：${changeResult.migratedFiles.join(', ')}\n\n即将重新加载应用...`,
          3000
        );
        
        // 更新对话框中的路径显示
        const currentPathEl = document.getElementById('data-path-current');
        currentPathEl.textContent = changeResult.newPath;
        currentPathEl.title = changeResult.newPath;
        
        // 延迟重新加载数据
        setTimeout(async () => {
          await this.loadTodos();
          await this.loadProjects();
          await this.render();
          this.renderProjects();
          this.showToast('应用已重新加载');
        }, 3000);
      } else {
        this.showToast(`更改路径失败：${changeResult.error}`, 5000);
      }
    } catch (error) {
      console.error('更改数据路径失败:', error);
      this.showToast(`操作失败：${error.message}`, 5000);
    }
  }

  // 重置数据路径为默认
  async resetDataPath() {
    try {
      // 确认对话框
      const confirmed = await this.showConfirmDialog(
        '确定要将数据路径重置为默认位置吗？\n\n注意：数据不会自动迁移回默认位置，您需要手动管理数据。'
      );
      
      if (!confirmed) {
        return;
      }

      // 重置路径
      const result = await window.electronAPI.resetDataPath();

      if (result.success) {
        this.showToast('数据路径已重置为默认\n\n即将重新加载应用...', 3000);
        
        // 更新对话框中的路径显示
        const currentPathEl = document.getElementById('data-path-current');
        currentPathEl.textContent = result.path;
        currentPathEl.title = result.path;
        
        // 延迟重新加载数据
        setTimeout(async () => {
          await this.loadTodos();
          await this.loadProjects();
          await this.render();
          this.renderProjects();
          this.showToast('应用已重新加载');
        }, 3000);
      } else {
        this.showToast(`重置失败：${result.error}`, 5000);
      }
    } catch (error) {
      console.error('重置数据路径失败:', error);
      this.showToast(`操作失败：${error.message}`, 5000);
    }
  }
}

// 初始化应用
const app = new TodoApp();

