<template>
  <div 
    class="task-item" 
    :class="{ completed: task.completed, pinned: task.pinned, dragging: isDragging }"
    :data-task-id="task.id"
    :draggable="!isEditing"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- 优先级指示器 -->
    <div class="priority-indicator" :class="`priority-${task.priority}`"></div>

    <!-- 任务内容 -->
    <div class="task-content">
      <!-- 编辑模式 -->
      <div v-if="isEditing && !showDetails" class="task-edit-mode">
        <textarea 
          v-model="editText" 
          class="task-edit-input"
          ref="editInputRef"
          @keydown.ctrl.enter="handleSaveEdit"
          @keydown.esc="handleCancelEdit"
        ></textarea>
        <div class="task-edit-actions">
          <button class="btn-save-edit" @click="handleSaveEdit" title="保存 (Ctrl+Enter)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            保存
          </button>
          <button class="btn-cancel-edit" @click="handleCancelEdit" title="取消 (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            取消
          </button>
        </div>
      </div>
      <!-- 显示模式 -->
      <div v-else class="task-card-header">
        <div class="task-title">{{ task.text }}</div>
        <div class="task-header-actions">
          <button
            class="btn-pin"
            :class="{ active: task.pinned }"
            @click="handleTogglePin"
            :title="task.pinned ? '取消置顶' : '置顶'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 17v5"></path>
              <path d="M9 3h6l-1 6 4 4H6l4-4z"></path>
              <circle v-if="task.pinned" cx="18" cy="6" r="2" fill="currentColor" stroke="none"></circle>
            </svg>
          </button>
          <button
            class="btn-ai-breakdown"
            @click="handleAIBreakdown"
            :disabled="isAIBreakingDown"
            title="AI 拆解"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 18h10"></path>
              <circle cx="18" cy="18" r="2"></circle>
            </svg>
          </button>
          <button
            class="btn-ai-task-summary"
            @click="handleAISummary"
            :disabled="isGeneratingTaskSummary"
            title="AI 总结"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 17 9 11 13 15 21 7"></polyline>
              <polyline points="14 7 21 7 21 14"></polyline>
            </svg>
          </button>
          <button class="btn-task-expand" @click="toggleTaskDetails" :title="showDetails ? '收起' : '展开'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="showDetails ? '6 15 12 9 18 15' : '6 9 12 15 18 9'"></polyline>
            </svg>
          </button>
          <button v-if="canManageTask" class="btn-task-menu" @click="toggleTaskMenu" title="更多">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8"></circle>
              <circle cx="12" cy="12" r="1.8"></circle>
              <circle cx="12" cy="19" r="1.8"></circle>
            </svg>
          </button>
          <div v-if="showTaskMenu && canManageTask" class="task-menu" @click.stop>
            <button class="task-menu-item" @click="handleStartEdit">编辑</button>
            <button class="task-menu-item danger" @click="handleDelete">删除</button>
          </div>
        </div>
      </div>

      <div v-if="!isEditing" class="task-subtitle" @click="openDetailsForSubtask">
        {{ subtaskSummary }}
      </div>
<!-- 
      <div v-if="task.subtasks && task.subtasks.length > 0" class="task-tags">
        <span class="task-tag">子任务 {{ completedSubtaskCount }}/{{ task.subtasks.length }}</span>
      </div> -->

      <div v-if="task.subtasks && task.subtasks.length > 0" class="task-subtasks-mini">
        <div
          v-for="subtask in sortedSubtasks"
          :key="subtask.id"
          class="task-subtask-mini"
          :class="{ completed: subtask.completed }"
        >
          <button
            class="subtask-mini-checkbox"
            @click.stop="handleToggleSubtask(subtask.id)"
            :title="subtask.completed ? '取消完成' : '完成子任务'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <span class="subtask-mini-text">{{ subtask.text }}</span>
        </div>
      </div>

      <div class="task-divider"></div>
      
      <!-- 元信息 -->
      <div class="task-meta">
        <div class="task-time">{{ formatDate(task.createdAt) }}</div>
        <div v-if="assigneeLabel" class="task-assignee">
          <span class="task-assignee-label">负责人</span>
          <span class="task-assignee-name">{{ assigneeLabel }}</span>
        </div>
        
        <!-- 到期时间显示/编辑 -->
        <div v-if="!isEditingDueDate && task.dueDate" 
          class="task-due-date" 
          :class="getDueDateStatus(task.dueDate)"
          @click="handleStartEditDueDate"
          title="点击修改到期时间"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {{ formatDueDate(task.dueDate) }}
        </div>
        
        <!-- 编辑到期时间 -->
        <div v-if="isEditingDueDate" class="task-due-date-edit">
          <input 
            type="date" 
            v-model="editDueDate" 
            class="due-date-input"
            ref="dueDateInputRef"
          />
          <button class="btn-save-due-date" @click="handleSaveDueDate" title="保存">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button class="btn-cancel-due-date" @click="handleCancelEditDueDate" title="取消">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button v-if="task.dueDate" class="btn-remove-due-date" @click="handleRemoveDueDate" title="移除到期时间">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        
        <!-- 如果没有到期时间，显示添加按钮 -->
        <div v-if="!task.dueDate && !isEditingDueDate" 
          class="task-add-due-date" 
          @click="handleStartEditDueDate"
          title="设置到期时间"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          设置到期时间
        </div>
        
        <div v-if="task.completed && task.completedAt" class="task-completed-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          完成于 {{ formatDate(task.completedAt) }}
        </div>
        <div v-if="duration" class="task-duration">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          耗时 {{ duration }}
        </div>
      </div>

      <!-- 任务图片/视频 -->
      <div v-if="task.images && task.images.length > 0" class="task-images-container">
        <template v-for="(image, index) in task.images" :key="index">
          <!-- 视频 -->
          <video
            v-if="isVideo(image) && imageCache[image]"
            :src="imageCache[image]"
            class="task-video"
            controls
            preload="metadata"
          ></video>
          <!-- 图片 -->
          <img
            v-else-if="!isVideo(image) && imageCache[image]"
            :src="imageCache[image]"
            class="task-image"
            @click="appStore.viewImage(imageCache[image])"
            alt="任务图片"
          />
        </template>
      </div>

    </div>

    <div class="task-action-footer">
      <button v-if="showSecondaryAction" class="task-btn secondary" @click="handleRollback">
        {{ secondaryActionLabel }}
      </button>
      <button v-if="showPrimaryAction" class="task-btn primary" @click="handleComplete">
        {{ primaryActionLabel }}
      </button>
    </div>
  </div>

  <div v-if="showDetails" class="task-detail-modal" @click.self="closeTaskDetails">
    <div class="task-detail-dialog">
      <div class="task-detail-header">
        <div class="task-detail-title">任务详情</div>
        <div class="task-detail-header-actions">
          <button v-if="canManageTask" class="task-detail-edit" @click="handleStartEdit" title="编辑任务">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>
          <button class="task-detail-close" @click="closeTaskDetails" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="task-detail-body">
        <div class="task-detail-section">
          <div v-if="isEditing" class="task-edit-mode">
            <textarea
              v-model="editText"
              class="task-edit-input"
              ref="editInputRef"
              @keydown.ctrl.enter="handleSaveEdit"
              @keydown.esc="handleCancelEdit"
            ></textarea>
            <div class="task-edit-actions">
              <button class="btn-save-edit" @click="handleSaveEdit" title="保存 (Ctrl+Enter)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                保存
              </button>
              <button class="btn-cancel-edit" @click="handleCancelEdit" title="取消 (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                取消
              </button>
            </div>
          </div>
          <div v-else class="task-detail-name">{{ task.text }}</div>
          <div class="task-meta">
            <div class="task-time">{{ formatDate(task.createdAt) }}</div>
            <div v-if="assigneeLabel" class="task-assignee">
              <span class="task-assignee-label">负责人</span>
              <span class="task-assignee-name">{{ assigneeLabel }}</span>
            </div>
            <div v-if="!isEditingDueDate && task.dueDate" 
              class="task-due-date" 
              :class="getDueDateStatus(task.dueDate)"
              @click="handleStartEditDueDate"
              title="点击修改到期时间"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {{ formatDueDate(task.dueDate) }}
            </div>
            <div v-if="isEditingDueDate" class="task-due-date-edit">
              <input 
                type="date" 
                v-model="editDueDate" 
                class="due-date-input"
                ref="dueDateInputRef"
              />
              <button class="btn-save-due-date" @click="handleSaveDueDate" title="保存">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button class="btn-cancel-due-date" @click="handleCancelEditDueDate" title="取消">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <button v-if="task.dueDate" class="btn-remove-due-date" @click="handleRemoveDueDate" title="移除到期时间">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
            <div v-if="!task.dueDate && !isEditingDueDate" 
              class="task-add-due-date" 
              @click="handleStartEditDueDate"
              title="设置到期时间"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              设置到期时间
            </div>
          </div>
          <div v-if="task.images && task.images.length > 0" class="task-images-container task-images-detail">
            <template v-for="(image, index) in task.images" :key="index">
              <video
                v-if="isVideo(image) && imageCache[image]"
                :src="imageCache[image]"
                class="task-video"
                controls
                preload="metadata"
              ></video>
              <img
                v-else-if="!isVideo(image) && imageCache[image]"
                :src="imageCache[image]"
                class="task-image"
                @click="appStore.viewImage(imageCache[image])"
                alt="任务图片"
              />
            </template>
          </div>
        </div>

        <div class="task-detail-section">
          <div class="detail-section-title">子任务</div>
          <div class="task-subtasks-section">
            <div v-if="task.subtasks && task.subtasks.length > 0" class="subtasks-list">
              <div
                v-for="(subtask, index) in sortedSubtasks"
                :key="subtask.id"
                class="subtask-item"
                :class="{
                  'dragging': draggedSubtaskId === subtask.id,
                  'drag-over': dragOverIndex === index
                }"
                draggable="true"
                @dragstart="handleSubtaskDragStart(subtask.id, index, $event)"
                @dragover.prevent="handleSubtaskDragOver(index, $event)"
                @dragenter="handleSubtaskDragEnter(index)"
                @dragleave="handleSubtaskDragLeave"
                @drop="handleSubtaskDrop(index, $event)"
                @dragend="handleSubtaskDragEnd"
              >
                <div class="subtask-drag-handle" title="拖动排序">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5"></circle>
                    <circle cx="9" cy="12" r="1.5"></circle>
                    <circle cx="9" cy="19" r="1.5"></circle>
                    <circle cx="15" cy="5" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="15" cy="19" r="1.5"></circle>
                  </svg>
                </div>
                <div 
                  class="subtask-checkbox" 
                  :class="{ checked: subtask.completed }"
                  @click="handleToggleSubtask(subtask.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span 
                  class="subtask-weight clickable" 
                  :class="`subtask-weight-${getWeightClass(subtask.weight)}`"
                  @click.stop="handleCycleSubtaskWeight(subtask)"
                  title="点击切换优先级"
                >
                  {{ getWeightText(subtask.weight) }}
                </span>
                <div class="subtask-content">
                  <div v-if="editingSubtaskId === subtask.id" class="subtask-edit-mode">
                     <textarea
                       v-model="editingSubtaskText"
                       class="subtask-edit-input"
                       ref="editSubtaskInputRef"
                       rows="1"
                       @keydown.enter.prevent="handleSaveEditSubtask(subtask.id)"
                       @keydown.esc="handleCancelEditSubtask"
                       @blur="handleSaveEditSubtask(subtask.id)"
                     ></textarea>
                  </div>
                  <div v-else class="subtask-text-line">
                    <span 
                      class="subtask-text" 
                      :class="{ completed: subtask.completed }"
                      @click="handleStartEditSubtask(subtask)"
                      title="点击编辑"
                    >
                      {{ subtask.text }}
                    </span>
                    <input
                      v-if="subtask.requiresInput"
                      v-model="subtask.inputValue"
                      @blur="handleSubtaskInputChange(subtask.id)"
                      type="text"
                      placeholder="输入结果..."
                      class="subtask-input-inline"
                      :disabled="subtask.completed"
                    />
                  </div>
                  <div v-if="subtask.createdAt" class="subtask-time-info">
                    <span v-if="subtask.completed && subtask.completedAt" class="subtask-time">
                      完成于 {{ formatDate(subtask.completedAt) }}
                    </span>
                    <span v-else class="subtask-time">
                      创建于 {{ formatDate(subtask.createdAt) }}
                    </span>
                    <span 
                      v-if="subtask.completed && subtask.completedAt" 
                      class="subtask-duration"
                    >
                      耗时 {{ calculateTaskDuration(subtask.createdAt, subtask.completedAt) }}
                    </span>
                  </div>
                  <div v-if="subtask.images && subtask.images.length > 0" class="subtask-images-container">
                    <template v-for="(image, imgIndex) in subtask.images" :key="imgIndex">
                      <video
                        v-if="isVideo(image) && subtaskImageCache[image]"
                        :src="subtaskImageCache[image]"
                        class="subtask-video"
                        controls
                        preload="metadata"
                      ></video>
                      <img
                        v-else-if="!isVideo(image) && subtaskImageCache[image]"
                        :src="subtaskImageCache[image]"
                        class="subtask-image"
                        @click="appStore.viewImage(subtaskImageCache[image])"
                        alt="子任务图片"
                      />
                    </template>
                  </div>
                </div>
                <div class="subtask-actions">
                  <button 
                    class="btn-copy-subtask" 
                    @click="handleCopySubtaskText(subtask.text)"
                    title="复制子任务内容"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button 
                    class="btn-delete-subtask" 
                    @click="handleDeleteSubtask(subtask.id)"
                    title="删除子任务"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="empty-detail">暂无子任务</div>
            <div class="add-subtask-inline">
               <div class="subtask-checkbox placeholder"></div>
               <input
                 v-model="newSubtaskText"
                 class="add-subtask-input"
                 placeholder="输入子任务内容 (Enter 添加, Esc 清空)"
                 ref="newSubtaskInputRef"
                 @keydown.enter="handleConfirmAddSubtask"
                 @keydown.esc="handleCancelAddSubtask"
                 @blur="handleConfirmAddSubtask"
               />
            </div>
          </div>
        </div>

        <div class="task-detail-section">
          <div class="detail-section-title">进度记录</div>
          <div v-if="task.progress && task.progress.length > 0" class="task-progress-section">
            <div class="task-progress-container">
              <div class="progress-list">
                <div
                  v-for="progressItem in task.progress"
                  :key="progressItem.id"
                  class="progress-item"
                >
                  <div class="progress-content" @click="handleStartEditProgress(progressItem)">
                    <div v-if="editingProgressId === progressItem.id" class="progress-edit-mode">
                      <textarea 
                        v-model="editingProgressText" 
                        class="progress-edit-input"
                        @keydown.ctrl.enter="handleSaveProgressEdit(progressItem.id)"
                        @keydown.esc="handleCancelProgressEdit"
                      ></textarea>
                      <div class="progress-edit-actions">
                        <button class="btn-save-progress-edit" @click="handleSaveProgressEdit(progressItem.id)" title="保存 (Ctrl+Enter)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          保存
                        </button>
                        <button class="btn-cancel-progress-edit" @click="handleCancelProgressEdit" title="取消 (Esc)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          取消
                        </button>
                      </div>
                    </div>
                    <template v-else>
                      <div class="progress-text">{{ progressItem.text }}</div>
                      <div class="progress-time">{{ formatDate(progressItem.createdAt) }}</div>
                      <div v-if="progressItem.images && progressItem.images.length > 0" class="progress-images-container">
                        <template v-for="(image, index) in progressItem.images" :key="index">
                          <video
                            v-if="isVideo(image) && progressImageCache[image]"
                            :src="progressImageCache[image]"
                            class="progress-video"
                            controls
                            preload="metadata"
                            @click.stop
                          ></video>
                          <img
                            v-else-if="!isVideo(image) && progressImageCache[image]"
                            :src="progressImageCache[image]"
                            class="progress-image"
                            @click.stop="appStore.viewImage(progressImageCache[image])"
                            alt="进度图片"
                          />
                        </template>
                      </div>
                    </template>
                  </div>
                  <div class="progress-actions" @click.stop>
                    <button 
                      class="btn-edit-progress" 
                      @click="handleStartEditProgress(progressItem)"
                      title="编辑进度"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button 
                      class="btn-copy-progress" 
                      @click="handleCopyProgressText(progressItem.text)"
                      title="复制进度内容"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button 
                      class="btn-delete-progress" 
                      @click="handleDeleteProgress(progressItem.id)"
                      title="删除进度"
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
          <div v-else class="empty-detail">暂无进度记录</div>

          <div class="add-progress-section">
            <div class="add-progress-input-wrapper">
              <textarea
                v-model="progressInput"
                placeholder="添加进度描述（支持粘贴图片/视频）..."
                class="add-progress-input add-progress-textarea"
                rows="1"
                @input="adjustProgressTextareaHeight"
                @keydown.ctrl.enter="handleAddProgress"
                @paste="handleProgressPaste"
                ref="progressTextareaRef"
              ></textarea>
              <button 
                class="btn-add-progress-image" 
                @click="handleSelectProgressImage"
                title="添加进度图片"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </button>
              <button 
                class="btn-add-progress" 
                @click="handleAddProgress"
                title="添加进度"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            <div v-if="previewImages.length > 0" class="progress-images-preview">
              <div 
                v-for="(image, index) in previewImages" 
                :key="index" 
                class="preview-image-item"
              >
                <video 
                  v-if="isVideo(image.fileName)"
                  :src="image.base64" 
                  class="preview-video"
                  controls
                  preload="metadata"
                ></video>
                <img 
                  v-else
                  :src="image.base64" 
                  alt="预览" 
                />
                <button 
                  class="btn-remove-preview-image" 
                  @click="handleRemoveProgressImage(index)"
                  :title="isVideo(image.fileName) ? '删除视频' : '删除图片'"
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
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useOrgStore } from '../stores/org'
import { formatDate, formatDueDate, getDueDateStatus, calculateTaskDuration } from '../utils/date'
import { aiBreakdownTask, generateTaskSummary } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'
import { resolveMediaSource, selectMedia, uploadMediaDataUrl } from '../utils/media'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const appStore = useAppStore()
const todoStore = useTodoStore()
const orgStore = useOrgStore()
const electronAPI = window.electronAPI

// 图片缓存 - 存储图片的 base64 数据
const imageCache = ref({})
const progressImageCache = ref({})
const subtaskImageCache = ref({})

// 编辑状态
const isEditing = ref(false)
const editText = ref('')
const editInputRef = ref(null)
const showTaskMenu = ref(false)
const showDetails = ref(false)
const isDragging = ref(false)

// 到期时间编辑状态
const isEditingDueDate = ref(false)
const editDueDate = ref('')
const dueDateInputRef = ref(null)

// AI 拆解状态
const isAIBreakingDown = ref(false)
const isGeneratingTaskSummary = ref(false)

// 子任务拖拽状态
const draggedSubtaskId = ref(null)
const draggedSubtaskIndex = ref(null)
const dragOverIndex = ref(null)

// 子任务内联添加/编辑状态
const newSubtaskText = ref('')
const newSubtaskInputRef = ref(null)
const editingSubtaskId = ref(null)
const editingSubtaskText = ref('')
const editSubtaskInputRef = ref(null)

// 进度记录输入
const progressInput = ref('')
const progressTextareaRef = ref(null)

// 进度编辑状态
const editingProgressId = ref(null)
const editingProgressText = ref('')
// 用于预览的图片数据（base64）
const progressImagePreviews = ref({})
// 当前任务的进度图片文件名列表
const currentProgressImagesRef = computed(() => {
  return todoStore.currentProgressImages[props.task.id] || []
})
// 预览图片列表
const previewImages = computed(() => {
  const fileNames = currentProgressImagesRef.value
  return fileNames.map(fileName => ({
    fileName,
    base64: progressImagePreviews.value[fileName]
  })).filter(item => item.base64)
})

// 子任务评论输入
// 已移除子任务评论功能

// 计算耗时
const duration = computed(() => {
  if (props.task.completed && props.task.completedAt) {
    return calculateTaskDuration(props.task.startedAt, props.task.completedAt)
  }
  return null
})

const priorityLabel = computed(() => {
  if (props.task.priority === 'high') return '高'
  if (props.task.priority === 'medium') return '中'
  return '低'
})

const canManageTask = computed(() => !orgStore.isServerMode || orgStore.isAdmin)

const assigneeLabel = computed(() => {
  if (!orgStore.isServerMode) return ''
  const assigneeId = props.task.assigneeId
  if (!assigneeId) return '未分配'
  const matched = (orgStore.members || []).find(member => String(member.id) === String(assigneeId))
  return matched ? matched.name : String(assigneeId)
})

const completedSubtaskCount = computed(() => {
  if (!props.task.subtasks || props.task.subtasks.length === 0) return 0
  return props.task.subtasks.filter(st => st.completed).length
})

const subtaskSummary = computed(() => {
  if (!props.task.subtasks || props.task.subtasks.length === 0) {
    return '暂无子任务'
  }
  return `已完成 ${completedSubtaskCount.value}/${props.task.subtasks.length} 个子任务`
})

const sortedSubtasks = computed(() => {
  if (!props.task.subtasks || props.task.subtasks.length === 0) {
    return []
  }

  return [...props.task.subtasks].sort((a, b) => {
    const aCompleted = a.completed === true
    const bCompleted = b.completed === true
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1

    const aHasOrder = Number.isFinite(a.order)
    const bHasOrder = Number.isFinite(b.order)
    if (aHasOrder && bHasOrder) {
      return a.order - b.order
    }
    if (aHasOrder !== bHasOrder) {
      return aHasOrder ? -1 : 1
    }

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return aCreated - bCreated
  })
})

const taskStatus = computed(() => {
  if (props.task.status) return props.task.status
  return props.task.completed ? 'done' : 'todo'
})

const primaryActionLabel = computed(() => {
  if (taskStatus.value === 'todo') return '开始'
  if (taskStatus.value === 'doing') return '完成'
  return ''
})

const secondaryActionLabel = computed(() => {
  if (taskStatus.value === 'doing') return '后退'
  if (taskStatus.value === 'done') return '后退'
  return ''
})

const showPrimaryAction = computed(() => taskStatus.value !== 'done')
const showSecondaryAction = computed(() => taskStatus.value !== 'todo')

// 判断文件是否为视频
function isVideo(fileName) {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  return videoExts.includes(ext)
}

function toggleTaskMenu(event) {
  if (!canManageTask.value) return
  event.stopPropagation()
  showTaskMenu.value = !showTaskMenu.value
}

function toggleTaskDetails(event) {
  event.stopPropagation()
  showTaskMenu.value = false
  showDetails.value = !showDetails.value
}

function closeTaskDetails() {
  showDetails.value = false
}

function handleDragStart(event) {
  if (isEditing.value) return
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(props.task.id))
}

function handleDragEnd() {
  isDragging.value = false
}

async function openDetailsForSubtask() {
  showTaskMenu.value = false
  showDetails.value = true
  await nextTick()
}

function handleOutsideClick() {
  showTaskMenu.value = false
}

// 加载图片/视频数据
async function loadImage(fileName) {
  if (imageCache.value[fileName]) {
    return // 已加载，跳过
  }

  const result = await resolveMediaSource(fileName)
  if (result.success) {
    imageCache.value[fileName] = result.src
  }
}

// 加载进度图片/视频
async function loadProgressImage(fileName) {
  if (progressImageCache.value[fileName]) {
    return // 已加载，跳过
  }

  const result = await resolveMediaSource(fileName)
  if (result.success) {
    progressImageCache.value[fileName] = result.src
  }
}

// 加载子任务图片/视频
async function loadSubtaskImage(fileName) {
  if (subtaskImageCache.value[fileName]) {
    return // 已加载，跳过
  }

  const result = await resolveMediaSource(fileName)
  if (result.success) {
    subtaskImageCache.value[fileName] = result.src
  }
}

// 加载所有图片
onMounted(async () => {
  window.addEventListener('click', handleOutsideClick)
  // 加载任务图片
  if (props.task.images && props.task.images.length > 0) {
    await Promise.all(
      props.task.images.map(image => loadImage(image))
    )
  }
  
  // 加载进度图片
  if (props.task.progress && props.task.progress.length > 0) {
    const allProgressImages = props.task.progress.flatMap(p => p.images || [])
    if (allProgressImages.length > 0) {
      await Promise.all(
        allProgressImages.map(image => loadProgressImage(image))
      )
    }
  }
  
  // 加载子任务图片
  if (props.task.subtasks && props.task.subtasks.length > 0) {
    const allSubtaskImages = props.task.subtasks.flatMap(st => st.images || [])
    if (allSubtaskImages.length > 0) {
      await Promise.all(
        allSubtaskImages.map(image => loadSubtaskImage(image))
      )
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
})

// 任务操作
async function handleToggle() {
  await todoStore.toggleTask(props.task.id)
}

async function handleComplete() {
  const status = props.task.status || (props.task.completed ? 'done' : 'todo')
  if (status === 'todo') {
    await todoStore.setTaskStatus(props.task.id, 'doing')
  } else if (status === 'doing') {
    await todoStore.setTaskStatus(props.task.id, 'done')
  }
}

async function handleRollback() {
  const status = props.task.status || (props.task.completed ? 'done' : 'todo')
  if (status === 'done') {
    await todoStore.setTaskStatus(props.task.id, 'doing')
  } else if (status === 'doing') {
    await todoStore.setTaskStatus(props.task.id, 'todo')
  }
}

async function handleTogglePin() {
  await todoStore.togglePinTask(props.task.id)
  showTaskMenu.value = false
}

// 开始编辑
function handleStartEdit() {
  if (!canManageTask.value) {
    appStore.toast('只有管理员可以编辑任务')
    return
  }
  isEditing.value = true
  editText.value = props.task.text
  showTaskMenu.value = false
  // 聚焦输入框
  setTimeout(() => {
    if (editInputRef.value) {
      editInputRef.value.focus()
      // 自动调整高度
      editInputRef.value.style.height = 'auto'
      editInputRef.value.style.height = editInputRef.value.scrollHeight + 'px'
    }
  }, 0)
}

// 保存编辑
async function handleSaveEdit() {
  const newText = editText.value.trim()
  if (!newText) {
    appStore.toast('任务内容不能为空')
    return
  }
  
  if (newText !== props.task.text) {
    await todoStore.updateTask(props.task.id, { text: newText })
    appStore.toast('任务已更新')
  }
  
  isEditing.value = false
  editText.value = ''
}

// 取消编辑
function handleCancelEdit() {
  isEditing.value = false
  editText.value = ''
}

// 复制进度内容
async function handleCopyProgressText(text) {
  try {
    await navigator.clipboard.writeText(text)
    appStore.toast('进度内容已复制')
  } catch (err) {
    appStore.toast('复制失败')
  }
}

async function handleDelete() {
  if (!canManageTask.value) {
    appStore.toast('只有管理员可以删除任务')
    showTaskMenu.value = false
    return
  }
  const confirmed = await appStore.confirm('确定要删除这个任务吗？')
  if (confirmed) {
    await todoStore.deleteTask(props.task.id)
  }
  showTaskMenu.value = false
}

async function handleConfirmAddSubtask() {
  const text = newSubtaskText.value.trim()
  if (!text) {
    // 如果为空，取消添加
    handleCancelAddSubtask()
    return
  }
  
  await todoStore.addSubtask(props.task.id, text)
  newSubtaskText.value = ''
  
  nextTick(() => {
    if (newSubtaskInputRef.value) {
      newSubtaskInputRef.value.focus()
    }
  })
}

function handleCancelAddSubtask() {
  newSubtaskText.value = ''
}

// 开始编辑子任务
async function handleStartEditSubtask(subtask) {
  editingSubtaskId.value = subtask.id
  editingSubtaskText.value = subtask.text
  
  await nextTick()
  if (editSubtaskInputRef.value && editSubtaskInputRef.value[0]) {
    editSubtaskInputRef.value[0].focus()
    // 自动调整高度
    editSubtaskInputRef.value[0].style.height = 'auto'
    editSubtaskInputRef.value[0].style.height = editSubtaskInputRef.value[0].scrollHeight + 'px'
  }
}

// 保存子任务编辑
async function handleSaveEditSubtask(subtaskId) {
  const newText = editingSubtaskText.value.trim()
  if (!newText) {
    appStore.toast('子任务内容不能为空')
    return
  }
  
  await todoStore.updateSubtask(props.task.id, subtaskId, { text: newText })
  editingSubtaskId.value = null
  editingSubtaskText.value = ''
}

// 取消子任务编辑
function handleCancelEditSubtask() {
  editingSubtaskId.value = null
  editingSubtaskText.value = ''
}

// 切换子任务权重 (优先级)
async function handleCycleSubtaskWeight(subtask) {
  // 权重循环: 1(低) -> 3(中) -> 5(高) -> 1(低)
  let newWeight = 1
  if (subtask.weight === 1) newWeight = 3
  else if (subtask.weight === 3) newWeight = 5
  else newWeight = 1
  
  await todoStore.updateSubtask(props.task.id, subtask.id, { weight: newWeight })
}

// AI 智能拆解任务
async function handleAIBreakdown() {
  try {
    showTaskMenu.value = false
    // 检查是否有 API 密钥
    // 获取 API 密钥
    const keyResult = await electronAPI.getDeepSeekKey()
    if (!keyResult.success || !keyResult.key) {
      appStore.toast('请先在设置中配置 DeepSeek API 密钥')
      return
    }

    isAIBreakingDown.value = true
    appStore.showAILoadingDialog = true
    
    try {
      // 调用 AI 拆解（使用工具类）
      const subtasks = await aiBreakdownTask(props.task.text, keyResult.key)
      
      appStore.showAILoadingDialog = false
      
      if (!subtasks || subtasks.length === 0) {
        appStore.toast('AI 未能生成有效的子任务建议')
        return
      }

      // 通过事件总线或全局状态显示对话框
      window.dispatchEvent(new CustomEvent('show-subtask-suggestion', {
        detail: {
          taskId: props.task.id,
          subtasks: subtasks
        }
      }))
    } catch (error) {
      appStore.showAILoadingDialog = false
      appStore.toast('AI 拆解失败：' + error.message)
    }

  } catch (error) {
    console.error('AI 拆解失败:', error)
    appStore.showAILoadingDialog = false
    appStore.toast('AI 拆解失败：' + error.message)
  } finally {
    isAIBreakingDown.value = false
  }
}

function buildTaskSummaryPayload() {
  return {
    text: props.task.text,
    completed: props.task.completed,
    status: props.task.status,
    priority: props.task.priority,
    createdAt: props.task.createdAt,
    dueDate: props.task.dueDate,
    completedAt: props.task.completedAt,
    subtasks: (props.task.subtasks || []).map(subtask => ({
      text: subtask.text,
      completed: subtask.completed,
      requiresInput: subtask.requiresInput
    })),
    progress: (props.task.progress || []).map(item => ({
      text: item.text,
      createdAt: item.createdAt
    }))
  }
}

async function handleAISummary() {
  if (isGeneratingTaskSummary.value) return
  showTaskMenu.value = false
  let summary = ''

  try {
    isGeneratingTaskSummary.value = true
    appStore.showAILoadingDialog = true
    const summaryTask = buildTaskSummaryPayload()

    const hasDeepSeekResult = await electronAPI.hasDeepSeekKey()
    if (hasDeepSeekResult.success && hasDeepSeekResult.hasKey) {
      const deepSeekKeyResult = await electronAPI.getDeepSeekKey()
      if (deepSeekKeyResult.success && deepSeekKeyResult.key) {
        summary = await generateTaskSummary(summaryTask, deepSeekKeyResult.key)
      }
    }

    if (!summary) {
      const doubaoConfigResult = await electronAPI.getDoubaoConfig()
      if (doubaoConfigResult && doubaoConfigResult.success && doubaoConfigResult.key) {
        const doubaoClient = new DoubaoClient(
          doubaoConfigResult.key,
          doubaoConfigResult.endpoint,
          doubaoConfigResult.model
        )
        summary = await doubaoClient.generateTaskSummary(summaryTask)
      }
    }

    if (!summary) {
      appStore.toast('请先在设置中配置 AI 密钥')
      return
    }

    appStore.aiSummaryContent = summary
    appStore.showAISummaryDialog = true
  } catch (error) {
    appStore.toast('AI 总结失败：' + error.message)
  } finally {
    isGeneratingTaskSummary.value = false
    appStore.showAILoadingDialog = false
  }
}

async function handleToggleSubtask(subtaskId) {
  const result = await todoStore.toggleSubtask(props.task.id, subtaskId)
  if (result && !result.success && result.message) {
    appStore.toast(result.message)
  }
}

async function handleDeleteSubtask(subtaskId) {
  await todoStore.deleteSubtask(props.task.id, subtaskId)
}

// 复制子任务文本
function handleCopySubtaskText(text) {
  if (!text) return
  
  navigator.clipboard.writeText(text).then(() => {
    appStore.toast('子任务内容已复制')
  }).catch(err => {
    console.error('复制失败:', err)
    appStore.toast('复制失败')
  })
}

// 子任务拖拽处理函数
function handleSubtaskDragStart(subtaskId, index, event) {
  draggedSubtaskId.value = subtaskId
  draggedSubtaskIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target.innerHTML)
  // 添加拖拽样式
  event.target.style.opacity = '0.5'
}

function handleSubtaskDragOver(index, event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  // 只在拖拽到不同位置时更新
  if (dragOverIndex.value !== index && draggedSubtaskIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function handleSubtaskDragEnter(index) {
  if (draggedSubtaskIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function handleSubtaskDragLeave() {
  // dragOverIndex.value = null
}

function handleSubtaskDrop(targetIndex, event) {
  event.preventDefault()
  event.stopPropagation()

  const orderedSubtasks = [...sortedSubtasks.value]
  const sourceIndex = orderedSubtasks.findIndex(st => st.id === draggedSubtaskId.value)

  if (sourceIndex < 0 || sourceIndex === targetIndex) {
    dragOverIndex.value = null
    return
  }

  const [movedSubtask] = orderedSubtasks.splice(sourceIndex, 1)
  orderedSubtasks.splice(targetIndex, 0, movedSubtask)

  todoStore.reorderSubtasks(
    props.task.id,
    orderedSubtasks.map(subtask => subtask.id)
  )

  // 重置状态
  dragOverIndex.value = null
}

function handleSubtaskDragEnd(event) {
  // 恢复透明度
  event.target.style.opacity = '1'
  
  // 重置所有拖拽状态
  draggedSubtaskId.value = null
  draggedSubtaskIndex.value = null
  dragOverIndex.value = null
}

function getWeightClass(weight) {
  if (weight === 5) return 'high'
  if (weight === 3) return 'medium'
  return 'low'
}

function getWeightText(weight) {
  if (weight === 5) return '高'
  if (weight === 3) return '中'
  return '低'
}

// 自动调整进度 textarea 高度
function adjustProgressTextareaHeight(event) {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

// 进度记录功能
async function handleAddProgress() {
  if (!progressInput.value.trim()) {
    return
  }
  
  // 获取当前待添加的图片列表
  const imagesToAdd = [...(todoStore.currentProgressImages[props.task.id] || [])]
  
  await todoStore.addProgress(props.task.id, progressInput.value)
  progressInput.value = ''
  
  // 重置 textarea 高度
  if (progressTextareaRef.value) {
    progressTextareaRef.value.style.height = 'auto'
  }
  
  // 立即加载新添加的进度图片
  if (imagesToAdd.length > 0) {
    await Promise.all(
      imagesToAdd.map(fileName => loadProgressImage(fileName))
    )
  }
  
  // 清空预览缓存
  for (const fileName of imagesToAdd) {
    delete progressImagePreviews.value[fileName]
  }
  
  appStore.toast('进度已添加')
}

async function handleDeleteProgress(progressId) {
  const confirmed = await appStore.confirm('确定要删除这条进度记录吗？')
  if (confirmed) {
    await todoStore.deleteProgress(props.task.id, progressId)
    appStore.toast('进度已删除')
  }
}

// 开始编辑进度
async function handleStartEditProgress(progressItem) {
  if (editingProgressId.value === progressItem.id) return
  editingProgressId.value = progressItem.id
  editingProgressText.value = progressItem.text
  // 等待 DOM 更新后聚焦输入框并自动调整高度
  await nextTick()
  const textarea = document.querySelector('.progress-edit-input')
  if (textarea) {
    textarea.focus()
    // 自动调整高度
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }
}

// 保存进度编辑
async function handleSaveProgressEdit(progressId) {
  const newText = editingProgressText.value.trim()
  if (!newText) {
    appStore.toast('进度描述不能为空')
    return
  }
  
  await todoStore.updateProgress(props.task.id, progressId, newText)
  editingProgressId.value = null
  editingProgressText.value = ''
  appStore.toast('进度已更新')
}

// 取消编辑进度
function handleCancelProgressEdit() {
  editingProgressId.value = null
  editingProgressText.value = ''
}

async function handleSelectProgressImage() {
  const result = await selectMedia()
  if (result.success && result.fileName) {
    // 确保响应式对象存在
    if (!todoStore.currentProgressImages[props.task.id]) {
      todoStore.currentProgressImages[props.task.id] = []
    }
    
    // 添加文件名到列表（用于保存）
    todoStore.currentProgressImages[props.task.id].push(result.fileName)
    
    if (result.previewSrc) {
      progressImagePreviews.value[result.fileName] = result.previewSrc
    }
    appStore.toast('图片已添加')
  }
}

// 处理进度输入框的粘贴事件（支持多文件）
async function handleProgressPaste(event) {
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

  // 确保响应式对象存在
  if (!todoStore.currentProgressImages[props.task.id]) {
    todoStore.currentProgressImages[props.task.id] = []
  }

  // 处理所有文件
  let successCount = 0
      for (const { file } of filesToProcess) {
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
          // 添加到当前进度图片列表
          todoStore.currentProgressImages[props.task.id].push(result.fileName)
          
          // 添加预览数据
          progressImagePreviews.value[result.fileName] = result.previewSrc || base64Data
          
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

function handleRemoveProgressImage(index) {
  if (todoStore.currentProgressImages[props.task.id]) {
    const fileName = todoStore.currentProgressImages[props.task.id][index]
    // 移除文件名
    todoStore.currentProgressImages[props.task.id].splice(index, 1)
    // 移除预览数据
    if (fileName && progressImagePreviews.value[fileName]) {
      delete progressImagePreviews.value[fileName]
    }
  }
}

// 子任务评论功能
// 处理子任务输入值变化
async function handleSubtaskInputChange(subtaskId) {
  const subtask = props.task.subtasks?.find(st => st.id === subtaskId)
  if (subtask) {
    await todoStore.updateSubtask(props.task.id, subtaskId, { inputValue: subtask.inputValue })
  }
}

// 检查子任务是否可以完成（需要输入的子任务必须有值）
function canCompleteSubtask(subtask) {
  if (subtask.requiresInput) {
    return subtask.inputValue && subtask.inputValue.trim() !== ''
  }
  return true
}

// 开始编辑到期时间
function handleStartEditDueDate() {
  isEditingDueDate.value = true
  // 如果已有到期时间，转换为 YYYY-MM-DD 格式
  if (props.task.dueDate) {
    const date = new Date(props.task.dueDate)
    editDueDate.value = date.toISOString().split('T')[0]
  } else {
    // 默认设置为今天
    const today = new Date()
    editDueDate.value = today.toISOString().split('T')[0]
  }
  // 聚焦到日期输入框
  setTimeout(() => {
    if (dueDateInputRef.value) {
      dueDateInputRef.value.focus()
    }
  }, 0)
}

// 保存到期时间
async function handleSaveDueDate() {
  if (!editDueDate.value) {
    appStore.toast('请选择到期时间')
    return
  }
  
  await todoStore.updateTask(props.task.id, { dueDate: editDueDate.value })
  isEditingDueDate.value = false
  editDueDate.value = ''
  appStore.toast('到期时间已更新')
}

// 取消编辑到期时间
function handleCancelEditDueDate() {
  isEditingDueDate.value = false
  editDueDate.value = ''
}

// 移除到期时间
async function handleRemoveDueDate() {
  await todoStore.updateTask(props.task.id, { dueDate: null })
  isEditingDueDate.value = false
  editDueDate.value = ''
  appStore.toast('到期时间已移除')
}
</script>



