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

function getProjectStats(projectId) {
  return projectStore.getProjectStats(projectId)
}
</script>

