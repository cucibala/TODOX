<template>
  <section class="content-area board-page">
    <div class="board-toolbar">
      <div class="toolbar-left">
        <button
          class="btn-toggle-sidebar"
          @click="toggleSidebar"
          :title="appStore.isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索任务、标签或成员..."
          />
        </div>
      </div>

      <div class="toolbar-right">
        <div class="status-filter-buttons priority-chip-group" role="group" aria-label="筛选任务状态">
          <button
            class="status-filter-btn"
            :class="{ active: currentStatusFilter === 'all' }"
            @click="currentStatusFilter = 'all'"
            title="显示全部状态"
          >
            全部
          </button>
          <button
            class="status-filter-btn status-todo"
            :class="{ active: currentStatusFilter === 'todo' }"
            @click="currentStatusFilter = 'todo'"
            title="只显示待办"
          >
            <span class="status-dot status-todo"></span>
            待办
          </button>
          <button
            class="status-filter-btn status-doing"
            :class="{ active: currentStatusFilter === 'doing' }"
            @click="currentStatusFilter = 'doing'"
            title="只显示进行中"
          >
            <span class="status-dot status-doing"></span>
            进行中
          </button>
          <button
            class="status-filter-btn status-done"
            :class="{ active: currentStatusFilter === 'done' }"
            @click="currentStatusFilter = 'done'"
            title="只显示已完成"
          >
            <span class="status-dot status-done"></span>
            已完成
          </button>
        </div>
        <div class="priority-filter-buttons priority-chip-group">
          <button
            class="priority-filter-btn"
            :class="{ active: currentPriorityFilter === 'all' }"
            @click="todoStore.currentPriorityFilter = 'all'"
            title="全部优先级"
          >
            全部
          </button>
          <button
            class="priority-filter-btn priority-high"
            :class="{ active: currentPriorityFilter === 'high' }"
            @click="todoStore.currentPriorityFilter = 'high'"
            title="高优先级"
          >
            <span class="priority-dot priority-high"></span>
            高
          </button>
          <button
            class="priority-filter-btn priority-medium"
            :class="{ active: currentPriorityFilter === 'medium' }"
            @click="todoStore.currentPriorityFilter = 'medium'"
            title="中优先级"
          >
            <span class="priority-dot priority-medium"></span>
            中
          </button>
          <button
            class="priority-filter-btn priority-low"
            :class="{ active: currentPriorityFilter === 'low' }"
            @click="todoStore.currentPriorityFilter = 'low'"
            title="低优先级"
          >
            <span class="priority-dot priority-low"></span>
            低
          </button>
        </div>

        <button
          class="btn-stats"
          @click="handleGenerateSummary"
          :disabled="isGeneratingSummary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 17 9 11 13 15 21 7"></polyline>
            <polyline points="14 7 21 7 21 14"></polyline>
          </svg>
          统计
        </button>
      </div>
    </div>

    <div class="board-body">
      <div class="board-main">
        <div class="kanban-board" :class="{ single: currentStatusFilter !== 'all' }">
          <div
            class="kanban-column todo"
            v-if="showTodoColumn"
            :class="{ 'drag-over': activeDropColumn === 'todo' }"
            @dragover.prevent="handleDragOver('todo')"
            @dragleave="activeDropColumn = ''"
            @drop="handleDrop($event, 'todo')"
          >
            <div class="column-header">
              <div class="column-title">待办</div>
              <div class="column-meta">
                <span class="column-count">{{ todoTodos.length }}</span>
                <button class="column-add" :disabled="!canCreateTask" @click="focusAddTask" title="添加任务">+</button>
              </div>
            </div>
            <div class="column-body">
              <TaskItem v-for="task in todoTodos" :key="task.id" :task="task" />
              <div v-if="todoTodos.length === 0" class="column-empty">暂无任务</div>
            </div>
          </div>

          <div
            class="kanban-column doing"
            v-if="showDoingColumn"
            :class="{ 'drag-over': activeDropColumn === 'doing' }"
            @dragover.prevent="handleDragOver('doing')"
            @dragleave="activeDropColumn = ''"
            @drop="handleDrop($event, 'doing')"
          >
            <div class="column-header">
              <div class="column-title">进行中</div>
              <div class="column-meta">
                <span class="column-count">{{ doingTodos.length }}</span>
                <button class="column-add" :disabled="!canCreateTask" @click="focusAddTask" title="添加任务">+</button>
              </div>
            </div>
            <div class="column-body">
              <TaskItem v-for="task in doingTodos" :key="task.id" :task="task" />
              <div v-if="doingTodos.length === 0" class="column-empty">暂无任务</div>
            </div>
          </div>

          <div
            class="kanban-column done"
            v-if="showDoneColumn"
            :class="{ 'drag-over': activeDropColumn === 'done' }"
            @dragover.prevent="handleDragOver('done')"
            @dragleave="activeDropColumn = ''"
            @drop="handleDrop($event, 'done')"
          >
            <div class="column-header">
              <div class="column-title">已完成</div>
              <div class="column-meta">
                <span class="column-count">{{ doneTodos.length }}</span>
                <button class="column-add" :disabled="!canCreateTask" @click="focusAddTask" title="添加任务">+</button>
              </div>
            </div>
            <div class="column-body">
              <TaskItem v-for="task in doneTodos" :key="task.id" :task="task" />
              <div v-if="doneTodos.length === 0" class="column-empty">暂无任务</div>
            </div>
          </div>
        </div>
      </div>

      <aside class="board-stats">
        <div class="stats-panel">
          <div class="stats-panel-header">
            <div class="stats-title">统计概览</div>
            <div class="stats-subtitle">实时任务进度追踪</div>
            <div class="stats-project">
              <span class="stats-project-label">当前项目</span>
              <span class="stats-project-name">
                <span class="stats-project-dot" :style="{ backgroundColor: currentProject?.color || '#cbd5f5' }"></span>
                {{ currentProject?.name || '未选择' }}
              </span>
            </div>
          </div>
          <div class="stats-ring" :style="{ '--progress': completionPercentage }">
            <div class="stats-ring-inner">
              <div class="stats-ring-value">{{ completionPercentage }}%</div>
              <div class="stats-ring-label">完成率</div>
            </div>
          </div>
          <div class="stats-summary">
            <div class="stats-summary-row">
              <span>已完成</span>
              <strong>{{ currentCompletedCount }}</strong>
            </div>
            <div class="stats-summary-row">
              <span>总任务</span>
              <strong>{{ currentTotalCount }}</strong>
            </div>
          </div>
          <div class="stats-cards">
            <div class="stats-card-item total">
              <div class="stats-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div class="stats-card-info">
                <span>总任务</span>
                <strong>{{ currentTotalCount }}</strong>
              </div>
            </div>
            <div class="stats-card-item done">
              <div class="stats-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="stats-card-info">
                <span>已完成</span>
                <strong>{{ currentCompletedCount }}</strong>
              </div>
            </div>
            <div class="stats-card-item doing">
              <div class="stats-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <div class="stats-card-info">
                <span>进行中</span>
                <strong>{{ currentInProgressCount }}</strong>
              </div>
            </div>
            <div class="stats-card-item todo">
              <div class="stats-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                </svg>
              </div>
              <div class="stats-card-info">
                <span>待办</span>
                <strong>{{ currentTodoCount }}</strong>
              </div>
            </div>
          </div>
          <div v-if="upcomingCount > 0 || overdueCount > 0" class="stats-alerts">
            <div v-if="overdueCount > 0" class="stats-alert overdue">
              有 {{ overdueCount }} 个任务已经到期
            </div>
            <div v-if="upcomingCount > 0" class="stats-alert upcoming">
              有 {{ upcomingCount }} 个任务即将到期
            </div>
          </div>
        </div>
      </aside>
    </div>

    <button class="floating-add-btn" :disabled="!canCreateTask" @click="openAddTaskModal" title="添加任务">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>

    <div v-if="showAddTaskModal" class="add-task-modal" @click.self="closeAddTaskModal">
      <div class="add-task-dialog">
        <div class="add-task-header">
          <div class="add-task-title">添加任务</div>
          <button class="add-task-close" @click="closeAddTaskModal" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="add-task-body">
          <div v-if="!hasProjects || !currentProjectId" class="no-project-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>请先创建一个项目，然后再添加任务</span>
          </div>
          <form
            @submit.prevent="handleAddTask"
            :style="{
              opacity: (!hasProjects || !currentProjectId) ? '0.5' : '1',
              pointerEvents: (!hasProjects || !currentProjectId) ? 'none' : 'auto'
            }"
          >
            <div class="input-group">
              <div class="input-row">
                <textarea
                  v-model="newTaskText"
                  class="task-input task-textarea"
                  placeholder="添加新任务（支持粘贴图片/视频）..."
                  autocomplete="off"
                  required
                  rows="1"
                  @input="adjustTextareaHeight"
                  @keydown.ctrl.enter="handleAddTask"
                  @paste="handlePaste"
                  ref="taskInputRef"
                ></textarea>
              </div>
              <div class="input-row input-row-actions">
                <input
                  v-model="newTaskDueDate"
                  type="date"
                  class="date-input"
                  title="截止日期（可选）"
                />
                <select
                  v-if="isServerMode && isAdmin"
                  v-model="selectedAssigneeId"
                  class="assignee-select"
                >
                  <option value="">未分配</option>
                  <option v-for="member in members" :key="member.id" :value="String(member.id)">
                    {{ member.name }}（{{ member.role === 'ADMIN' ? '管理员' : '成员' }}）
                  </option>
                </select>
                <div class="priority-chip-group priority-select-chips" role="group" aria-label="选择任务优先级">
                  <button
                    type="button"
                    class="priority-chip priority-high"
                    :class="{ active: newTaskPriority === 'high' }"
                    @click="newTaskPriority = 'high'"
                    title="高优先级"
                  >
                    <span class="priority-dot priority-high"></span>
                    高
                  </button>
                  <button
                    type="button"
                    class="priority-chip priority-medium"
                    :class="{ active: newTaskPriority === 'medium' }"
                    @click="newTaskPriority = 'medium'"
                    title="中优先级"
                  >
                    <span class="priority-dot priority-medium"></span>
                    中
                  </button>
                  <button
                    type="button"
                    class="priority-chip priority-low"
                    :class="{ active: newTaskPriority === 'low' }"
                    @click="newTaskPriority = 'low'"
                    title="低优先级"
                  >
                    <span class="priority-dot priority-low"></span>
                    低
                  </button>
                </div>
                <button type="button" class="btn-image" @click="handleSelectImage" title="添加图片（可添加多张）">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </button>
                <button type="submit" class="btn-add" :disabled="!canCreateTask">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加
                </button>
              </div>
            </div>
            <div v-if="currentImages.length > 0" class="image-preview-container">
              <div
                v-for="(fileName, index) in currentImages"
                :key="index"
                class="image-preview-wrapper"
              >
                <ImagePreview :fileName="fileName" />
                <button
                  type="button"
                  class="btn-remove-image"
                  @click="todoStore.removeCurrentImage(index)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'
import { useOrgStore } from '../stores/org'
import TaskItem from '../components/TaskItem.vue'
import ImagePreview from '../components/ImagePreview.vue'
import { generateDailySummary } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'
import { uploadMediaDataUrl } from '../utils/media'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()
const orgStore = useOrgStore()

const { todos, searchQuery, filteredTodos, currentImages, currentPriorityFilter } = storeToRefs(todoStore)
const { hasProjects, currentProjectId, currentProject } = storeToRefs(projectStore)
const { dataMode, isServerMode, isAdmin, hasSession, members, serverBaseUrl, orgAccount, memberName, memberRole, orgId } = storeToRefs(orgStore)

const newTaskText = ref('')
const newTaskDueDate = ref('')
const newTaskPriority = ref('medium')
const isGeneratingSummary = ref(false)
const taskInputRef = ref(null)
const showAddTaskModal = ref(false)
const currentStatusFilter = ref('all')
const selectedAssigneeId = ref('')

const electronAPI = window.electronAPI

function isTaskInProgress(task) {
  const hasProgress = Array.isArray(task.progress) && task.progress.length > 0
  const hasCompletedSubtask = Array.isArray(task.subtasks) && task.subtasks.some(st => st.completed)
  return hasProgress || hasCompletedSubtask
}

function getTaskStatus(task) {
  if (task.status) return task.status
  if (task.completed) return 'done'
  return isTaskInProgress(task) ? 'doing' : 'todo'
}

const todoTodos = computed(() => {
  return filteredTodos.value.filter(task => getTaskStatus(task) === 'todo')
})

const doingTodos = computed(() => {
  return filteredTodos.value.filter(task => getTaskStatus(task) === 'doing')
})

const doneTodos = computed(() => {
  return filteredTodos.value.filter(task => getTaskStatus(task) === 'done')
})

const showTodoColumn = computed(() => {
  return currentStatusFilter.value === 'all' || currentStatusFilter.value === 'todo'
})

const showDoingColumn = computed(() => {
  return currentStatusFilter.value === 'all' || currentStatusFilter.value === 'doing'
})

const showDoneColumn = computed(() => {
  return currentStatusFilter.value === 'all' || currentStatusFilter.value === 'done'
})

const currentProjectTodos = computed(() => {
  if (!currentProjectId.value) return []
  return todos.value.filter(task => task.projectId === currentProjectId.value)
})

const currentTotalCount = computed(() => currentProjectTodos.value.length)
const currentCompletedCount = computed(() => currentProjectTodos.value.filter(task => task.completed).length)
const currentInProgressCount = computed(() => {
  return currentProjectTodos.value.filter(task => getTaskStatus(task) === 'doing').length
})
const currentTodoCount = computed(() => {
  return currentProjectTodos.value.filter(task => getTaskStatus(task) === 'todo').length
})

const upcomingCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(today.getDate() + 3)
  return currentProjectTodos.value.filter(task => {
    if (getTaskStatus(task) === 'done') return false
    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= threeDaysLater.getTime()
  }).length
})

const overdueCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return currentProjectTodos.value.filter(task => {
    if (getTaskStatus(task) === 'done') return false
    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() < today.getTime()
  }).length
})

const completionPercentage = computed(() => {
  if (currentTotalCount.value === 0) return 0
  return Math.round((currentCompletedCount.value / currentTotalCount.value) * 100)
})

const canCreateTask = computed(() => !isServerMode.value || isAdmin.value)

const activeDropColumn = ref('')

function handleDrop(event, status) {
  event.preventDefault()
  const taskId = event.dataTransfer?.getData('text/plain')
  if (!taskId) return
  todoStore.setTaskStatus(taskId, status)
  activeDropColumn.value = ''
}

function handleDragOver(status) {
  activeDropColumn.value = status
}

// 切换侧边栏展开/收起
function toggleSidebar() {
  appStore.isSidebarCollapsed = !appStore.isSidebarCollapsed
}

// 自动调整 textarea 高度
function adjustTextareaHeight(event) {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

async function handleAddTask() {
  if (!canCreateTask.value) {
    appStore.toast('只有管理员可以创建任务')
    return
  }
  const assigneeId = selectedAssigneeId.value ? Number(selectedAssigneeId.value) : null
  const result = await todoStore.addTask(
    newTaskText.value,
    newTaskPriority.value,
    newTaskDueDate.value,
    assigneeId
  )

  if (result.success) {
    newTaskText.value = ''
    newTaskDueDate.value = ''
    newTaskPriority.value = 'medium'
    selectedAssigneeId.value = ''
    // 重置 textarea 高度
    const textarea = document.querySelector('.task-textarea')
    if (textarea) {
      textarea.style.height = 'auto'
    }
    showAddTaskModal.value = false
  } else if (result.error) {
    appStore.toast(result.error)
  }
}

async function handleSelectImage() {
  await todoStore.selectImage()
}

// 处理粘贴事件（支持多文件和视频）
async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  let hasMediaFile = false
  const filesToProcess = []

  // 收集所有图片和视频文件
  for (const item of items) {
    if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
      hasMediaFile = true
      const file = item.getAsFile()
      if (file) {
        filesToProcess.push({
          file,
          isVideo: item.type.indexOf('video') !== -1
        })
      }
    }
  }

  if (hasMediaFile) {
    event.preventDefault()
  }

  // 处理所有文件
  let successCount = 0
  for (const { file, isVideo } of filesToProcess) {
    try {
      // 读取文件为 base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 保存文件到应用数据目录或服务端
      const result = await uploadMediaDataUrl(base64Data)
      if (result.success) {
        // 添加到当前图片列表
        todoStore.currentImages.push(result.fileName)
        successCount++
      }
    } catch (error) {
      console.error('处理文件失败:', error)
    }
  }

  if (successCount > 0) {
    if (successCount === 1) {
      const isVideo = filesToProcess[0].isVideo
      appStore.toast(isVideo ? '视频已粘贴' : '图片已粘贴')
    } else {
      appStore.toast(`已粘贴 ${successCount} 个文件`)
    }
  } else if (filesToProcess.length > 0) {
    appStore.toast('粘贴文件失败')
  }
}

// 生成每日任务总结
async function handleGenerateSummary() {
  try {
    // 获取今日任务
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const todayTasks = todoStore.todos.filter(task => {
      if (!task.createdAt) return false
      const taskDate = new Date(task.createdAt)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate.getTime() === todayTimestamp
    })

    if (todayTasks.length === 0) {
      appStore.toast('今日暂无任务，无法生成总结')
      return
    }

    // 转换为纯 JavaScript 对象
    const plainTasks = todayTasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      priority: task.priority,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      dueDate: task.dueDate || null,
      subtasks: task.subtasks || []
    }))

    // 自动选择已配置的模型（优先 DeepSeek，然后豆包）
    let summary = null
    let modelUsed = ''

    // 1. 尝试使用 DeepSeek
    try {
      const hasDeepSeekResult = await electronAPI.hasDeepSeekKey()
      if (hasDeepSeekResult && hasDeepSeekResult.hasKey) {
        const deepSeekKeyResult = await electronAPI.getDeepSeekKey()
        if (deepSeekKeyResult && deepSeekKeyResult.success && deepSeekKeyResult.key) {
          isGeneratingSummary.value = true
          appStore.toast('正在使用 DeepSeek 生成总结...')
          summary = await generateDailySummary(plainTasks, deepSeekKeyResult.key)
          modelUsed = 'DeepSeek'
        }
      }
    } catch (error) {
      console.error('DeepSeek 检查或生成失败，尝试豆包:', error)
    }

    // 2. 如果 DeepSeek 失败或未配置,尝试使用豆包
    if (!summary) {
      try {
        const doubaoConfigResult = await electronAPI.getDoubaoConfig()
        if (doubaoConfigResult && doubaoConfigResult.success && doubaoConfigResult.key) {
          isGeneratingSummary.value = true
          appStore.toast('正在使用豆包生成总结...')
          const doubaoClient = new DoubaoClient(
            doubaoConfigResult.key,
            doubaoConfigResult.endpoint,
            doubaoConfigResult.model
          )
          summary = await doubaoClient.generateDailySummary(plainTasks)
          modelUsed = '豆包'
        }
      } catch (error) {
        console.error('豆包生成失败:', error)
        throw new Error('豆包 API 调用失败：' + error.message)
      }
    }

    // 3. 如果都没有配置，提示用户
    if (!summary) {
      appStore.toast('请先在设置中配置 DeepSeek 或豆包 API')
      return
    }

    appStore.aiSummaryContent = summary
    appStore.showAISummaryDialog = true
    appStore.toast(`总结生成成功（使用 ${modelUsed}）`)
  } catch (error) {
    console.error('生成总结失败:', error)
    appStore.toast('生成总结失败：' + error.message)
  } finally {
    isGeneratingSummary.value = false
  }
}

function focusAddTask() {
  if (!canCreateTask.value) {
    appStore.toast('只有管理员可以创建任务')
    return
  }
  taskInputRef.value?.focus()
}

async function openAddTaskModal() {
  if (!canCreateTask.value) {
    appStore.toast('只有管理员可以创建任务')
    return
  }
  showAddTaskModal.value = true
  await nextTick()
  taskInputRef.value?.focus()
}

function closeAddTaskModal() {
  showAddTaskModal.value = false
}

watch(() => dataMode.value, async () => {
  await projectStore.loadProjects()
  await todoStore.loadTodos()
  if (isServerMode.value && hasSession.value) {
    await orgStore.loadMembers()
  }
})

watch(() => hasSession.value, async (value) => {
  if (isServerMode.value && value) {
    await orgStore.loadMembers()
  }
})
</script>

