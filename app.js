// 任务管理应用
class TodoApp {
  constructor() {
    this.todos = [];
    this.currentFilter = 'all';
    this.currentPriorityFilter = 'all';
    this.editingTaskId = null;
    this.currentImage = null; // 当前选择的图片
    
    this.init();
  }

  async init() {
    // 加载任务数据
    await this.loadTodos();
    
    // 绑定事件
    this.bindEvents();
    
    // 绑定窗口控制事件
    this.bindWindowControls();
    
    // 监听模式变化
    this.listenModeChanges();
    
    // 设置默认日期为今天
    this.setDefaultDate();
    
    // 渲染任务列表
    this.render();
  }

  bindWindowControls() {
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
  }

  listenModeChanges() {
    // 监听迷你模式变化
    window.electronAPI.onModeChanged((isCompact) => {
      if (isCompact) {
        document.body.classList.add('compact-mode');
      } else {
        document.body.classList.remove('compact-mode');
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
  }

  setDefaultDate() {
    const dueDateInput = document.getElementById('due-date-input');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dueDateInput.value = `${year}-${month}-${day}`;
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
    addImageBtn.addEventListener('click', async () => {
      await this.selectImage();
    });

    // 移除图片按钮
    const removeImageBtn = document.getElementById('remove-image-btn');
    removeImageBtn.addEventListener('click', () => {
      this.removeCurrentImage();
    });
  }

  async selectImage() {
    try {
      const result = await window.electronAPI.selectImage();
      if (result.success && result.fileName) {
        this.currentImage = result.fileName;
        
        // 显示预览
        const previewContainer = document.getElementById('image-preview-container');
        const previewImg = document.getElementById('image-preview');
        
        const imageData = await window.electronAPI.readImage(result.fileName);
        if (imageData.success) {
          previewImg.src = imageData.data;
          previewContainer.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  }

  removeCurrentImage() {
    this.currentImage = null;
    const previewContainer = document.getElementById('image-preview-container');
    previewContainer.style.display = 'none';
  }

  async addTask() {
    const input = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const dueDateInput = document.getElementById('due-date-input');
    const text = input.value.trim();

    if (!text) return;

    const task = {
      id: Date.now(),
      text: text,
      completed: false,
      priority: prioritySelect.value,
      createdAt: new Date().toISOString(),
      dueDate: dueDateInput.value || null,
      image: this.currentImage || null
    };

    this.todos.unshift(task);
    input.value = '';
    prioritySelect.value = 'medium';
    
    // 重置日期为今天
    this.setDefaultDate();
    
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
      await this.saveTodos();
      await this.render();
    }
  }

  async deleteTask(id) {
    const task = this.todos.find(t => t.id === id);
    if (task && task.image) {
      // 删除图片文件
      await window.electronAPI.deleteImage(task.image);
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
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.dataset.taskId = task.id;
    
    if (this.editingTaskId === task.id) {
      div.classList.add('editing');
    }

    const priorityClass = `priority-${task.priority}`;

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

    div.innerHTML = `
      <div class="task-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="priority-indicator ${priorityClass}"></div>
      <div class="task-content">
        <div class="task-text">${this.escapeHtml(task.text)}</div>
        <input type="text" class="task-edit-input" value="${this.escapeHtml(task.text)}" />
        <div class="task-meta">
          <div class="task-time">${this.formatDate(task.createdAt)}</div>
          ${dueDateHtml}
        </div>
        ${task.image ? '<div class="task-image-container"></div>' : ''}
      </div>
      <div class="task-actions">
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
    if (task.image) {
      const imageContainer = div.querySelector('.task-image-container');
      try {
        const imageData = await window.electronAPI.readImage(task.image);
        if (imageData.success) {
          const img = document.createElement('img');
          img.src = imageData.data;
          img.className = 'task-image';
          img.addEventListener('click', () => {
            this.showImageViewer(imageData.data);
          });
          imageContainer.appendChild(img);
        }
      } catch (error) {
        console.error('加载图片失败:', error);
      }
    }

    // 绑定事件
    const checkbox = div.querySelector('.task-checkbox');
    checkbox.addEventListener('click', async () => await this.toggleTask(task.id));

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

    return div;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化应用
const app = new TodoApp();

