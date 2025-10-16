<template>
  <section class="content-area">
    <!-- 搜索和筛选栏 -->
    <div class="toolbar">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          placeholder="搜索任务..." 
        />
      </div>
      
      <!-- 筛选按钮 -->
      <div class="filter-buttons">
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'all' }"
          @click="todoStore.currentFilter = 'all'"
          title="全部任务"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span class="filter-text">全部</span>
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'active' }"
          @click="todoStore.currentFilter = 'active'"
          title="未完成"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <span class="filter-text">未完成</span>
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: currentFilter === 'completed' }"
          @click="todoStore.currentFilter = 'completed'"
          title="已完成"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span class="filter-text">已完成</span>
        </button>
      </div>
      
      <!-- 优先级筛选 -->
      <div class="priority-filter-buttons">
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
          高
        </button>
        <button 
          class="priority-filter-btn priority-medium" 
          :class="{ active: currentPriorityFilter === 'medium' }"
          @click="todoStore.currentPriorityFilter = 'medium'"
          title="中优先级"
        >
          中
        </button>
        <button 
          class="priority-filter-btn priority-low" 
          :class="{ active: currentPriorityFilter === 'low' }"
          @click="todoStore.currentPriorityFilter = 'low'"
          title="低优先级"
        >
          低
        </button>
      </div>
    </div>

    <!-- 添加任务表单 -->
    <div class="add-task-section">
      <div v-if="!hasProjects || !currentProjectId" class="no-project-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>请先创建一个项目，然后再添加任务</span>
      </div>
      <!-- <div v-else class="current-project-display">
        <span class="current-project-label">当前项目：</span>
        <span class="current-project-name" :style="{ color: currentProject?.color }">
          {{ currentProject?.name }}
        </span>
      </div> -->
      <form 
        @submit.prevent="handleAddTask" 
        :style="{ 
          opacity: (!hasProjects || !currentProjectId) ? '0.5' : '1',
          pointerEvents: (!hasProjects || !currentProjectId) ? 'none' : 'auto'
        }"
      >
        <div class="input-group">
          <input 
            v-model="newTaskText" 
            type="text" 
            class="task-input" 
            placeholder="添加新任务..." 
            autocomplete="off"
            required
          />
          <input 
            v-model="newTaskDueDate" 
            type="date" 
            class="date-input"
            title="截止日期（可选）"
          />
          <select v-model="newTaskPriority" class="priority-select">
            <option value="low">低优先级</option>
            <option value="medium">中优先级</option>
            <option value="high">高优先级</option>
          </select>
          <button type="button" class="btn-image" @click="handleSelectImage" title="添加图片（可添加多张）">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <button type="submit" class="btn-add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加
          </button>
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

    <!-- 任务列表 -->
    <div class="task-list-container">
      <div class="task-list">
        <TaskItem 
          v-for="task in filteredTodos" 
          :key="task.id" 
          :task="task"
        />
      </div>
      <div v-if="filteredTodos.length === 0" class="empty-state show">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        <p>暂无任务</p>
        <span>添加一个新任务开始吧!</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'
import TaskItem from './TaskItem.vue'
import ImagePreview from './ImagePreview.vue'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()

const { searchQuery, filteredTodos, currentImages, currentFilter, currentPriorityFilter } = storeToRefs(todoStore)
const { hasProjects, currentProjectId, currentProject } = storeToRefs(projectStore)

const newTaskText = ref('')
const newTaskDueDate = ref('')
const newTaskPriority = ref('medium')

async function handleAddTask() {
  const result = await todoStore.addTask(
    newTaskText.value,
    newTaskPriority.value,
    newTaskDueDate.value
  )
  
  if (result.success) {
    newTaskText.value = ''
    newTaskDueDate.value = ''
    newTaskPriority.value = 'medium'
  } else if (result.error) {
    appStore.toast(result.error)
  }
}

async function handleSelectImage() {
  await todoStore.selectImage()
}
</script>

