import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProjectStore } from './project'
import { formatDate, formatDueDate, getDueDateStatus, calculateTaskDuration } from '../utils/date'

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref([])
  const currentFilter = ref('all')
  const currentPriorityFilter = ref('all')
  const searchQuery = ref('')
  const editingTaskId = ref(null)
  const currentImages = ref([])
  const currentProgressImages = ref({}) // 每个任务ID对应一个图片数组
  const currentSubtaskTaskId = ref(null)
  
  // 获取 electronAPI
  const electronAPI = window.electronAPI
  
  // 计算属性
  const filteredTodos = computed(() => {
    const projectStore = useProjectStore()
    let filtered = [...todos.value]
    
    // 按项目筛选
    if (projectStore.currentProjectId) {
      filtered = filtered.filter(t => t.projectId === projectStore.currentProjectId)
    }
    
    // 按完成状态筛选
    if (currentFilter.value === 'active') {
      filtered = filtered.filter(t => !t.completed)
    } else if (currentFilter.value === 'completed') {
      filtered = filtered.filter(t => t.completed)
    }
    
    // 按优先级筛选
    if (currentPriorityFilter.value !== 'all') {
      filtered = filtered.filter(t => t.priority === currentPriorityFilter.value)
    }
    
    // 按搜索关键词筛选
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(t => t.text.toLowerCase().includes(query))
    }
    
    // 排序：置顶 > 完成状态 > 截止日期 > 创建时间
    filtered.sort((a, b) => {
      // 1. 置顶优先
      if (a.pinned !== b.pinned) {
        if(a.pinned === undefined || b.pinned === undefined) {
          if(a.pinned){
            return -1;
          }
          if(b.pinned){
            return 1;
          }
        }
      }

      // 2. 未完成的任务排在已完成前面
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      
      // 3. 按截止日期排序（倒序：最近的截止日期在前）
      const aHasDueDate = a.dueDate && a.dueDate !== null
      const bHasDueDate = b.dueDate && b.dueDate !== null
      
      if (aHasDueDate && bHasDueDate) {
        // 都有截止日期，按日期倒序（早的在前）
        return new Date(a.dueDate) - new Date(b.dueDate)
      } else if (aHasDueDate && !bHasDueDate) {
        // a 有截止日期，b 没有，a 排在前面
        return -1
      } else if (!aHasDueDate && bHasDueDate) {
        // b 有截止日期，a 没有，b 排在前面
        return 1
      }
      
      // 4. 都没有截止日期，按创建时间倒序
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    
    return filtered
  })
  
  const totalCount = computed(() => todos.value.length)
  const completedCount = computed(() => todos.value.filter(t => t.completed).length)
  
  // 今日统计
  const todayAddedCount = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todos.value.filter(t => {
      const createdDate = new Date(t.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      return createdDate.getTime() === today.getTime()
    }).length
  })
  
  const todayCompletedCount = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todos.value.filter(t => {
      if (!t.completed || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      completedDate.setHours(0, 0, 0, 0)
      return completedDate.getTime() === today.getTime()
    }).length
  })
  
  // 加载任务
  async function loadTodos() {
    try {
      todos.value = await electronAPI.loadTodos()
    } catch (error) {
      console.error('加载任务数据失败:', error)
      todos.value = []
    }
  }
  
  // 保存任务
  async function saveTodos() {
    try {
      // 将响应式对象转换为普通对象，避免 IPC 传递错误
      await electronAPI.saveTodos(JSON.parse(JSON.stringify(todos.value)))
    } catch (error) {
      console.error('保存任务数据失败:', error)
    }
  }
  
  // 添加任务
  async function addTask(text, priority, dueDate) {
    const projectStore = useProjectStore()
    
    if (!projectStore.currentProjectId) {
      return { success: false, error: '请先选择一个项目' }
    }
    
    if (!text.trim()) {
      return { success: false, error: '请输入任务内容' }
    }
    
    // 如果没有指定截止日期，默认设置为3天后
    let finalDueDate = dueDate
    if (!dueDate) {
      const threeDaysLater = new Date()
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      finalDueDate = threeDaysLater.toISOString().split('T')[0] // YYYY-MM-DD 格式
    }
    
    const task = {
      id: Date.now(),
      text: text.trim(),
      projectId: projectStore.currentProjectId,
      completed: false,
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      dueDate: finalDueDate,
      images: [...currentImages.value],
      progress: [],
      pinned: false,
      subtasks: []
    }
    
    todos.value.unshift(task)
    
    // 清空当前图片
    currentImages.value = []
    
    await saveTodos()
    return { success: true }
  }
  
  // 切换任务完成状态
  async function toggleTask(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      if (task.completed) {
        task.completedAt = new Date().toISOString()
      } else {
        task.completedAt = null
      }
      await saveTodos()
    }
  }
  
  // 切换任务置顶
  async function togglePinTask(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      task.pinned = !task.pinned
      await saveTodos()
    }
  }
  
  // 删除任务（包含图片）
  async function deleteTaskWithImages(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      // 删除任务的所有图片
      if (task.image) {
        await electronAPI.deleteImage(task.image)
      }
      if (task.images && task.images.length > 0) {
        for (const image of task.images) {
          await electronAPI.deleteImage(image)
        }
      }
      if (task.progress) {
        for (const progress of task.progress) {
          if (progress.images) {
            for (const image of progress.images) {
              await electronAPI.deleteImage(image)
            }
          }
        }
      }
    }
    todos.value = todos.value.filter(t => t.id !== id)
  }
  
  // 删除任务
  async function deleteTask(id) {
    await deleteTaskWithImages(id)
    await saveTodos()
  }
  
  // 编辑任务
  async function updateTask(id, updates) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      Object.assign(task, updates)
      await saveTodos()
    }
  }
  
  // 选择图片
  async function selectImage() {
    try {
      const result = await electronAPI.selectImage()
      if (result.success && result.fileName) {
        currentImages.value.push(result.fileName)
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      console.error('选择图片失败:', error)
      return { success: false }
    }
  }
  
  // 移除当前选择的图片
  function removeCurrentImage(index) {
    currentImages.value.splice(index, 1)
  }
  
  // 清空当前图片
  function clearCurrentImages() {
    currentImages.value = []
  }
  
  // 添加子任务
  async function addSubtask(taskId, text, weight = 3) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && text.trim()) {
      if (!task.subtasks) {
        task.subtasks = []
      }
      
      task.subtasks.push({
        id: Date.now(),
        text: text.trim(),
        weight,
        completed: false,
        createdAt: new Date().toISOString()
      })
      
      await saveTodos()
    }
  }
  
  // 切换子任务完成状态
  async function toggleSubtask(taskId, subtaskId) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.subtasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId)
      if (subtask) {
        // 如果子任务需要输入，检查是否已输入
        if (!subtask.completed && subtask.requiresInput) {
          if (!subtask.inputValue || subtask.inputValue.trim() === '') {
            return { success: false, message: '请先输入必填信息' }
          }
        }
        
        subtask.completed = !subtask.completed
        if (subtask.completed) {
          subtask.completedAt = new Date().toISOString()
        } else {
          subtask.completedAt = null
        }
        await saveTodos()
        return { success: true }
      }
    }
    return { success: false }
  }
  
  // 删除子任务
  async function deleteSubtask(taskId, subtaskId) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.subtasks) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId)
      await saveTodos()
    }
  }
  
  // 添加子任务评论
  // 子任务评论功能已移除
  
  // 获取任务进度百分比
  function getTaskProgress(task) {
    if (task.subtasks && task.subtasks.length > 0) {
      const totalWeight = task.subtasks.reduce((sum, st) => sum + (st.weight || 3), 0)
      const completedWeight = task.subtasks
        .filter(st => st.completed)
        .reduce((sum, st) => sum + (st.weight || 3), 0)
      return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
    } else {
      return task.completed ? 100 : 0
    }
  }
  
  // 添加进度记录
  async function addProgress(taskId, progressText) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && progressText.trim()) {
      if (!task.progress) {
        task.progress = []
      }
      
      const progressImages = currentProgressImages.value[taskId] || []
      
      task.progress.push({
        id: Date.now(),
        text: progressText.trim(),
        createdAt: new Date().toISOString(),
        images: [...progressImages]
      })
      
      // 清空当前任务的进度图片
      currentProgressImages.value[taskId] = []
      
      await saveTodos()
    }
  }
  
  // 删除进度记录
  async function deleteProgress(taskId, progressId) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.progress) {
      // 找到进度并删除其图片
      const progress = task.progress.find(p => p.id === progressId)
      if (progress && progress.images) {
        for (const image of progress.images) {
          await electronAPI.deleteImage(image)
        }
      }
      
      task.progress = task.progress.filter(p => p.id !== progressId)
      await saveTodos()
    }
  }
  
  return {
    // 状态
    todos,
    currentFilter,
    currentPriorityFilter,
    searchQuery,
    editingTaskId,
    currentImages,
    currentProgressImages,
    currentSubtaskTaskId,
    filteredTodos,
    totalCount,
    completedCount,
    todayAddedCount,
    todayCompletedCount,
    
    // 方法
    loadTodos,
    saveTodos,
    addTask,
    toggleTask,
    togglePinTask,
    deleteTask,
    deleteTaskWithImages,
    updateTask,
    selectImage,
    removeCurrentImage,
    clearCurrentImages,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    getTaskProgress,
    addProgress,
    deleteProgress
  }
})

