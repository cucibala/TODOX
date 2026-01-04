<template>
  <aside class="sidebar">
    <div class="progress-card">
      <div class="progress-header">
        <span>整体进度</span>
        <span class="progress-percent">{{ currentCompletionPercentage }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: currentCompletionPercentage + '%' }"></div>
      </div>
      <div class="progress-meta">
        <span>{{ currentCompletedCount }} 已完成</span>
        <span>{{ currentTotalCount }} 总任务</span>
      </div>
    </div>
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
        </div>
      </div>
      <div class="project-list">
        <div v-if="!hasProjects && projectGroups.length === 0" class="project-empty-hint">
          暂无项目，点击 + 创建
        </div>
        <div v-else class="project-group-list">
          <div
            class="project-group"
            :class="{ 'drop-target': activeDropGroupId === ungroupedGroupId }"
            @dragover.prevent="handleGroupDragOver(ungroupedGroupId)"
            @dragleave="handleGroupDragLeave(ungroupedGroupId)"
            @drop.prevent="handleGroupDrop(ungroupedGroupId, $event)"
          >
            <div class="project-group-header">
              <div class="project-group-title">
                <button
                  class="btn-toggle-group"
                  @click.stop="toggleGroupCollapsed(ungroupedGroupId)"
                  title="折叠/展开"
                >
                  <svg
                    class="toggle-icon"
                    :class="{ collapsed: isGroupCollapsed(ungroupedGroupId) }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <span class="project-group-name">未分组</span>
                <span class="project-group-count">{{ ungroupedProjects.length }}</span>
              </div>
            </div>
            <div v-if="!isGroupCollapsed(ungroupedGroupId)" class="project-group-items">
              <div v-if="ungroupedProjects.length === 0" class="project-group-empty">
                拖动项目到此分组
              </div>
              <div
                v-for="project in ungroupedProjects"
                :key="project.id"
                class="project-item"
                :class="{ active: currentProjectId === project.id, dragging: draggedProjectId === project.id }"
                :draggable="editingProjectId !== project.id"
                @dragstart="handleProjectDragStart($event, project.id)"
                @dragend="handleProjectDragEnd"
                @click="projectStore.selectProject(project.id)"
              >
                <div class="project-color" :style="{ backgroundColor: project.color }"></div>
                <div class="project-info">
                  <div class="project-header">
                    <div class="project-name">
                      <input
                        v-if="editingProjectId === project.id"
                        v-model="editingProjectName"
                        class="project-name-edit"
                        :data-project-edit-id="project.id"
                        maxlength="30"
                        @click.stop
                        @keyup.enter="handleSaveProjectName(project)"
                        @keyup.esc="handleCancelProjectEdit"
                        @blur="handleSaveProjectName(project)"
                      />
                      <span v-else>{{ project.name }}</span>
                    </div>
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
                    class="btn-edit-project" 
                    @click.stop="handleStartProjectEdit(project)" 
                    title="重命名项目"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                    </svg>
                  </button>
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

          <div
            v-for="group in sortedProjectGroups"
            :key="group.id"
            class="project-group"
            :class="{ 'drop-target': activeDropGroupId === String(group.id) }"
            @dragover.prevent="handleGroupDragOver(String(group.id))"
            @dragleave="handleGroupDragLeave(String(group.id))"
            @drop.prevent="handleGroupDrop(String(group.id), $event)"
          >
            <div class="project-group-header">
              <div class="project-group-title">
                <button
                  class="btn-toggle-group"
                  @click.stop="toggleGroupCollapsed(group.id)"
                  title="折叠/展开"
                >
                  <svg
                    class="toggle-icon"
                    :class="{ collapsed: isGroupCollapsed(group.id) }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <span class="project-group-name">{{ group.name }}</span>
                <span class="project-group-count">{{ getGroupProjects(group.id).length }}</span>
              </div>
              <div class="project-group-actions">
                <button
                  class="btn-delete-group"
                  @click.stop="handleDeleteGroup(group)"
                  title="删除分组"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="!isGroupCollapsed(group.id)" class="project-group-items">
              <div v-if="getGroupProjects(group.id).length === 0" class="project-group-empty">
                拖动项目到此分组
              </div>
              <div
                v-for="project in getGroupProjects(group.id)"
                :key="project.id"
                class="project-item"
                :class="{ active: currentProjectId === project.id, dragging: draggedProjectId === project.id }"
                :draggable="editingProjectId !== project.id"
                @dragstart="handleProjectDragStart($event, project.id)"
                @dragend="handleProjectDragEnd"
                @click="projectStore.selectProject(project.id)"
              >
                <div class="project-color" :style="{ backgroundColor: project.color }"></div>
                <div class="project-info">
                  <div class="project-header">
                    <div class="project-name">
                      <input
                        v-if="editingProjectId === project.id"
                        v-model="editingProjectName"
                        class="project-name-edit"
                        :data-project-edit-id="project.id"
                        maxlength="30"
                        @click.stop
                        @keyup.enter="handleSaveProjectName(project)"
                        @keyup.esc="handleCancelProjectEdit"
                        @blur="handleSaveProjectName(project)"
                      />
                      <span v-else>{{ project.name }}</span>
                    </div>
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
                    class="btn-edit-project" 
                    @click.stop="handleStartProjectEdit(project)" 
                    title="重命名项目"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                    </svg>
                  </button>
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
        </div>
      </div>
    </div>

    <button class="project-create-dashed" @click="openProjectModal">
      <span class="project-create-plus">+</span>
      <span>新建项目</span>
    </button>

    <div v-if="showProjectModal" class="project-modal" @click.self="closeProjectModal">
      <div class="project-modal-dialog">
        <div class="project-modal-header">
          <div class="project-modal-title">新建项目</div>
          <button class="project-modal-close" @click="closeProjectModal" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="project-modal-body">
          <label class="project-field">
            <span>项目名称</span>
            <input
              v-model="newProjectName"
              class="project-field-input"
              placeholder="输入项目名称..."
              @keyup.enter="handleCreateProject"
            />
          </label>
          <div class="project-field">
            <span>项目优先级</span>
            <div class="project-priority-options">
              <button
                v-for="option in projectPriorityOptions"
                :key="option.value"
                type="button"
                class="project-priority-option"
                :class="{ selected: newProjectPriority === option.value }"
                :data-priority="option.value"
                :title="option.label"
                @click="newProjectPriority = option.value"
              ></button>
            </div>
          </div>
          <label class="project-field">
            <span>所属分组</span>
            <select v-model="selectedGroupId" class="project-field-select">
              <option value="">未分组</option>
              <option v-for="group in sortedProjectGroups" :key="group.id" :value="String(group.id)">
                {{ group.name }}
              </option>
            </select>
          </label>
          <div class="project-group-inline">
            <input
              v-model="newGroupName"
              class="project-field-input"
              placeholder="新建分组..."
              @keyup.enter="handleCreateGroup"
            />
            <button class="btn-add-group-inline" @click="handleCreateGroup">创建分组</button>
          </div>
        </div>
        <div class="project-modal-actions">
          <button class="project-modal-btn secondary" @click="closeProjectModal">取消</button>
          <button class="project-modal-btn primary" @click="handleCreateProject">创建</button>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useProjectStore } from '../stores/project'
import { useTodoStore } from '../stores/todo'

const appStore = useAppStore()
const projectStore = useProjectStore()
const todoStore = useTodoStore()

const { projects, projectGroups, currentProjectId, hasProjects } = storeToRefs(projectStore)
const { todos } = storeToRefs(todoStore)

const progressTasks = computed(() => todos.value)

const currentTotalCount = computed(() => progressTasks.value.length)
const currentCompletedCount = computed(() => progressTasks.value.filter(task => task.completed).length)
const currentCompletionPercentage = computed(() => {
  if (currentTotalCount.value === 0) return 0
  return Math.round((currentCompletedCount.value / currentTotalCount.value) * 100)
})

// 新建项目/分组
const newProjectName = ref('')
const newProjectPriority = ref('medium')
const newGroupName = ref('')
const selectedGroupId = ref('')
const showProjectModal = ref(false)
const projectPriorityOptions = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' }
]
const projectPriorityColorMap = {
  high: '#f56565',
  medium: '#ed8936',
  low: '#48bb78'
}

// 分组折叠
const ungroupedGroupId = 'ungrouped'
const collapsedGroupIds = ref(new Set())

// 拖拽状态
const draggedProjectId = ref(null)
const activeDropGroupId = ref(null)

// 项目重命名
const editingProjectId = ref(null)
const editingProjectName = ref('')
const editingOriginalName = ref('')

const sortedProjectGroups = computed(() => {
  return [...projectGroups.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

const ungroupedProjects = computed(() => {
  return projects.value.filter(project => !project.groupId)
})

function getGroupProjects(groupId) {
  return projects.value.filter(project => String(project.groupId ?? '') === String(groupId))
}

function isGroupCollapsed(groupId) {
  return collapsedGroupIds.value.has(String(groupId))
}

function toggleGroupCollapsed(groupId) {
  const next = new Set(collapsedGroupIds.value)
  const id = String(groupId)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  collapsedGroupIds.value = next
}

async function handleCreateProject() {
  const trimmedName = (newProjectName.value || '').trim()
  if (!trimmedName) return

  const priorityColor = projectPriorityColorMap[newProjectPriority.value] || '#667eea'
  const project = await projectStore.addProject(
    trimmedName,
    priorityColor,
    selectedGroupId.value ? String(selectedGroupId.value) : null,
    newProjectPriority.value
  )
  if (project) {
    newProjectName.value = ''
    selectedGroupId.value = ''
    newGroupName.value = ''
    showProjectModal.value = false
  }
}

async function handleCreateGroup() {
  const group = await projectStore.addProjectGroup(newGroupName.value)
  if (group) {
    newGroupName.value = ''
    selectedGroupId.value = String(group.id)
  }
}

function openProjectModal() {
  showProjectModal.value = true
}

function closeProjectModal() {
  showProjectModal.value = false
}

async function handleDeleteGroup(group) {
  await projectStore.deleteProjectGroup(group.id)
}

function handleStartProjectEdit(project) {
  editingProjectId.value = project.id
  editingProjectName.value = project.name || ''
  editingOriginalName.value = project.name || ''

  nextTick(() => {
    const input = document.querySelector(`[data-project-edit-id="${project.id}"]`)
    input?.focus()
    input?.select()
  })
}

function handleCancelProjectEdit() {
  editingProjectId.value = null
  editingProjectName.value = ''
  editingOriginalName.value = ''
}

async function handleSaveProjectName(project) {
  if (editingProjectId.value !== project.id) return

  const trimmedName = editingProjectName.value.trim()
  const originalName = editingOriginalName.value
  handleCancelProjectEdit()

  if (!trimmedName) {
    appStore.toast('项目名称不能为空')
    return
  }

  if (trimmedName !== originalName) {
    await projectStore.updateProject(project.id, { name: trimmedName })
  }
}

function handleProjectDragStart(event, projectId) {
  draggedProjectId.value = projectId
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(projectId))
  }
}

function handleProjectDragEnd() {
  draggedProjectId.value = null
  activeDropGroupId.value = null
}

function handleGroupDragOver(groupId) {
  activeDropGroupId.value = groupId
}

function handleGroupDragLeave(groupId) {
  if (activeDropGroupId.value === groupId) {
    activeDropGroupId.value = null
  }
}

async function handleGroupDrop(groupId, event) {
  const fallbackId = event?.dataTransfer?.getData('text/plain')
  const projectId = draggedProjectId.value || fallbackId
  if (!projectId) return

  const targetGroupId = groupId === ungroupedGroupId ? null : groupId
  await projectStore.moveProjectToGroup(projectId, targetGroupId)
  draggedProjectId.value = null
  activeDropGroupId.value = null
}

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

