<template>
  <aside class="sidebar">
    <!-- 项目管理部分 -->
    <div class="project-section">
      <div class="section-header">
        <h3 class="section-title">项目</h3>
        <div class="project-header-actions">
          <button 
            class="btn-import-project" 
            @click="handleImportProject" 
            title="导入项目"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button 
            class="btn-add-project" 
            @click="appStore.showProjectDialog = true" 
            title="创建项目"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="project-list">
        <div v-if="!hasProjects" class="project-empty-hint">
          暂无项目，点击 + 创建
        </div>
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item"
          :class="{ active: currentProjectId === project.id }"
          @click="projectStore.selectProject(project.id)"
        >
          <div class="project-color" :style="{ backgroundColor: project.color }"></div>
          <div class="project-info">
            <div class="project-header">
              <div class="project-name">{{ project.name }}</div>
              <div class="project-count">
                {{ getProjectStats(project.id).completed }}/{{ getProjectStats(project.id).total }}
              </div>
            </div>
            <div class="project-progress-bar">
              <div 
                class="project-progress-fill" 
                :style="{ 
                  width: getProjectProgress(project.id) + '%',
                  backgroundColor: project.color 
                }"
              ></div>
            </div>
          </div>
          <div class="project-actions">
            <button 
              class="btn-export-project" 
              @click.stop="handleExportProject(project.id)" 
              title="导出项目"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
            <button 
              class="btn-delete-project" 
              @click.stop="projectStore.deleteProject(project.id)" 
              title="删除项目"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计区域 -->
    <div class="stats-section">
      <!-- 双环形进度条 -->
      <div class="dual-progress-container">
        <!-- 总任务完成情况 -->
        <div class="circular-progress-container total">
          <svg class="circular-progress" viewBox="0 0 120 120">
            <circle class="stats-progress-bg" cx="60" cy="60" r="50" />
            <circle 
              class="stats-progress-bar" 
              cx="60" 
              cy="60" 
              r="50" 
              :style="{ strokeDashoffset: circleOffset }"
            />
          </svg>
          <div class="stats-progress-text">
            <div class="stats-progress-value">{{ completionPercentage }}%</div>
            <div class="stats-progress-label">{{ completedCount }}/{{ totalCount }}</div>
          </div>
        </div>
        
        <!-- 今日新增完成进度 -->
        <div 
          class="circular-progress-container today clickable"
          @click="handleGenerateSummary"
          :class="{ generating: isGeneratingSummary }"
          title="点击生成AI总结"
        >
          <svg class="circular-progress" viewBox="0 0 120 120">
            <circle class="stats-progress-bg" cx="60" cy="60" r="50" />
            <circle 
              class="stats-progress-bar today" 
              cx="60" 
              cy="60" 
              r="50" 
              :style="{ strokeDashoffset: todayCircleOffset }"
            />
          </svg>
          <div class="stats-progress-text">
            <div v-if="!isGeneratingSummary">
              <div class="stats-progress-value">{{ todayTasksCompletionPercentage }}%</div>
              <div class="stats-progress-label today">{{ todayStatusText }}</div>
            </div>
            <div v-else class="generating-indicator">
              <svg class="loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span class="generating-text">生成中</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI 总结显示 -->
      <div v-if="dailySummary" class="daily-summary-container">
        <div class="summary-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <h3>今日任务总结</h3>
          <button class="btn-close-summary" @click="dailySummary = ''" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="summary-content">
          {{ dailySummary }}
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div class="stats-data">
        <!-- 今日统计 - 进度条 -->
        <div class="daily-stats">
          <!-- 今日新增 - 可展开 -->
          <div class="daily-stat-item expandable">
            <div class="daily-stat-header" @click="toggleAddedExpand">
              <span class="daily-stat-label">
                今日新增
                <svg 
                  class="expand-icon" 
                  :class="{ expanded: showAddedDetails }"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
              <span class="daily-stat-value">{{ todayAddedCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill added" 
                :style="{ width: todayAddedPercentage + '%' }"
              ></div>
            </div>
            
            <!-- 展开的今日新增任务列表 -->
            <div v-if="showAddedDetails" class="completed-details">
              <div class="task-list">
                <div 
                  v-for="task in todayAddedTasks" 
                  :key="task.id" 
                  class="task-item-mini"
                  :class="{ completed: task.completed }"
                  :title="task.text"
                  @click="scrollToTask(task.id)"
                >
                  <svg v-if="task.completed" class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <svg v-else class="task-circle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  <span class="task-text">{{ task.text }}</span>
                </div>
                <div v-if="todayAddedCount === 0" class="empty-hint">今日暂无新增任务</div>
              </div>
            </div>
          </div>
          
          <!-- 今日完成总览 - 可展开 -->
          <div class="daily-stat-item expandable">
            <div class="daily-stat-header" @click="toggleCompletedExpand">
              <span class="daily-stat-label">
                今日完成
                <svg 
                  class="expand-icon" 
                  :class="{ expanded: showCompletedDetails }"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
              <span class="daily-stat-value">{{ todayCompletedCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill completed" 
                :style="{ width: todayCompletedPercentage + '%' }"
              ></div>
            </div>
            
            <!-- 展开的详细统计 -->
            <div v-if="showCompletedDetails" class="completed-details">
              <!-- 今日任务完成 -->
              <div class="detail-section">
                <div class="detail-header" @click="toggleTodayTasksExpand">
                  <svg 
                    class="expand-icon small" 
                    :class="{ expanded: showTodayTasks }"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <span class="detail-label">完成今日任务</span>
                  <span class="detail-count">{{ todayTasksCompletedCount }}</span>
                </div>
                <div v-if="showTodayTasks" class="task-list">
                  <div 
                    v-for="task in todayTasksCompleted" 
                    :key="task.id" 
                    class="task-item-mini"
                    :title="task.text"
                    @click="scrollToTask(task.id)"
                  >
                    <svg class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span class="task-text">{{ task.text }}</span>
                  </div>
                  <div v-if="todayTasksCompletedCount === 0" class="empty-hint">暂无完成任务</div>
                </div>
              </div>
              
              <!-- 遗留任务完成 -->
              <div class="detail-section">
                <div class="detail-header" @click="toggleLegacyTasksExpand">
                  <svg 
                    class="expand-icon small" 
                    :class="{ expanded: showLegacyTasks }"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <span class="detail-label">完成遗留任务</span>
                  <span class="detail-count">{{ legacyTasksCompletedCount }}</span>
                </div>
                <div v-if="showLegacyTasks" class="task-list">
                  <div 
                    v-for="task in legacyTasksCompleted" 
                    :key="task.id" 
                    class="task-item-mini"
                    :title="task.text"
                    @click="scrollToTask(task.id)"
                  >
                    <svg class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span class="task-text">{{ task.text }}</span>
                  </div>
                  <div v-if="legacyTasksCompletedCount === 0" class="empty-hint">暂无完成任务</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 临期提醒 - 可展开 -->
          <div v-if="upcomingTasksCount > 0" class="daily-stat-item expandable">
            <div class="daily-stat-header" @click="toggleUpcomingExpand">
              <span class="daily-stat-label">
                临期提醒
                <svg 
                  class="expand-icon" 
                  :class="{ expanded: showUpcomingTasks }"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
              <span class="daily-stat-value upcoming">{{ upcomingTasksCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill upcoming" 
                :style="{ width: upcomingPercentage + '%' }"
              ></div>
            </div>
            
            <!-- 展开的临期任务列表 -->
            <div v-if="showUpcomingTasks" class="completed-details">
              <div class="task-list">
                <div 
                  v-for="task in upcomingTasks" 
                  :key="task.id" 
                  class="task-item-mini"
                  :title="task.text"
                  @click="scrollToTask(task.id)"
                >
                  <svg class="task-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <div class="task-info">
                    <span class="task-text">{{ task.text }}</span>
                    <span class="task-due-info upcoming">{{ formatDueDate(task.dueDate) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 已逾期 - 可展开 -->
          <div v-if="overdueTasksCount > 0" class="daily-stat-item expandable">
            <div class="daily-stat-header" @click="toggleOverdueExpand">
              <span class="daily-stat-label">
                已逾期
                <svg 
                  class="expand-icon" 
                  :class="{ expanded: showOverdueTasks }"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
              <span class="daily-stat-value overdue">{{ overdueTasksCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill overdue" 
                :style="{ width: overduePercentage + '%' }"
              ></div>
            </div>
            
            <!-- 展开的逾期任务列表 -->
            <div v-if="showOverdueTasks" class="completed-details">
              <div class="task-list">
                <div 
                  v-for="task in overdueTasks" 
                  :key="task.id" 
                  class="task-item-mini"
                  :title="task.text"
                  @click="scrollToTask(task.id)"
                >
                  <svg class="task-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div class="task-info">
                    <span class="task-text">{{ task.text }}</span>
                    <span class="task-due-info overdue">{{ formatDueDate(task.dueDate) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useProjectStore } from '../stores/project'
import { useTodoStore } from '../stores/todo'
import { formatDueDate } from '../utils/date'
import { generateDailySummary } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'

const electronAPI = window.electronAPI

const appStore = useAppStore()
const projectStore = useProjectStore()
const todoStore = useTodoStore()

const { projects, currentProjectId, hasProjects } = storeToRefs(projectStore)
const { 
  todos,
  totalCount, 
  completedCount, 
  todayAddedTasks,
  todayAddedCount, 
  todayCompletedCount,
  todayTasksCompleted,
  legacyTasksCompleted,
  todayTasksCompletedCount,
  legacyTasksCompletedCount,
  upcomingTasks,
  upcomingTasksCount,
  overdueTasks,
  overdueTasksCount
} = storeToRefs(todoStore)

// 展开/收起状态
const showAddedDetails = ref(false)
const showCompletedDetails = ref(false)
const showTodayTasks = ref(false)
const showLegacyTasks = ref(false)
const showUpcomingTasks = ref(false)
const showOverdueTasks = ref(false)

// AI 总结状态
const dailySummary = ref('')
const isGeneratingSummary = ref(false)

// 计算完成百分比
const completionPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

// 环形进度条的偏移量
const circleOffset = computed(() => {
  const circumference = 2 * Math.PI * 50 // r=50
  const progress = completionPercentage.value / 100
  return circumference * (1 - progress)
})

// 今日新增任务完成百分比
const todayTasksCompletionPercentage = computed(() => {
  if (todayAddedCount.value === 0) return 0
  const completedToday = todayAddedTasks.value.filter(t => t.completed).length
  return Math.round((completedToday / todayAddedCount.value) * 100)
})

// 今日任务完成进度条偏移量
const todayCircleOffset = computed(() => {
  const circumference = 2 * Math.PI * 50 // r=50
  const progress = todayTasksCompletionPercentage.value / 100
  return circumference * (1 - progress)
})

// 今日任务完成状态文字
const todayStatusText = computed(() => {
  const percentage = todayTasksCompletionPercentage.value
  
  if (todayAddedCount.value === 0) {
    return '暂无任务'
  }
  
  if (percentage === 100) {
    return '圆满完成'
  } else if (percentage >= 90) {
    return '即将完成'
  } else if (percentage >= 70) {
    return '进展良好'
  } else if (percentage >= 50) {
    return '稳步推进'
  } else if (percentage >= 30) {
    return '继续加油'
  } else if (percentage > 0) {
    return '刚刚开始'
  } else {
    return '尚未开始'
  }
})

// 今日新增任务百分比（相对于总任务数，最大100%）
const todayAddedPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  const percentage = (todayAddedCount.value / totalCount.value) * 100
  return Math.min(percentage, 100)
})

// 今日完成任务百分比（相对于今日新增，如果今日新增为0则相对于总任务）
const todayCompletedPercentage = computed(() => {
  if (todayCompletedCount.value === 0) return 0
  const base = todayAddedCount.value > 0 ? todayAddedCount.value : totalCount.value
  if (base === 0) return 0
  const percentage = (todayCompletedCount.value / base) * 100
  return Math.min(percentage, 100)
})

// 临期任务百分比（相对于总任务数）
const upcomingPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  const percentage = (upcomingTasksCount.value / totalCount.value) * 100
  return Math.min(percentage, 100)
})

// 逾期任务百分比（相对于总任务数）
const overduePercentage = computed(() => {
  if (totalCount.value === 0) return 0
  const percentage = (overdueTasksCount.value / totalCount.value) * 100
  return Math.min(percentage, 100)
})

function getProjectStats(projectId) {
  return projectStore.getProjectStats(projectId)
}

function getProjectProgress(projectId) {
  const stats = projectStore.getProjectStats(projectId)
  if (stats.total === 0) return 0
  return Math.round((stats.completed / stats.total) * 100)
}

// 导出项目
async function handleExportProject(projectId) {
  try {
    await projectStore.exportProject(projectId)
  } catch (error) {
    console.error('导出项目失败:', error)
  }
}

// 导入项目
async function handleImportProject() {
  try {
    await projectStore.importProject()
  } catch (error) {
    console.error('导入项目失败:', error)
  }
}

// 切换今日新增展开/收起
function toggleAddedExpand() {
  showAddedDetails.value = !showAddedDetails.value
}

// 切换完成任务详情展开/收起
function toggleCompletedExpand() {
  showCompletedDetails.value = !showCompletedDetails.value
}

// 切换今日任务列表展开/收起
function toggleTodayTasksExpand() {
  showTodayTasks.value = !showTodayTasks.value
}

// 切换遗留任务列表展开/收起
function toggleLegacyTasksExpand() {
  showLegacyTasks.value = !showLegacyTasks.value
}

// 切换即将到期任务展开/收起
function toggleUpcomingExpand() {
  showUpcomingTasks.value = !showUpcomingTasks.value
}

// 切换已逾期任务展开/收起
function toggleOverdueExpand() {
  showOverdueTasks.value = !showOverdueTasks.value
}

// 滚动到指定任务
async function scrollToTask(taskId) {
  // 先找到任务对象
  const task = todos.value.find(t => t.id === taskId)
  if (!task) return
  
  // 如果任务不在当前项目中，需要切换项目
  if (task.projectId !== currentProjectId.value) {
    projectStore.selectProject(task.projectId)
    // 等待 DOM 更新完成
    await nextTick()
    // 再等待一小段时间确保渲染完成
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  // 查找对应的任务元素
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
  if (taskElement) {
    taskElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    })
    // 添加高亮效果
    taskElement.classList.add('task-highlight')
    setTimeout(() => {
      taskElement.classList.remove('task-highlight')
    }, 2000)
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

    // 2. 如果 DeepSeek 失败或未配置，尝试使用豆包
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

    dailySummary.value = summary
    appStore.toast(`总结生成成功（使用 ${modelUsed}）`)
  } catch (error) {
    console.error('生成总结失败:', error)
    appStore.toast('生成总结失败：' + error.message)
  } finally {
    isGeneratingSummary.value = false
  }
}
</script>

