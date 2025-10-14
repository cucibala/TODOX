// 任务管理应用
class TodoApp {
  constructor() {
    this.todos = [];
    this.currentFilter = 'all';
    this.currentPriorityFilter = 'all';
    this.editingTaskId = null;
    
    this.init();
  }

  async init() {
    // 加载任务数据
    await this.loadTodos();
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染任务列表
    this.render();
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
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTask();
    });

    // 搜索框
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTasks(e.target.value);
    });

    // 筛选按钮
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });

    // 优先级筛选按钮
    const priorityButtons = document.querySelectorAll('.priority-filter-btn');
    priorityButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        priorityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPriorityFilter = btn.dataset.priority;
        this.render();
      });
    });
  }

  addTask() {
    const input = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const text = input.value.trim();

    if (!text) return;

    const task = {
      id: Date.now(),
      text: text,
      completed: false,
      priority: prioritySelect.value,
      createdAt: new Date().toISOString()
    };

    this.todos.unshift(task);
    input.value = '';
    prioritySelect.value = 'medium';

    this.saveTodos();
    this.render();
  }

  toggleTask(id) {
    const task = this.todos.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveTodos();
      this.render();
    }
  }

  deleteTask(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
    this.render();
  }

  startEditTask(id) {
    this.editingTaskId = id;
    this.render();
    
    // 聚焦到编辑输入框
    setTimeout(() => {
      const input = document.querySelector(`[data-task-id="${id}"] .task-edit-input`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  saveEditTask(id, newText) {
    const task = this.todos.find(t => t.id === id);
    if (task && newText.trim()) {
      task.text = newText.trim();
      this.editingTaskId = null;
      this.saveTodos();
      this.render();
    } else {
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingTaskId = null;
    this.render();
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

  render() {
    const taskList = document.getElementById('task-list');
    const filteredTodos = this.filterTasks();

    taskList.innerHTML = '';

    filteredTodos.forEach(task => {
      const taskItem = this.createTaskElement(task);
      taskList.appendChild(taskItem);
    });

    this.updateStats();
    this.updateEmptyState();
  }

  createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.dataset.taskId = task.id;
    
    if (this.editingTaskId === task.id) {
      div.classList.add('editing');
    }

    const priorityClass = `priority-${task.priority}`;

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
        <div class="task-time">${this.formatDate(task.createdAt)}</div>
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

    // 绑定事件
    const checkbox = div.querySelector('.task-checkbox');
    checkbox.addEventListener('click', () => this.toggleTask(task.id));

    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => {
      if (confirm('确定要删除这个任务吗?')) {
        this.deleteTask(task.id);
      }
    });

    const editBtn = div.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => {
      if (this.editingTaskId === task.id) {
        const input = div.querySelector('.task-edit-input');
        this.saveEditTask(task.id, input.value);
      } else {
        this.startEditTask(task.id);
      }
    });

    // 编辑输入框事件
    const editInput = div.querySelector('.task-edit-input');
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveEditTask(task.id, editInput.value);
      } else if (e.key === 'Escape') {
        this.cancelEdit();
      }
    });

    editInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.editingTaskId === task.id) {
          this.saveEditTask(task.id, editInput.value);
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

