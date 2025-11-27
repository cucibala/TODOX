<template>
  <div class="tree-item-wrapper">
    <!-- 当前项 -->
    <div
      class="tree-item"
      :class="{
        active: item.type === 'document' && item.id === currentDocumentId,
        folder: item.type === 'folder',
        'drag-over-before': dropPosition === 'before',
        'drag-over-after': dropPosition === 'after',
        'drag-over-inside': dropPosition === 'inside',
        dragging: isDragging
      }"
      :style="{ paddingLeft: `${12 + level * 16}px` }"
      draggable="true"
      @click="handleClick"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- 展开/折叠按钮 -->
      <button
        v-if="item.type === 'folder'"
        class="btn-toggle"
        @click.stop="$emit('select', item.id)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="isExpanded ? '6 9 12 15 18 9' : '9 18 15 12 9 6'"></polyline>
        </svg>
      </button>
      <span v-else class="toggle-placeholder"></span>

      <!-- 图标 -->
      <div class="item-icon">
        <svg v-if="item.type === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>

      <!-- 标题 -->
      <div class="item-info" v-if="!sidebarCollapsed">
        <input
          v-if="isEditing"
          ref="titleInputRef"
          v-model="editingTitle"
          class="item-title-input"
          @blur="handleTitleBlur"
          @keydown.enter="handleTitleSave"
          @keydown.esc="handleTitleCancel"
          @click.stop
        />
        <div
          v-else
          class="item-title"
          @dblclick.stop="handleStartEdit"
        >
          {{ item.title || (item.type === 'folder' ? '无标题文件夹' : '无标题文档') }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="item-actions" v-if="!sidebarCollapsed">
        <!-- 文件夹的新建按钮 -->
        <template v-if="item.type === 'folder'">
          <button
            class="btn-action"
            @click.stop="$emit('create-document', item.id)"
            title="新建文档"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </button>
          <button
            class="btn-action"
            @click.stop="$emit('create-folder', item.id)"
            title="新建子文件夹"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          </button>
        </template>
        <!-- 重命名按钮 -->
        <button
          class="btn-action"
          @click.stop="handleStartEdit"
          title="重命名"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <!-- 删除按钮 -->
        <button
          class="btn-action btn-delete"
          @click.stop="$emit('delete', item.id)"
          title="删除"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- 子项（递归） -->
    <div v-if="item.type === 'folder' && isExpanded" class="tree-children">
      <DocumentTreeItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :level="level + 1"
        :sidebar-collapsed="sidebarCollapsed"
        :current-document-id="currentDocumentId"
        :expanded-folders="expandedFolders"
        :dragging-item="draggingItem"
        @select="$emit('select', $event)"
        @delete="$emit('delete', $event)"
        @create-document="$emit('create-document', $event)"
        @create-folder="$emit('create-folder', $event)"
        @rename="$emit('rename', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drop="$emit('drop', $event)"
      />
      <div v-if="item.children.length === 0" class="empty-folder" :style="{ paddingLeft: `${12 + (level + 1) * 16}px` }">
        空文件夹
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },
  currentDocumentId: {
    type: String,
    default: null
  },
  expandedFolders: {
    type: Set,
    default: () => new Set()
  },
  draggingItem: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'select',
  'delete',
  'create-document',
  'create-folder',
  'drag-start',
  'drag-end',
  'drop',
  'rename'
])

const dropPosition = ref(null)
const isDragging = ref(false)
const isEditing = ref(false)
const editingTitle = ref('')
const titleInputRef = ref(null)

const isExpanded = computed(() => {
  return props.expandedFolders.has(props.item.id)
})

function handleClick() {
  if (isEditing.value) return
  emit('select', props.item.id)
}

// 重命名相关
async function handleStartEdit() {
  isEditing.value = true
  editingTitle.value = props.item.title || ''
  await nextTick()
  if (titleInputRef.value) {
    titleInputRef.value.focus()
    titleInputRef.value.select()
  }
}

function handleTitleSave() {
  const newTitle = editingTitle.value.trim()
  if (newTitle && newTitle !== props.item.title) {
    emit('rename', { id: props.item.id, title: newTitle })
  }
  isEditing.value = false
}

function handleTitleBlur() {
  // 延迟一点以允许 Enter 键先触发
  setTimeout(() => {
    if (isEditing.value) {
      handleTitleSave()
    }
  }, 100)
}

function handleTitleCancel() {
  isEditing.value = false
  editingTitle.value = ''
}

// 拖拽相关
function handleDragStart(event) {
  if (isEditing.value) {
    event.preventDefault()
    return
  }
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.item.id)
  emit('drag-start', props.item)
}

function handleDragEnd() {
  isDragging.value = false
  dropPosition.value = null
  emit('drag-end')
}

function handleDragOver(event) {
  if (!props.draggingItem) return
  if (props.draggingItem.id === props.item.id) return

  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'

  const rect = event.currentTarget.getBoundingClientRect()
  const y = event.clientY - rect.top
  const height = rect.height

  // 根据鼠标位置判断放置位置
  if (props.item.type === 'folder') {
    // 文件夹：上部1/4放在前面，下部1/4放在后面，中间放入文件夹内
    if (y < height * 0.25) {
      dropPosition.value = 'before'
    } else if (y > height * 0.75) {
      dropPosition.value = 'after'
    } else {
      dropPosition.value = 'inside'
    }
  } else {
    // 文档：上半部分放在前面，下半部分放在后面
    if (y < height * 0.5) {
      dropPosition.value = 'before'
    } else {
      dropPosition.value = 'after'
    }
  }
}

function handleDragLeave() {
  dropPosition.value = null
}

function handleDrop(event) {
  event.preventDefault()
  event.stopPropagation()

  if (!props.draggingItem) return
  if (props.draggingItem.id === props.item.id) return

  emit('drop', {
    targetId: props.item.id,
    position: dropPosition.value || 'after'
  })

  dropPosition.value = null
}
</script>

<style scoped>
.tree-item-wrapper {
  user-select: none;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  padding-right: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  margin-bottom: 1px;
}

.tree-item:hover {
  background: var(--hover-bg);
}

.tree-item.active {
  background: var(--primary-light);
}

.tree-item.dragging {
  opacity: 0.5;
}

.tree-item.drag-over-before::before {
  content: '';
  position: absolute;
  top: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--primary-color);
  border-radius: 1px;
}

.tree-item.drag-over-after::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--primary-color);
  border-radius: 1px;
}

.tree-item.drag-over-inside {
  background: rgba(108, 92, 231, 0.15);
  outline: 2px dashed var(--primary-color);
  outline-offset: -2px;
}

.btn-toggle {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 0.15s;
}

.btn-toggle:hover {
  background: rgba(0, 0, 0, 0.08);
}

.btn-toggle svg {
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
}

.toggle-placeholder {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.item-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

.tree-item.folder .item-icon svg {
  color: #f59e0b;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}

.item-title-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  font-family: inherit;
}

.item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tree-item:hover .item-actions {
  opacity: 1;
}

.btn-action {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}

.btn-action:hover {
  background: rgba(0, 0, 0, 0.08);
}

.btn-action svg {
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
}

.btn-action.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-action.btn-delete:hover svg {
  color: var(--danger-color);
}

.tree-children {
  /* 子项容器 */
}

.empty-folder {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 6px 12px;
  font-style: italic;
}
</style>
