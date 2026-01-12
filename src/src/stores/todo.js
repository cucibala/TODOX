import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProjectStore } from './project'
import { useOrgStore } from './org'
import { formatDate, formatDueDate, getDueDateStatus, calculateTaskDuration } from '../utils/date'
import { generateId, generateSubId } from '../utils/tools'
import {
  listTasks,
  createTask as createTaskRemote,
  updateTask as updateTaskRemote,
  deleteTask as deleteTaskRemote,
  addSubtask as addSubtaskRemote,
  updateSubtask as updateSubtaskRemote,
  deleteSubtask as deleteSubtaskRemote,
  replaceSubtasks as replaceSubtasksRemote,
  addProgress as addProgressRemote,
  updateProgress as updateProgressRemote,
  deleteProgress as deleteProgressRemote
} from '../utils/server_api'
import { selectMedia, uploadMediaDataUrl, removeMedia } from '../utils/media'

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
  const orgStore = useOrgStore()
  let hasTodosListener = false

  function normalizeSubtask(subtask) {
    if (!subtask) return null
    return {
      ...subtask,
      id: String(subtask.id),
      order: subtask.order ?? subtask.orderIndex ?? 0,
      completed: Boolean(subtask.completed),
      requiresInput: Boolean(subtask.requiresInput)
    }
  }

  function normalizeTodo(todo) {
    if (!todo) return null
    const normalizedStatus = typeof todo.status === 'string' ? todo.status.toLowerCase() : todo.status
    const normalizedPriority = typeof todo.priority === 'string' ? todo.priority.toLowerCase() : todo.priority
    return {
      ...todo,
      id: String(todo.id),
      projectId: todo.projectId ?? null,
      pinned: Boolean(todo.pinned),
      completed: Boolean(todo.completed),
      status: normalizedStatus,
      priority: normalizedPriority,
      images: Array.isArray(todo.images) ? todo.images : [],
      progress: Array.isArray(todo.progress) ? todo.progress : [],
      subtasks: Array.isArray(todo.subtasks)
        ? todo.subtasks.map(normalizeSubtask).filter(Boolean)
        : []
    }
  }

  function toServerStatus(status) {
    return status ? String(status).toUpperCase() : 'TODO'
  }

  function toServerPriority(priority) {
    return priority ? String(priority).toUpperCase() : 'MEDIUM'
  }

  function hasOwn(source, key) {
    return Object.prototype.hasOwnProperty.call(source, key)
  }

  function buildTaskUpdatePayload(updates) {
    const payload = { updaterId: orgStore.memberId }
    if (hasOwn(updates, 'assigneeId')) payload.assigneeId = updates.assigneeId
    if (hasOwn(updates, 'projectId')) payload.projectId = updates.projectId
    if (hasOwn(updates, 'text')) payload.text = updates.text
    if (hasOwn(updates, 'completed')) payload.completed = updates.completed
    if (hasOwn(updates, 'pinned')) payload.pinned = updates.pinned
    if (hasOwn(updates, 'status')) payload.status = toServerStatus(updates.status)
    if (hasOwn(updates, 'priority')) payload.priority = toServerPriority(updates.priority)
    if (hasOwn(updates, 'dueDate')) payload.dueDate = updates.dueDate ?? ''
    if (hasOwn(updates, 'startedAt')) payload.startedAt = updates.startedAt ?? ''
    if (hasOwn(updates, 'completedAt')) payload.completedAt = updates.completedAt ?? ''
    if (hasOwn(updates, 'order')) payload.order = updates.order
    if (hasOwn(updates, 'images')) payload.images = updates.images
    return payload
  }

  function buildSubtaskPayload(updates) {
    const payload = { updaterId: orgStore.memberId }
    if (hasOwn(updates, 'text')) payload.text = updates.text
    if (hasOwn(updates, 'completed')) payload.completed = updates.completed
    if (hasOwn(updates, 'weight')) payload.weight = updates.weight
    if (hasOwn(updates, 'requiresInput')) payload.requiresInput = updates.requiresInput
    if (hasOwn(updates, 'inputValue')) payload.inputValue = updates.inputValue
    if (hasOwn(updates, 'order')) payload.order = updates.order
    if (hasOwn(updates, 'completedAt')) payload.completedAt = updates.completedAt ?? ''
    if (hasOwn(updates, 'images')) payload.images = updates.images
    return payload
  }

  function buildProgressPayload(updates) {
    const payload = { updaterId: orgStore.memberId }
    if (hasOwn(updates, 'text')) payload.text = updates.text
    if (hasOwn(updates, 'images')) payload.images = updates.images
    return payload
  }

  function applyTaskResponse(response) {
    const normalized = normalizeTodo(response)
    if (!normalized) return
    const task = todos.value.find(t => String(t.id) === String(normalized.id))
    if (task) {
      Object.assign(task, normalized)
      return
    }
    todos.value.unshift(normalized)
  }
  
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

    console.log(filtered);
    
    // 排序：置顶 > 完成状态 > 截止日期 > 创建时间
    filtered.sort((a, b) => {
      // 1. 置顶优先（将 undefined 统一处理为 false）
      const aPinned = Boolean(a.pinned)
      const bPinned = Boolean(b.pinned)
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1
      }

      // 2. 未完成的任务排在已完成前面（将 undefined 统一处理为 false）
      const aCompleted = a.completed === true
      const bCompleted = b.completed === true
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1
      }
      
      // 3. 按截止日期排序（倒序：晚到期的在前）
      const aHasDueDate = a.dueDate && a.dueDate !== null
      const bHasDueDate = b.dueDate && b.dueDate !== null
      
      if (aHasDueDate && bHasDueDate) {
        // 都有截止日期，按日期倒序（晚到期的在前）
        return new Date(b.dueDate) - new Date(a.dueDate)
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
  // 今日新增任务列表
  const todayAddedTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todos.value.filter(t => {
      const createdDate = new Date(t.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      return createdDate.getTime() === today.getTime()
    })
  })
  
  const todayAddedCount = computed(() => todayAddedTasks.value.length)
  
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
  
  // 今日完成的任务列表（所有今日完成的）
  const todayCompletedTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todos.value.filter(t => {
      if (!t.completed || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      completedDate.setHours(0, 0, 0, 0)
      return completedDate.getTime() === today.getTime()
    })
  })
  
  // 今日创建并今日完成的任务
  const todayTasksCompleted = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todayCompletedTasks.value.filter(t => {
      const createdDate = new Date(t.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      return createdDate.getTime() === today.getTime()
    })
  })
  
  // 遗留任务完成（之前创建今日完成）
  const legacyTasksCompleted = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return todayCompletedTasks.value.filter(t => {
      const createdDate = new Date(t.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      return createdDate.getTime() !== today.getTime()
    })
  })
  
  // 今日任务完成数量
  const todayTasksCompletedCount = computed(() => todayTasksCompleted.value.length)
  
  // 遗留任务完成数量
  const legacyTasksCompletedCount = computed(() => legacyTasksCompleted.value.length)
  
  // 即将到期任务（未完成且3天内到期）
  const upcomingTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(today.getDate() + 3)
    
    return todos.value.filter(t => {
      if (t.completed || !t.dueDate) return false
      const dueDate = new Date(t.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      // 在今天到3天后之间（包含今天）
      return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= threeDaysLater.getTime()
    })
  })
  
  // 即将到期任务数量
  const upcomingTasksCount = computed(() => upcomingTasks.value.length)
  
  // 已逾期任务（未完成且到期日期已过）
  const overdueTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return todos.value.filter(t => {
      if (t.completed || !t.dueDate) return false
      const dueDate = new Date(t.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      // 在今天之前
      return dueDate.getTime() < today.getTime()
    })
  })
  
  // 已逾期任务数量
  const overdueTasksCount = computed(() => overdueTasks.value.length)
  
  // 加载任务
  async function loadTodos() {
    try {
      if (orgStore.isServerMode) {
        if (!orgStore.hasSession) {
          todos.value = []
          return
        }
        const assigneeId = orgStore.isAdmin ? null : orgStore.memberId
        const loadedTodos = await listTasks(
          orgStore.serverBaseUrl,
          orgStore.orgId,
          orgStore.memberId,
          assigneeId
        )
        todos.value = (loadedTodos || []).map(normalizeTodo)
        return
      }

      const loadedTodos = await electronAPI.loadTodos()
      todos.value = loadedTodos.map(todo => ({
        ...todo,
        pinned: Boolean(todo.pinned)
      }))
      console.log(todos.value)
      // 加载后自动清理孤立任务
      await cleanOrphanedTasks()
    } catch (error) {
      console.error('加载任务数据失败:', error)
      todos.value = []
    }
  }
  
  // 清理孤立任务（项目已被删除的任务）
  async function cleanOrphanedTasks() {
    if (orgStore.isServerMode) return
    const projectStore = useProjectStore()
    const validProjectIds = projectStore.projects.map(p => p.id)
    
    // 查找孤立任务
    const orphanedTasks = todos.value.filter(task => 
      task.projectId && !validProjectIds.includes(task.projectId)
    )
    
    if (orphanedTasks.length > 0) {
      console.log(`检测到 ${orphanedTasks.length} 个孤立任务，正在清理...`)
      
      // 删除孤立任务及其图片（逐条删除）
      for (const task of orphanedTasks) {
        await deleteTask(task.id)
      }
      
      console.log(`已清理 ${orphanedTasks.length} 个孤立任务`)
    }
  }
  
  // 添加任务
  async function addTask(text, priority, dueDate, assigneeId = null) {
    const projectStore = useProjectStore()
    
    if (!projectStore.currentProjectId) {
      return { success: false, error: '请先选择一个项目' }
    }
    
    if (!text.trim()) {
      return { success: false, error: '请输入任务内容' }
    }
    
    const finalDueDate = dueDate || null
    
    if (orgStore.isServerMode) {
      if (!orgStore.hasSession) {
        return { success: false, error: '请先加入组织' }
      }
      if (!orgStore.isAdmin) {
        return { success: false, error: '只有管理员可以创建任务' }
      }
      const response = await createTaskRemote(orgStore.serverBaseUrl, {
        orgId: orgStore.orgId,
        creatorId: orgStore.memberId,
        assigneeId: assigneeId || null,
        projectId: projectStore.currentProjectId,
        text: text.trim(),
        completed: false,
        status: toServerStatus('todo'),
        priority: toServerPriority(priority || 'medium'),
        dueDate: finalDueDate || '',
        images: [...currentImages.value],
        subtasks: []
      })
      todos.value.unshift(normalizeTodo(response))
      currentImages.value = []
      return { success: true }
    }

    const task = {
      id: generateId(),
      text: text.trim(),
      projectId: projectStore.currentProjectId,
      completed: false,
      status: 'todo',
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      startedAt: null,
      dueDate: finalDueDate,
      images: [...currentImages.value],
      progress: [],
      pinned: false,
      subtasks: []
    }

    // 添加到本地状态
    todos.value.unshift(task)

    // 清空当前图片
    currentImages.value = []

    // 单条插入数据库
    await electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
    return { success: true }
  }
  
  // 切换任务完成状态
  async function toggleTask(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      if (task.completed) {
        task.completedAt = new Date().toISOString()
        task.startedAt = task.startedAt || task.completedAt
        task.status = 'done'
      } else {
        task.completedAt = null
        task.startedAt = task.startedAt || new Date().toISOString()
        task.status = 'doing'
      }
      const updatePayload = {
        completed: task.completed,
        completedAt: task.completedAt,
        status: task.status,
        startedAt: task.startedAt
      }
      if (orgStore.isServerMode) {
        const response = await updateTaskRemote(
          orgStore.serverBaseUrl,
          id,
          buildTaskUpdatePayload(updatePayload)
        )
        applyTaskResponse(response)
        return
      }
      // 单条更新数据库
      await electronAPI.updateTodo(id, updatePayload)
    }
  }

  if (!hasTodosListener && electronAPI?.onTodosChanged) {
    hasTodosListener = true
    electronAPI.onTodosChanged(() => {
      loadTodos()
    })
  }

  async function setTaskStatus(id, status) {
    const task = todos.value.find(t => t.id === id)
    if (!task) return

    const nextStatus = status || 'todo'
    const shouldComplete = nextStatus === 'done'
    const completedAt = shouldComplete ? (task.completedAt || new Date().toISOString()) : null
    let startedAt = task.startedAt
    if (nextStatus === 'doing') {
      startedAt = task.startedAt || new Date().toISOString()
      if (!task.dueDate) {
        const threeDaysLater = new Date()
        threeDaysLater.setDate(threeDaysLater.getDate() + 3)
        task.dueDate = threeDaysLater.toISOString().split('T')[0]
      }
    } else if (nextStatus === 'todo') {
      startedAt = null
    } else if (nextStatus === 'done' && !task.startedAt) {
      startedAt = completedAt
    }

    task.status = nextStatus
    task.completed = shouldComplete
    task.completedAt = completedAt
    task.startedAt = startedAt

    const updatePayload = {
      status: task.status,
      completed: task.completed,
      completedAt: task.completedAt,
      startedAt: task.startedAt
    }
    if (nextStatus === 'doing' && task.dueDate) {
      updatePayload.dueDate = task.dueDate
    }
    if (orgStore.isServerMode) {
      const response = await updateTaskRemote(
        orgStore.serverBaseUrl,
        id,
        buildTaskUpdatePayload(updatePayload)
      )
      applyTaskResponse(response)
      return
    }
    await electronAPI.updateTodo(id, updatePayload)
  }
  
  // 切换任务置顶
  async function togglePinTask(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      task.pinned = !task.pinned
      if (orgStore.isServerMode) {
        const response = await updateTaskRemote(
          orgStore.serverBaseUrl,
          id,
          buildTaskUpdatePayload({ pinned: task.pinned })
        )
        applyTaskResponse(response)
        return
      }
      // 单条更新数据库
      await electronAPI.updateTodo(id, { pinned: task.pinned })
    }
  }
  
  // 删除任务（包含图片）
  async function deleteTaskWithImages(id) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      // 删除任务的所有图片
      if (task.image) {
        await removeMedia(task.image)
      }
      if (task.images && task.images.length > 0) {
        for (const image of task.images) {
          await removeMedia(image)
        }
      }
      if (task.progress) {
        for (const progress of task.progress) {
          if (progress.images) {
            for (const image of progress.images) {
              await removeMedia(image)
            }
          }
        }
      }
      if (task.subtasks) {
        for (const subtask of task.subtasks) {
          if (subtask.images) {
            for (const image of subtask.images) {
              await removeMedia(image)
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
    if (orgStore.isServerMode) {
      await deleteTaskRemote(orgStore.serverBaseUrl, id, orgStore.memberId)
      return
    }
    // 单条删除数据库（级联删除子任务和进度）
    await electronAPI.deleteTodo(id)
  }
  
  // 编辑任务
  async function updateTask(id, updates) {
    const task = todos.value.find(t => t.id === id)
    if (task) {
      if (updates && (typeof updates.status === 'string' || typeof updates.completed === 'boolean')) {
        const hasStatus = typeof updates.status === 'string'
        const hasCompleted = typeof updates.completed === 'boolean'
        if (hasStatus) {
          const nextStatus = updates.status || 'todo'
          const shouldComplete = nextStatus === 'done'
          updates.completed = shouldComplete
          updates.completedAt = shouldComplete
            ? (task.completedAt || new Date().toISOString())
            : null
          if (nextStatus === 'doing') {
            updates.startedAt = task.startedAt || new Date().toISOString()
          } else if (nextStatus === 'todo') {
            updates.startedAt = null
          } else if (nextStatus === 'done' && !task.startedAt) {
            updates.startedAt = updates.completedAt
          }
        } else if (hasCompleted) {
          if (updates.completed) {
            updates.status = 'done'
            updates.completedAt = task.completedAt || new Date().toISOString()
            updates.startedAt = task.startedAt || updates.completedAt
          } else {
            updates.status = 'doing'
            updates.completedAt = null
            updates.startedAt = task.startedAt || new Date().toISOString()
          }
        }
      }
      Object.assign(task, updates)
      if (orgStore.isServerMode) {
        const response = await updateTaskRemote(
          orgStore.serverBaseUrl,
          id,
          buildTaskUpdatePayload(updates)
        )
        applyTaskResponse(response)
        return
      }
      // 单条更新数据库
      await electronAPI.updateTodo(id, JSON.parse(JSON.stringify(updates)))
    }
  }
  
  // 选择图片
  async function selectImage() {
    try {
      const result = await selectMedia()
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
  async function addSubtask(taskId, text, weight = 3, requiresInput = false, images = []) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && text.trim()) {
      if (!task.subtasks) {
        task.subtasks = []
      }

      if (orgStore.isServerMode) {
        const response = await addSubtaskRemote(
          orgStore.serverBaseUrl,
          taskId,
          orgStore.memberId,
          {
            text: text.trim(),
            weight,
            completed: false,
            requiresInput,
            inputValue: '',
            images: images || []
          }
        )
        if (response) {
          task.subtasks.unshift(normalizeSubtask(response))
        }
        return
      }

      const subtask = {
        id: generateId(),
        text: text.trim(),
        weight,
        completed: false,
        requiresInput,
        inputValue: '',
        images: images || [],
        createdAt: new Date().toISOString()
      }

      // 使用 unshift 将新子任务添加到数组开头
      task.subtasks.unshift(subtask)

      // 单条插入数据库
      await electronAPI.addSubtask(taskId, JSON.parse(JSON.stringify(subtask)))
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

        const updatePayload = {
          completed: subtask.completed,
          completedAt: subtask.completedAt
        }
        if (orgStore.isServerMode) {
          const response = await updateSubtaskRemote(
            orgStore.serverBaseUrl,
            subtaskId,
            buildSubtaskPayload(updatePayload)
          )
          if (response) {
            Object.assign(subtask, normalizeSubtask(response))
          }
          return { success: true }
        }

        // 单条更新数据库
        await electronAPI.updateSubtask(subtaskId, updatePayload)
        
        return { success: true }
      }
    }
    return { success: false }
  }
  
  // 删除子任务
  async function deleteSubtask(taskId, subtaskId) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.subtasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId)
      
      // 删除子任务图片
      if (subtask && subtask.images) {
        for (const image of subtask.images) {
          await removeMedia(image)
        }
      }
      
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId)

      if (orgStore.isServerMode) {
        await deleteSubtaskRemote(orgStore.serverBaseUrl, subtaskId, orgStore.memberId)
        return
      }
      
      // 单条删除数据库
      await electronAPI.deleteSubtask(subtaskId)
    }
  }
  
  // 子任务重新排序
  async function reorderSubtasks(taskId, orderedIds) {
    const task = todos.value.find(t => t.id === taskId)
    if (!task || !task.subtasks || task.subtasks.length === 0) {
      return
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return
    }

    const subtaskMap = new Map(task.subtasks.map(subtask => [subtask.id, subtask]))
    const orderedSet = new Set(orderedIds)
    const reordered = orderedIds
      .map(id => subtaskMap.get(id))
      .filter(Boolean)

    for (const subtask of task.subtasks) {
      if (!orderedSet.has(subtask.id)) {
        reordered.push(subtask)
      }
    }

    task.subtasks = reordered

    // 更新每个子任务的 order 字段
    for (let i = 0; i < task.subtasks.length; i++) {
      task.subtasks[i].order = i
      if (orgStore.isServerMode) {
        continue
      }
      await electronAPI.updateSubtask(task.subtasks[i].id, { order: i })
    }

    if (orgStore.isServerMode) {
      const payload = {
        updaterId: orgStore.memberId,
        subtasks: task.subtasks.map((subtask, index) => ({
          id: subtask.id,
          text: subtask.text,
          completed: subtask.completed,
          weight: subtask.weight,
          requiresInput: subtask.requiresInput,
          inputValue: subtask.inputValue,
          order: index,
          completedAt: subtask.completedAt || '',
          images: subtask.images || []
        }))
      }
      const response = await replaceSubtasksRemote(orgStore.serverBaseUrl, taskId, payload)
      if (Array.isArray(response)) {
        task.subtasks = response.map(normalizeSubtask)
      }
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
      
      const record = {
        id: generateId(),
        text: progressText.trim(),
        createdAt: new Date().toISOString(),
        images: [...progressImages]
      }
      if (orgStore.isServerMode) {
        const response = await addProgressRemote(orgStore.serverBaseUrl, taskId, {
          updaterId: orgStore.memberId,
          text: progressText.trim(),
          images: [...progressImages]
        })
        if (response) {
          task.progress.push({ ...response, id: String(response.id) })
        }
        currentProgressImages.value[taskId] = []
        return
      }

      task.progress.push(record)

      // 清空当前任务的进度图片
      currentProgressImages.value[taskId] = []

      // 单条插入数据库
      await electronAPI.addProgress(taskId, JSON.parse(JSON.stringify(record)))
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
          await removeMedia(image)
        }
      }
      
      task.progress = task.progress.filter(p => p.id !== progressId)

      if (orgStore.isServerMode) {
        await deleteProgressRemote(orgStore.serverBaseUrl, progressId, orgStore.memberId)
        return
      }
      
      // 单条删除数据库
      await electronAPI.deleteProgress(progressId)
    }
  }

  async function updateProgress(taskId, progressId, newText) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.progress) {
      const progress = task.progress.find(p => p.id === progressId)
      if (progress) {
        progress.text = newText
        if (orgStore.isServerMode) {
          const response = await updateProgressRemote(
            orgStore.serverBaseUrl,
            progressId,
            buildProgressPayload({ text: newText })
          )
          if (response) {
            progress.text = response.text
          }
          return
        }
        
        // 单条更新数据库
        await electronAPI.updateProgress(progressId, { text: newText })
      }
    }
  }
  
  // 更新子任务信息
  async function updateSubtask(taskId, subtaskId, updates) {
    const task = todos.value.find(t => t.id === taskId)
    if (task && task.subtasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId)
      if (subtask) {
        Object.assign(subtask, updates)
        if (orgStore.isServerMode) {
          const response = await updateSubtaskRemote(
            orgStore.serverBaseUrl,
            subtaskId,
            buildSubtaskPayload(updates)
          )
          if (response) {
            Object.assign(subtask, normalizeSubtask(response))
          }
          return
        }
        // 单条更新数据库
        await electronAPI.updateSubtask(subtaskId, JSON.parse(JSON.stringify(updates)))
      }
    }
  }

  async function addTaskObject(task, options = {}) {
    if (!task || !task.text || !task.projectId) {
      return null
    }
    const position = options.position || 'end'
    const afterTaskId = options.afterTaskId

    if (orgStore.isServerMode) {
      const response = await createTaskRemote(orgStore.serverBaseUrl, {
        orgId: orgStore.orgId,
        creatorId: orgStore.memberId,
        assigneeId: task.assigneeId || null,
        projectId: task.projectId,
        text: task.text,
        completed: Boolean(task.completed),
        status: toServerStatus(task.status || (task.completed ? 'done' : 'todo')),
        priority: toServerPriority(task.priority || 'medium'),
        dueDate: task.dueDate || '',
        images: task.images || [],
        subtasks: (task.subtasks || []).map((subtask, index) => ({
          id: subtask.id,
          text: subtask.text,
          completed: Boolean(subtask.completed),
          weight: subtask.weight || 3,
          requiresInput: Boolean(subtask.requiresInput),
          inputValue: subtask.inputValue || '',
          order: subtask.order ?? index,
          completedAt: subtask.completedAt || '',
          createdAt: subtask.createdAt || ''
        }))
      })
      const normalized = normalizeTodo(response)
      if (!normalized) return null
      if (position === 'beginning') {
        todos.value.unshift(normalized)
      } else if (position === 'after' && afterTaskId) {
        const afterIndex = todos.value.findIndex(t => t.id === afterTaskId)
        if (afterIndex !== -1) {
          todos.value.splice(afterIndex + 1, 0, normalized)
        } else {
          todos.value.push(normalized)
        }
      } else {
        todos.value.push(normalized)
      }
      return normalized
    }

    const newTask = { ...task }
    if (!newTask.id) {
      newTask.id = generateId()
    }
    if (!newTask.createdAt) {
      newTask.createdAt = new Date().toISOString()
    }
    if (position === 'beginning') {
      todos.value.unshift(newTask)
    } else if (position === 'after' && afterTaskId) {
      const afterIndex = todos.value.findIndex(t => t.id === afterTaskId)
      if (afterIndex !== -1) {
        todos.value.splice(afterIndex + 1, 0, newTask)
      } else {
        todos.value.push(newTask)
      }
    } else {
      todos.value.push(newTask)
    }
    await electronAPI.addTodo(JSON.parse(JSON.stringify(newTask)))
    return newTask
  }

  async function addTasksBatch(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return []
    const added = []
    if (orgStore.isServerMode) {
      for (const task of tasks) {
        const result = await addTaskObject(task)
        if (result) added.push(result)
      }
      return added
    }
    if (window.electronAPI.addTodosBatch) {
      await electronAPI.addTodosBatch(JSON.parse(JSON.stringify(tasks)))
      todos.value.push(...tasks)
      return tasks
    }
    for (const task of tasks) {
      await addTaskObject(task)
    }
    return tasks
  }

  async function replaceSubtasksForTask(taskId, subtasks) {
    const task = todos.value.find(t => t.id === taskId)
    if (!task) return []

    task.subtasks = Array.isArray(subtasks) ? subtasks : []
    if (orgStore.isServerMode) {
      const payload = {
        updaterId: orgStore.memberId,
        subtasks: task.subtasks.map((subtask, index) => ({
          id: subtask.id,
          text: subtask.text,
          completed: Boolean(subtask.completed),
          weight: subtask.weight || 3,
          requiresInput: Boolean(subtask.requiresInput),
          inputValue: subtask.inputValue || '',
          order: subtask.order ?? index,
          completedAt: subtask.completedAt || '',
          createdAt: subtask.createdAt || ''
        }))
      }
      const response = await replaceSubtasksRemote(orgStore.serverBaseUrl, taskId, payload)
      if (Array.isArray(response)) {
        task.subtasks = response.map(normalizeSubtask)
      }
      return task.subtasks
    }

    await electronAPI.replaceSubtasks(taskId, JSON.parse(JSON.stringify(task.subtasks)))
    return task.subtasks
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
    todayAddedTasks,
    todayAddedCount,
    todayCompletedCount,
    todayCompletedTasks,
    todayTasksCompleted,
    legacyTasksCompleted,
    todayTasksCompletedCount,
    legacyTasksCompletedCount,
    upcomingTasks,
    upcomingTasksCount,
    overdueTasks,
    overdueTasksCount,
    
    // 方法
    loadTodos,
    cleanOrphanedTasks,
    addTask,
    toggleTask,
    setTaskStatus,
    togglePinTask,
    deleteTask,
    deleteTaskWithImages,
    updateTask,
    selectImage,
    removeCurrentImage,
    clearCurrentImages,
    addSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    getTaskProgress,
    addProgress,
    deleteProgress,
    updateProgress,
    addTaskObject,
    addTasksBatch,
    replaceSubtasksForTask
  }
})

