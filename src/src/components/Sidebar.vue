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
          <div class="daily-stat-item">
            <div class="daily-stat-header">
              <span class="daily-stat-label">今日新增</span>
              <span class="daily-stat-value">{{ todayAddedCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill added" 
                :style="{ width: todayAddedPercentage + '%' }"
              ></div>
            </div>
          </div>
          
          <div class="daily-stat-item">
            <div class="daily-stat-header">
              <span class="daily-stat-label">今日完成</span>
              <span class="daily-stat-value">{{ todayCompletedCount }}</span>
            </div>
            <div class="daily-progress-bar">
              <div 
                class="daily-progress-fill completed" 
                :style="{ width: todayCompletedPercentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useProjectStore } from '../stores/project'
import { useTodoStore } from '../stores/todo'

const appStore = useAppStore()
const projectStore = useProjectStore()
const todoStore = useTodoStore()

const { projects, currentProjectId, hasProjects } = storeToRefs(projectStore)
const { totalCount, completedCount, todayAddedCount, todayCompletedCount } = storeToRefs(todoStore)

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
</script>

