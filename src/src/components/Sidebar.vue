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
      <!-- 环形进度条 - 总任务完成情况 -->
      <div class="circular-progress-container">
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
          <div class="stats-progress-label">完成率</div>
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div class="stats-data">
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-label">总任务</div>
            <div class="stat-value">{{ totalCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">已完成</div>
            <div class="stat-value success">{{ completedCount }}</div>
          </div>
        </div>
        
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
        </div>
        
        <!-- 到期提醒 -->
        <div class="due-date-alerts">
          <!-- 已逾期任务 -->
          <div v-if="overdueTasksCount > 0" class="alert-section overdue">
            <div class="alert-header" @click="toggleOverdueExpand">
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
              <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="alert-label">已逾期</span>
              <span class="alert-count">{{ overdueTasksCount }}</span>
            </div>
            <div v-if="showOverdueTasks" class="task-list">
              <div 
                v-for="task in overdueTasks" 
                :key="task.id" 
                class="task-item-mini alert-task"
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
          
          <!-- 即将到期任务 -->
          <div v-if="upcomingTasksCount > 0" class="alert-section upcoming">
            <div class="alert-header" @click="toggleUpcomingExpand">
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
              <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span class="alert-label">临期提醒</span>
              <span class="alert-count">{{ upcomingTasksCount }}</span>
            </div>
            <div v-if="showUpcomingTasks" class="task-list">
              <div 
                v-for="task in upcomingTasks" 
                :key="task.id" 
                class="task-item-mini alert-task"
                :title="task.text"
                @click="scrollToTask(task.id)"
              >
                <svg class="task-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
</script>

