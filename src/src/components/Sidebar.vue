<template>
  <aside class="sidebar">
    <!-- 项目管理部分 -->
    <div class="project-section">
      <div class="section-header">
        <h3 class="section-title">项目</h3>
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
            <div class="project-name">{{ project.name }}</div>
            <div class="project-count">
              {{ getProjectStats(project.id).completed }}/{{ getProjectStats(project.id).total }}
            </div>
          </div>
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

    <!-- 筛选部分 -->
    <div class="filter-section">
      <h3 class="section-title">筛选</h3>
      <div class="filter-buttons">
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'all' }"
          @click="todoStore.currentFilter = 'all'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          全部任务
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'active' }"
          @click="todoStore.currentFilter = 'active'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          未完成
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'completed' }"
          @click="todoStore.currentFilter = 'completed'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          已完成
        </button>
      </div>
    </div>

    <!-- 优先级筛选 -->
    <div class="priority-section">
      <h3 class="section-title">优先级</h3>
      <div class="filter-buttons">
        <button 
          class="priority-filter-btn" 
          :class="{ active: currentPriorityFilter === 'all' }"
          @click="todoStore.currentPriorityFilter = 'all'"
        >
          全部
        </button>
        <button 
          class="priority-filter-btn priority-high" 
          :class="{ active: currentPriorityFilter === 'high' }"
          @click="todoStore.currentPriorityFilter = 'high'"
        >
          高
        </button>
        <button 
          class="priority-filter-btn priority-medium" 
          :class="{ active: currentPriorityFilter === 'medium' }"
          @click="todoStore.currentPriorityFilter = 'medium'"
        >
          中
        </button>
        <button 
          class="priority-filter-btn priority-low" 
          :class="{ active: currentPriorityFilter === 'low' }"
          @click="todoStore.currentPriorityFilter = 'low'"
        >
          低
        </button>
      </div>
    </div>

    <!-- 设置 -->
    <div class="settings-section">
      <h3 class="section-title">设置</h3>
      <div class="settings-buttons">
        <button class="settings-btn" @click="appStore.showDataPathDialog = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          数据存储路径
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useProjectStore } from '../stores/project'
import { useTodoStore } from '../stores/todo'

const appStore = useAppStore()
const projectStore = useProjectStore()
const todoStore = useTodoStore()

const { projects, currentProjectId, hasProjects } = storeToRefs(projectStore)
const { currentFilter, currentPriorityFilter } = storeToRefs(todoStore)

function getProjectStats(projectId) {
  return projectStore.getProjectStats(projectId)
}
</script>

