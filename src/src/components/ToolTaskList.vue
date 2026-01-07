<template>
  <div class="tool-task-card">
    <div class="tool-task-header">
      <div class="tool-task-title">{{ title }}</div>
      <div class="tool-task-count">{{ displayTasks.length }} 项</div>
    </div>

    <div v-if="displayTasks.length === 0" class="tool-task-empty">暂无任务</div>

    <div v-for="task in displayTasks" :key="task.id" class="tool-task-item">
      <label class="tool-task-checkbox">
        <input type="checkbox" :checked="task.completed" @change="toggleTask(task.id)" />
        <span></span>
      </label>

      <div class="tool-task-main">
        <input
          class="tool-task-text"
          :value="taskDrafts[task.id] ?? task.text"
          @input="handleTaskInput(task.id, $event.target.value)"
          @keydown.enter.prevent="saveTask(task)"
          @blur="saveTask(task)"
        />

        <div class="tool-task-meta">
          <span v-if="getProjectName(task.projectId)" class="tool-task-project">
            {{ getProjectName(task.projectId) }}
          </span>
          <span v-if="task.dueDate" class="tool-task-due">到期 {{ task.dueDate }}</span>
          <span class="tool-task-priority" :data-priority="task.priority || 'medium'">
            {{ priorityLabel(task.priority) }}
          </span>
        </div>

        <div class="tool-subtasks">
          <button class="tool-subtasks-toggle" @click="toggleSubtasks(task.id)">
            子任务 {{ task.subtasks?.length || 0 }} 项
          </button>
          <div v-if="openSubtasks[task.id]" class="tool-subtask-list">
            <div v-if="!task.subtasks || task.subtasks.length === 0" class="tool-subtask-empty">
              暂无子任务
            </div>
            <div v-for="subtask in task.subtasks || []" :key="subtask.id" class="tool-subtask-item">
              <label class="tool-subtask-checkbox">
                <input type="checkbox" :checked="subtask.completed" @change="toggleSubtask(task.id, subtask.id)" />
                <span></span>
              </label>
              <input
                class="tool-subtask-text"
                :value="subtaskDrafts[subtask.id] ?? subtask.text"
                @input="handleSubtaskInput(subtask.id, $event.target.value)"
                @keydown.enter.prevent="saveSubtask(task.id, subtask)"
                @blur="saveSubtask(task.id, subtask)"
              />
              <button
                class="tool-subtask-copy"
                @click="handleCopySubtaskText(subtask.text)"
                title="复制子任务内容"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="tool-subtask-delete" @click="deleteSubtask(task.id, subtask.id)">删除</button>
            </div>

            <div class="tool-subtask-add">
              <input
                class="tool-subtask-add-input"
                :value="newSubtaskDrafts[task.id] || ''"
                @input="handleNewSubtaskInput(task.id, $event.target.value)"
                placeholder="添加子任务"
                @keydown.enter.prevent="addSubtask(task.id)"
              />
              <button class="tool-subtask-add-btn" @click="addSubtask(task.id)">添加</button>
            </div>
          </div>
        </div>
      </div>

      <button class="tool-task-delete" @click="deleteTask(task.id)">删除</button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'

const props = defineProps({
  title: {
    type: String,
    default: '任务列表'
  },
  tasks: {
    type: Array,
    default: () => []
  }
})

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()

const taskDrafts = reactive({})
const subtaskDrafts = reactive({})
const newSubtaskDrafts = reactive({})
const openSubtasks = reactive({})

const displayTasks = computed(() => {
  const taskMap = new Map(todoStore.todos.map(t => [t.id, t]))
  return props.tasks.map(task => taskMap.get(task.id) || task).filter(Boolean)
})

function priorityLabel(priority) {
  if (priority === 'high') return '高'
  if (priority === 'low') return '低'
  return '中'
}

function getProjectName(projectId) {
  const project = projectStore.projects.find(p => p.id === projectId)
  return project?.name || ''
}

function handleTaskInput(taskId, value) {
  taskDrafts[taskId] = value
}

async function saveTask(task) {
  const draft = taskDrafts[task.id]
  if (draft === undefined || draft.trim() === task.text) return
  if (!draft.trim()) {
    taskDrafts[task.id] = task.text
    return
  }
  await todoStore.updateTask(task.id, { text: draft.trim() })
}

async function toggleTask(taskId) {
  await todoStore.toggleTask(taskId)
}

function toggleSubtasks(taskId) {
  openSubtasks[taskId] = !openSubtasks[taskId]
}

function handleSubtaskInput(subtaskId, value) {
  subtaskDrafts[subtaskId] = value
}

async function saveSubtask(taskId, subtask) {
  const draft = subtaskDrafts[subtask.id]
  if (draft === undefined || draft.trim() === subtask.text) return
  if (!draft.trim()) {
    subtaskDrafts[subtask.id] = subtask.text
    return
  }
  await todoStore.updateSubtask(taskId, subtask.id, { text: draft.trim() })
}

async function toggleSubtask(taskId, subtaskId) {
  await todoStore.toggleSubtask(taskId, subtaskId)
}

async function deleteSubtask(taskId, subtaskId) {
  const confirmed = await appStore.confirm('确定要删除这个子任务吗？')
  if (!confirmed) return
  await todoStore.deleteSubtask(taskId, subtaskId)
}

function handleCopySubtaskText(text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    appStore.toast('子任务内容已复制')
  }).catch(() => {
    appStore.toast('复制失败')
  })
}

function handleNewSubtaskInput(taskId, value) {
  newSubtaskDrafts[taskId] = value
}

async function addSubtask(taskId) {
  const text = (newSubtaskDrafts[taskId] || '').trim()
  if (!text) return
  await todoStore.addSubtask(taskId, text)
  newSubtaskDrafts[taskId] = ''
}

async function deleteTask(taskId) {
  const confirmed = await appStore.confirm('确定要删除这个任务吗？')
  if (!confirmed) return
  await todoStore.deleteTask(taskId)
}
</script>
