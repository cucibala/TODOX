<template>
  <div class="chat-page" :class="{ 'quick-input-mode': isQuickInputMode, 'quick-input-expanded': isQuickInputMode && isQuickInputExpanded }">
    <!-- 会话列表侧边栏 -->
    <div v-show="!isQuickInputMode" class="conversations-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed">对话</h3>
        <button class="btn-new-conversation" @click="handleNewConversation" :title="sidebarCollapsed ? '新对话' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span v-if="!sidebarCollapsed">新对话</span>
        </button>
      </div>
      
      <div class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === currentConversationId }"
          @click="handleSelectConversation(conv.id)"
        >
          <div class="conversation-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="conversation-info" v-if="!sidebarCollapsed">
            <div class="conversation-title">{{ conv.title }}</div>
            <div class="conversation-time">{{ formatConversationTime(conv.updatedAt) }}</div>
          </div>
          <button 
            class="btn-delete-conversation" 
            v-if="!sidebarCollapsed"
            @click.stop="handleDeleteConversation(conv.id)"
            title="删除对话"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <button class="btn-toggle-sidebar" @click="sidebarCollapsed = !sidebarCollapsed" title="收起/展开">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="sidebarCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
        </svg>
      </button>
    </div>

    <!-- 聊天主区域 -->
    <div class="chat-main">
      <div v-show="!isQuickInputMode" class="chat-header">
        <div class="chat-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <h2>{{ currentConversationTitle }}</h2>
        </div>
        
        <div class="header-actions">
          <!-- 模型选择器 -->
          <div class="model-selector">
            <button 
              class="btn-model-toggle" 
              @click="handleToggleModel"
              :title="`当前模型: ${appStore.currentAIModel === 'deepseek' ? 'DeepSeek' : '豆包'}`"
            >
              <svg v-if="appStore.currentAIModel === 'deepseek'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>{{ appStore.currentAIModel === 'deepseek' ? 'DeepSeek' : '豆包' }}</span>
            </button>
          </div>
          
          <!-- 思考模式开关 -->
          <div class="reasoning-toggle">
            <button 
              class="btn-reasoning-toggle" 
              :class="{ active: appStore.enableReasoningMode }"
              @click="handleToggleReasoning"
              :title="appStore.enableReasoningMode ? '思考模式：开启' : '思考模式：关闭'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>{{ appStore.enableReasoningMode ? '思考中' : '普通' }}</span>
            </button>
          </div>

          <!-- 计划生成器 -->
          <div class="plan-generator-toggle">
            <button
              class="btn-plan-generator"
              @click="handleGeneratePlanQuick"
              :disabled="isLoading || !currentRole.enableProjects"
              title="生成计划并自动导入（可自动创建项目）"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>生成计划</span>
            </button>
          </div>
        </div>
        
        <!-- 项目详情下拉（仅项目助手角色显示且已有消息） -->
        <div v-if="currentRole.enableProjects && selectedProjectIds.length > 0 && messages.length > 0" class="project-viewer">
          <button 
            class="btn-view-projects"
            @click="showProjectSelector = !showProjectSelector"
            title="查看关联项目"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          
          <!-- 项目查看下拉菜单 -->
          <div v-if="showProjectSelector" class="project-dropdown project-dropdown-readonly" @click.stop>
            <div class="project-dropdown-header">
              <span>关联的项目</span>
              <button @click="showProjectSelector = false" class="btn-close-dropdown">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="project-dropdown-list">
              <div 
                v-for="project in projectStore.projects.filter(p => selectedProjectIds.includes(p.id))" 
                :key="project.id"
                class="project-dropdown-item project-dropdown-item-readonly"
              >
                <div class="project-color-indicator" :style="{ backgroundColor: project.color }"></div>
                <span class="project-name">{{ project.name }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button class="btn-clear" @click="handleClearHistory" title="清空当前对话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <div class="chat-container">
        <div v-if="showQuickStatusBar" class="quick-status-bar">
          <div class="quick-status-left">
            <button class="quick-status-btn" @click="handleOpenMainPage" title="打开页面">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12l9-9 9 9"></path>
                <path d="M4 10v10a2 2 0 0 0 2 2h4"></path>
                <path d="M14 22h4a2 2 0 0 0 2-2V10"></path>
              </svg>
            </button>
            <button class="quick-status-btn" @click="handleQuickNewConversation" title="新建对话">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
              </svg>
            </button>
          </div>
          <div class="quick-status-right">
            <button class="quick-status-btn" @click="handleQuickClose" title="关闭窗口">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="validMessages.length === 0" class="chat-welcome">
            <div class="welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h3>你好！我是 DeepSeek AI 助手</h3>
            <p>我可以帮助你解答问题、提供建议、编写代码等。请开始对话吧！</p>
          </div>

          <div 
            v-for="(message, index) in validMessages" 
            :key="index" 
            class="message-item"
            :class="[message.role, { 'progress-message': message.isProgress }]"
          >
            <div class="message-avatar">
              <svg v-if="message.role === 'assistant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <svg v-else-if="message.role === 'tool'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L3 18v3h3l7.5-7.5a3 3 0 0 0 4.2-4.2l-3-3z"></path>
                <path d="M8.5 13.5l2 2"></path>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="message-content">
              <!-- 思考内容（推理模型） -->
              <div v-if="message.reasoning_content" class="reasoning-section">
                <div class="reasoning-header" @click="toggleReasoning(message)">
                  <svg class="reasoning-icon" :class="{ expanded: message.showReasoning }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <span class="reasoning-label">💭 思考过程</span>
                  <span class="reasoning-badge">{{ message.reasoning_content.length }} 字</span>
                </div>
                <div v-if="message.showReasoning" class="reasoning-content">
                  {{ message.reasoning_content }}
                </div>
              </div>
              
              <div v-if="message.pendingToolCall" class="tool-approval-card">
                <div class="tool-approval-title">需要确认</div>
                <div class="tool-approval-desc">{{ getToolSummary(message.pendingToolCall) }}</div>
                <div class="tool-approval-actions" v-if="message.pendingToolCall.status === 'pending'">
                  <button class="tool-approval-btn confirm" @click="chatStore.resolveToolApproval(message.pendingToolCall.id, true)">允许</button>
                  <button class="tool-approval-btn cancel" @click="chatStore.resolveToolApproval(message.pendingToolCall.id, false)">取消</button>
                </div>
                <div v-else class="tool-approval-desc">{{ message.content }}</div>
              </div>

              <template v-else-if="message.role === 'tool'">
                <ToolTaskList
                  v-if="parseToolContent(message)?.type === 'tasks'"
                  :tasks="parseToolContent(message).tasks"
                  title="任务结果"
                />
                <div v-else-if="parseToolContent(message)?.type === 'error'" class="message-text">
                  工具执行失败：{{ parseToolContent(message).error }}
                </div>
                <div v-else-if="parseToolContent(message)?.type === 'canceled'" class="message-text">
                  已取消操作
                </div>
              </template>

              <!-- 文本内容 -->
              <div class="message-text" v-else-if="typeof message.content === 'string'">{{ message.content }}</div>
              
              <!-- 多模态内容（文本+图片） -->
              <template v-else-if="Array.isArray(message.content)">
                <div 
                  v-for="(part, idx) in message.content" 
                  :key="idx"
                  class="message-part"
                >
                  <div v-if="part.type === 'text'" class="message-text">{{ part.text }}</div>
                  <img 
                    v-else-if="part.type === 'image_url'" 
                    :src="part.image_url.url"
                    class="message-image"
                    @click="appStore.viewerImageSrc = part.image_url.url; appStore.showImageViewer = true"
                    alt="用户图片"
                  />
                </div>
              </template>
              
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>
        </div>

        <div class="chat-input-area" ref="quickInputArea">
          <div class="input-wrapper">
            <!-- 角色选择器（输入框左侧） -->
            <div v-if="!isQuickInputMode" class="input-role-selector">
              <button 
                class="btn-role-selector"
                @click="showInputRoleSelector = !showInputRoleSelector"
                :style="{ color: currentRole.color }"
                :title="currentRole.name"
                :class="{ 'is-unselected': !currentRoleId }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="currentRole.icon"></svg>
              </button>
              
              <!-- 角色下拉菜单 -->
              <div v-if="showInputRoleSelector" class="input-role-dropdown" @click.stop>
                <div class="input-role-dropdown-header">
                  <span>选择 AI 角色</span>
                  <button @click="showInputRoleSelector = false" class="btn-close-dropdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="input-role-dropdown-list">
                  <div 
                    v-for="role in availableRoles" 
                    :key="role.id"
                    class="input-role-item"
                    :class="{ selected: currentRoleId === role.id }"
                    @click="handleSelectRole(role.id)"
                  >
                    <div class="role-icon-mini" :style="{ backgroundColor: role.color + '20', color: role.color }">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="role.icon"></svg>
                    </div>
                    <div class="role-info-mini">
                      <div class="role-name-mini">{{ role.name }}</div>
                      <div class="role-description-mini">{{ role.description }}</div>
                    </div>
                    <div v-if="currentRoleId === role.id" class="role-check-mini">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
            
            <!-- 图片预览区域 -->
            <div v-if="selectedImages.length > 0" class="image-preview-container">
              <div v-for="(img, index) in selectedImages" :key="index" class="image-preview-item">
                <img :src="img.preview" :alt="`预览${index + 1}`" />
                <button class="btn-remove-image" @click="removeImage(index)" title="删除图片">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- 输入区域 -->
            <div v-if="isQuickInputMode" class="input-main-area quick-input-layout">
              <div class="input-text-row">
                <div class="input-text-wrapper">
                  <textarea
                    v-model="userInput"
                    @keydown.ctrl.enter="handleSend"
                    placeholder="输入消息... (Ctrl+Enter 发送)"
                    ref="inputTextarea"
                    rows="1"
                    @paste="handlePaste"
                    @input="adjustTextareaHeight"
                  ></textarea>
                </div>
              </div>
              <div class="quick-input-toolbar">
                <div class="quick-toolbar-left">
                  <button class="quick-chip" title="模型">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M3 12h18"></path>
                      <path d="M12 3a15 15 0 0 1 0 18"></path>
                      <path d="M12 3a15 15 0 0 0 0 18"></path>
                    </svg>
                    <span>{{ quickModelLabel }}</span>
                    <svg class="chip-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <button class="quick-icon-btn" title="提及">@</button>
                </div>
                <div class="quick-toolbar-right">
                  <button class="quick-icon-btn" title="链接">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-2 2"></path>
                      <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l2-2"></path>
                    </svg>
                  </button>
                  <button class="quick-icon-btn" title="剪切">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="6" cy="6" r="2"></circle>
                      <circle cx="6" cy="18" r="2"></circle>
                      <path d="M20 4l-8.5 8.5"></path>
                      <path d="M11.5 11.5L20 20"></path>
                    </svg>
                  </button>
                  <button
                    class="quick-send-btn"
                    @click="handleSend"
                    :disabled="!userInput.trim()"
                    title="发送"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="input-main-area">
              <div class="input-actions-left">
                <button 
                  class="btn-upload-image" 
                  @click="triggerImageUpload"
                  title="上传图片"
                  :disabled="isLoading"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </button>
                <input 
                  type="file" 
                  ref="imageInput" 
                  @change="handleImageSelect" 
                  accept="image/*"
                  multiple
                  style="display: none"
                />
              </div>
              
              <div class="input-text-wrapper">
                <textarea
                  v-model="userInput"
                  @keydown.ctrl.enter="handleSend"
                  placeholder="输入消息... (Ctrl+Enter 发送)"
                  ref="inputTextarea"
                  rows="1"
                  @paste="handlePaste"
                  @input="adjustTextareaHeight"
                ></textarea>
              </div>
              
              <div class="input-actions-right">
                <button
                  v-if="isLoading"
                  class="btn-cancel"
                  @click="chatStore.abortRequest"
                  title="取消"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                </button>
                <button
                  v-else
                  class="btn-send"
                  @click="handleSend"
                  :disabled="(!userInput.trim() && selectedImages.length === 0)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
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
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useChatStore } from '../stores/chat'
import { useProjectStore } from '../stores/project'
import { useTodoStore } from '../stores/todo'
import ToolTaskList from '../components/ToolTaskList.vue'

const appStore = useAppStore()
const chatStore = useChatStore()
const projectStore = useProjectStore()
const todoStore = useTodoStore()
const electronAPI = window.electronAPI
const QUICK_INPUT_EXPANDED_HEIGHT = 460
const QUICK_INPUT_COLLAPSED_MIN_HEIGHT = 96

// 使用 chatStore 的响应式状态
const { conversations, currentConversationId, messages, isLoading, userInput } = storeToRefs(chatStore)
const { isQuickInputMode } = storeToRefs(appStore)

function parseToolContent(message) {
  if (!message || message.role !== 'tool' || !message.content) return null
  if (typeof message.content !== 'string') return null
  try {
    const parsed = JSON.parse(message.content)
    const taskList = Array.isArray(parsed?.tasks) ? parsed.tasks : parsed
    if (Array.isArray(taskList) && taskList.every(item => item && item.id && item.text)) {
      return { type: 'tasks', tasks: taskList }
    }
    if (parsed && parsed.error) {
      return { type: 'error', error: parsed.error }
    }
    if (parsed && parsed.canceled) {
      return { type: 'canceled' }
    }
  } catch (error) {
    return null
  }
  return null
}

function getToolSummary(pendingToolCall) {
  if (!pendingToolCall) return ''
  const { name, args } = pendingToolCall
  const projectName = args?.projectId
    ? projectStore.projects.find(p => p.id === args.projectId)?.name
    : ''
  const taskName = args?.taskId
    ? todoStore.todos.find(t => t.id === args.taskId)?.text
    : ''
  if (name === 'addSubtask') {
    return `将为任务「${taskName || '未识别'}」添加子任务：${args?.text || ''}`
  }
  if (name === 'addTask') {
    return `将为项目「${projectName || '未识别'}」添加任务：${args?.taskDescription || ''}`
  }
  if (name === 'updateTask') {
    return `将更新任务「${taskName || '未识别'}」`
  }
  if (name === 'updateTaskSubtasks') {
    return `将修改任务「${taskName || '未识别'}」的子任务`
  }
  if (name === 'deleteTasks') {
    return `将删除 ${args?.taskIds?.length || 0} 个任务`
  }
  if (name === 'deleteSubtasks') {
    return `将删除 ${args?.subtaskIds?.length || 0} 个子任务`
  }
  if (name === 'addProjectTasks') {
    return `将为项目「${projectName || '未识别'}」添加新任务`
  }
  if (name === 'createProjectWithTasks') {
    return `将创建项目：${args?.projectName || ''}`
  }
  if (name === 'editSubtask') {
    return `将编辑任务「${taskName || '未识别'}」的子任务`
  }
  return `将执行操作：${name}`
}

function isProjectListJson(content) {
  if (typeof content !== 'string') return false
  const text = content.trim()
  if (!text.startsWith('[') || !text.endsWith(']')) return false
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed) || parsed.length === 0) return false
    return parsed.every(item =>
      item &&
      typeof item === 'object' &&
      'id' in item &&
      'name' in item &&
      'taskCount' in item &&
      'completedCount' in item
    )
  } catch (error) {
    return false
  }
}

function isProjectListFragment(content) {
  if (typeof content !== 'string') return false
  const text = content.trim()
  if (!text) return false
  const hasKeys = ['"id"', '"name"', '"color"', '"taskCount"', '"completedCount"']
    .every(key => text.includes(key))
  if (!hasKeys) return false
  return text.includes('{') && text.includes('}')
}

// 过滤有效的消息（排除 undefined/null/空消息）
const validMessages = computed(() => {
  return messages.value.filter(msg => {
    if (!msg) return false
    if (msg.pendingToolCall) return true
    if (msg.role === 'tool') {
      return !!parseToolContent(msg)
    }
    // 允许显示进度消息
    // if (msg.isProgress) return false
    
    // 如果有思考内容，显示
    if (msg.reasoning_content && msg.reasoning_content.trim()) {
      return true
    }
    
    // 检查文本内容
    if (typeof msg.content === 'string') {
      if (isProjectListJson(msg.content) || isProjectListFragment(msg.content)) return false
      return msg.content.trim().length > 0
    }
    
    // 检查多模态内容
    if (Array.isArray(msg.content)) {
      return msg.content.some(part => {
        if (part.type === 'text' && part.text && part.text.trim()) {
          return true
        }
        if (part.type === 'image_url') {
          return true
        }
        return false
      })
    }
    
    return false
  })
})

// 本地UI状态
const messagesContainer = ref(null)
const inputTextarea = ref(null)
const imageInput = ref(null)
const sidebarCollapsed = ref(false)
const quickInputArea = ref(null)
const quickInputHasSessionMessages = ref(false)
const isQuickInputExpanded = ref(false)

// 输入框角色选择器
const showInputRoleSelector = ref(false)

// 项目选择器
const showProjectSelector = ref(false)

// 图片上传状态
const selectedImages = ref([])

// 使用 chatStore 的计算属性
const currentRoleId = computed(() => chatStore.currentRoleId)
const currentConversationTitle = computed(() => chatStore.currentConversationTitle)
const selectedProjectIds = computed(() => chatStore.selectedProjectIds)
const showQuickStatusBar = computed(() => isQuickInputMode.value && isQuickInputExpanded.value)
const quickModelLabel = computed(() => (appStore.currentAIModel === 'doubao' ? '豆包' : 'DS V3.2'))

// 定义可用角色
const availableRoles = [
  {
    id: 'general',
    name: '通用助手',
    description: '适合日常对话、问答、知识咨询',
    color: '#8A9DFB',
    icon: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>',
    systemPrompt: '你是一个友好、专业的 AI 助手，擅长回答各种问题，提供有价值的建议和信息。',
    enableTools: false,
    enableProjects: false
  },
  {
    id: 'project',
    name: '项目助手',
    description: '帮助管理任务、项目、制定计划',
    color: '#4ECDC4',
    icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
    systemPrompt: '你是一个专业的项目管理助手，擅长帮助用户管理任务、制定计划、跟踪进度。你可以查询用户的任务和项目数据，并提供个性化的建议。',
    enableTools: true,
    enableProjects: true
  },
  {
    id: 'task',
    name: '任务助手',
    description: '快速查询任务、增删改查、管理子任务',
    color: '#f6ad55',
    icon: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
    systemPrompt: '你是一个任务助手，专注于任务/子任务的增删改查。优先调用工具，工具结果不要复述，只需简短确认。',
    enableTools: true,
    enableProjects: true
  },
  // 可以在这里继续添加更多角色
  // {
  //   id: 'code',
  //   name: '编程助手',
  //   description: '专注于编程、代码审查、技术问题',
  //   color: '#FF6B6B',
  //   icon: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  //   systemPrompt: '你是一个专业的编程助手...',
  //   enableTools: false,
  //   enableProjects: false
  // }
]

// 当前角色
const currentRole = computed(() => {
  if (!currentRoleId.value) {
    // 未设置角色时显示默认提示
    return {
      id: null,
      name: '选择角色',
      description: '点击选择 AI 角色',
      color: '#999',
      icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
      systemPrompt: '',
      enableTools: false,
      enableProjects: false
    }
  }
  return availableRoles.find(r => r.id === currentRoleId.value) || availableRoles[0]
})

async function handleGeneratePlanQuick() {
  if (!currentRole.value.enableProjects) {
    appStore.toast('请先选择“项目助手”角色')
    return
  }

  const description = (userInput.value || '').trim()
  if (!description) {
    appStore.toast('请输入计划需求描述')
    nextTick(() => inputTextarea.value?.focus())
    return
  }

  const preferredProjectId = selectedProjectIds.value?.[0] || projectStore.currentProjectId || null
  userInput.value = ''

  await chatStore.generateProjectPlan({
    projectId: preferredProjectId,
    description,
    days: 7,
    detailLevel: 'brief'
  })
  nextTick(() => scrollToBottom())
}

// 注意：showProjectSelector 和 selectedProjectIds 已在上面声明

// 检查并获取 API 密钥
async function checkApiKey() {
  const result = await electronAPI.getDeepSeekKey()
  if (!result.success || !result.key) {
    appStore.toast('请先在设置中配置 DeepSeek API 密钥')
    appStore.currentPage = 'settings'
    return false
  }
  
  // 创建 DeepSeek 客户端
  deepseekClient.value = new DeepSeekClient(result.key)
  
  return true
}

// 生成对话标题（从第一条用户消息）
function generateConversationTitle(firstMessage) {
  const maxLength = 20
  if (firstMessage.length <= maxLength) {
    return firstMessage
  }
  return firstMessage.substring(0, maxLength) + '...'
}

// 创建新对话（简化版，不需要选择角色）
function handleNewConversation() {
  chatStore.createNewConversation()
  nextTick(() => scrollToBottom())
}

// 选择角色（从输入框选择器）
function handleSelectRole(roleId) {
  // 如果已经有消息了，不允许修改
  if (messages.value.length > 0) {
    appStore.toast('对话已开始，无法更改角色')
    showInputRoleSelector.value = false
    return
  }
  
  // 设置角色
  const role = availableRoles.find(r => r.id === roleId)
  chatStore.setConversationRole(roleId, role?.enableProjects ? [] : [])
  
  // 如果不是项目助手，关闭选择器
  if (!role?.enableProjects) {
    showInputRoleSelector.value = false
  }
  // 如果是项目助手，保持选择器打开，让用户选择项目
}

// 确认项目选择（仅用于首次设置项目助手）
function confirmNewConversation() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = [...newConversationProjects.value]
    chatStore.saveConversations()
  }
  showNewConversationDialog.value = false
  appStore.toast('项目关联已设置')
}

// 取消项目选择
function cancelNewConversation() {
  showNewConversationDialog.value = false
}

// 选择对话
function handleSelectConversation(convId) {
  if (currentConversationId.value === convId) return
  chatStore.selectConversation(convId)
  nextTick(() => scrollToBottom())
}

// 删除对话
async function handleDeleteConversation(convId) {
  await chatStore.deleteConversation(convId)
}

// 切换模型
function handleToggleModel() {
  const newModel = appStore.currentAIModel === 'deepseek' ? 'doubao' : 'deepseek'
  appStore.currentAIModel = newModel
  appStore.toast(`已切换到 ${newModel === 'deepseek' ? 'DeepSeek' : '豆包'} 模型`)
  
  // 保存到本地存储
  localStorage.setItem('todox_ai_model', newModel)
}

// 切换思考模式
function handleToggleReasoning() {
  appStore.enableReasoningMode = !appStore.enableReasoningMode
  const status = appStore.enableReasoningMode ? '开启' : '关闭'
  appStore.toast(`思考模式已${status}`)
  
  // 保存到本地存储
  localStorage.setItem('todox_reasoning_mode', appStore.enableReasoningMode ? 'true' : 'false')
}

// 触发图片上传
function triggerImageUpload() {
  imageInput.value?.click()
}

// 处理图片选择
async function handleImageSelect(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  for (const file of files) {
    // 限制图片大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      appStore.toast(`图片 ${file.name} 超过 10MB，已跳过`)
      continue
    }
    
    // 读取图片并转换为 base64
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImages.value.push({
        file,
        preview: e.target.result,
        base64: e.target.result.split(',')[1], // 只保留 base64 部分
        mimeType: file.type
      })
    }
    reader.readAsDataURL(file)
  }
  
  // 清空input，允许重复选择同一文件
  event.target.value = ''
}

async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  const imageItems = Array.from(items).filter(item => item.type?.startsWith('image/'))
  if (imageItems.length === 0) return

  event.preventDefault()

  for (const item of imageItems) {
    const file = item.getAsFile()
    if (!file) continue

    if (file.size > 10 * 1024 * 1024) {
      appStore.toast(`图片 ${file.name || '剪贴板图片'} 超过 10MB，已跳过`)
      continue
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImages.value.push({
        file,
        preview: e.target.result,
        base64: e.target.result.split(',')[1],
        mimeType: file.type
      })
    }
    reader.readAsDataURL(file)
  }
}

// 移除图片
function removeImage(index) {
  selectedImages.value.splice(index, 1)
}

// 发送消息
async function handleSend() {
  const message = userInput.value.trim()
  const hasImages = selectedImages.value.length > 0
  
  if (!message && !hasImages) return
  
  // 准备图片数据
  const images = selectedImages.value.map(img => ({
    base64: img.base64,
    mimeType: img.mimeType
  }))
  
  // 立即清空输入框和图片（发送前）
  userInput.value = ''
  selectedImages.value = []
  resetTextareaHeight()
  
  // 调用 chatStore 发送消息（后台运行）
  const sent = await chatStore.sendMessage(
    message || '查看图片',
    images,
    { detach: isQuickInputMode.value }
  )
  
  if (sent) {
    scrollToBottom()
  }

  if (isQuickInputMode.value && sent) {
    electronAPI?.setQuickInputHasMessages?.(true)
    quickInputHasSessionMessages.value = true
    resizeQuickInputExpanded()
    nextTick(() => inputTextarea.value?.focus())
  }
}

// 清空当前对话
async function handleClearHistory() {
  const confirmed = await appStore.confirm('确定要清空当前对话吗？')
  if (confirmed) {
    messages.value = []
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv) {
      currentConv.messages = []
      currentConv.title = '新对话'
      currentConv.updatedAt = Date.now()
    }
    chatStore.saveConversations()
    appStore.toast('对话已清空')
  }
}

// 清理消息序列（移除不完整的 tool 消息和相关的 assistant 消息）
function cleanMessageSequence(messages) {
  if (!messages || messages.length === 0) return []
  
  console.log('🧹 开始清理消息序列，原始消息数:', messages.length)
  
  const cleaned = []
  let removedCount = 0
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    
    // 如果是 tool 消息，检查前面是否有对应的 assistant 消息
    if (msg.role === 'tool') {
      // 向前查找最近的 assistant 消息
      let foundValidPreceding = false
      let precedingAssistant = null
      
      for (let j = cleaned.length - 1; j >= 0; j--) {
        if (cleaned[j].role === 'assistant') {
          precedingAssistant = cleaned[j]
          // 检查是否有有效的 tool_calls
          if (precedingAssistant.tool_calls && 
              Array.isArray(precedingAssistant.tool_calls) && 
              precedingAssistant.tool_calls.length > 0) {
            foundValidPreceding = true
          }
          break
        }
      }
      
      // 只有找到有效的前置消息才保留 tool 消息
      if (foundValidPreceding) {
        cleaned.push(msg)
      } else {
        console.warn('🗑️  移除孤立的 tool 消息:', {
          role: msg.role,
          name: msg.name,
          tool_call_id: msg.tool_call_id,
          content: msg.content?.substring(0, 50)
        })
        removedCount++
      }
    } 
    // 如果是 assistant 消息且有 tool_calls，检查后面是否有对应的 tool 消息
    else if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      // 先添加这条消息
      cleaned.push(msg)
      
      // 检查后面是否有对应的 tool 消息
      let hasCorrespondingTool = false
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j].role === 'tool') {
          hasCorrespondingTool = true
          break
        }
        // 如果遇到其他类型的消息，说明没有对应的 tool 消息
        if (messages[j].role !== 'tool') {
          break
        }
      }
      
      // 如果没有对应的 tool 消息，移除这条 assistant 消息
      if (!hasCorrespondingTool) {
        console.warn('🗑️  移除没有对应 tool 消息的 assistant 消息 (tool_calls 数量:', msg.tool_calls.length, ')')
        cleaned.pop()
        removedCount++
      }
    }
    else {
      cleaned.push(msg)
    }
  }
  
  if (removedCount > 0) {
    console.log(`✅ 清理完成，移除了 ${removedCount} 条消息，剩余 ${cleaned.length} 条`)
  } else {
    console.log('✅ 消息序列无需清理')
  }
  
  return cleaned
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 自动调整输入框高度
function adjustTextareaHeight() {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
    const newHeight = Math.min(inputTextarea.value.scrollHeight, 120)
    inputTextarea.value.style.height = newHeight + 'px'
  }
}

// 重置输入框高度
function resetTextareaHeight() {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }
}

function getQuickInputCollapsedHeight() {
  if (!quickInputArea.value) {
    return QUICK_INPUT_COLLAPSED_MIN_HEIGHT
  }
  const areaHeight = quickInputArea.value.getBoundingClientRect().height
  const appContainer = document.querySelector('.app-container')
  let borderHeight = 0
  if (appContainer) {
    const styles = window.getComputedStyle(appContainer)
    borderHeight = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0)
  }
  const targetHeight = Math.ceil(areaHeight + borderHeight)
  return Math.max(targetHeight, QUICK_INPUT_COLLAPSED_MIN_HEIGHT)
}

function resizeQuickInputCollapsed() {
  if (!electronAPI?.resizeQuickInput) return
  const height = getQuickInputCollapsedHeight()
  electronAPI.resizeQuickInput(height)
  isQuickInputExpanded.value = false
}

function resizeQuickInputExpanded() {
  if (!electronAPI?.resizeQuickInput) return
  electronAPI.resizeQuickInput(QUICK_INPUT_EXPANDED_HEIGHT)
  isQuickInputExpanded.value = true
}

function updateQuickInputSize() {
  if (!isQuickInputMode.value) return
  if (quickInputHasSessionMessages.value) {
    if (!isQuickInputExpanded.value) {
      resizeQuickInputExpanded()
    }
    return
  }
  resizeQuickInputCollapsed()
}

function resetQuickInputLayout(keepExpanded = false) {
  quickInputHasSessionMessages.value = keepExpanded
  nextTick(() => {
    resetTextareaHeight()
    if (!keepExpanded) {
      resizeQuickInputCollapsed()
    }
  })
}


// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  
  // 确保时间戳是数字格式
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  if (isNaN(ts)) return ''
  
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ''
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 切换思考内容展开/收起
function toggleReasoning(message) {
  if (message) {
    if (message.showReasoning === undefined) {
      message.showReasoning = true
    } else {
      message.showReasoning = !message.showReasoning
    }
  }
}

// 格式化对话时间
function formatConversationTime(timestamp) {
  if (!timestamp) return ''
  
  // 确保时间戳是数字格式
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  if (isNaN(ts)) return ''
  
  const now = new Date()
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ''
  
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString()
}


// 注意：消息和对话的保存现在由 chatStore 自动处理

// 项目选择器相关方法
// 新建对话时的项目切换
function toggleNewConversationProject(projectId) {
  const index = newConversationProjects.value.indexOf(projectId)
  if (index > -1) {
    newConversationProjects.value.splice(index, 1)
  } else {
    newConversationProjects.value.push(projectId)
  }
}

function selectAllNewConversationProjects() {
  newConversationProjects.value = projectStore.projects.map(p => p.id)
}

function clearAllNewConversationProjects() {
  newConversationProjects.value = []
}

// 项目选择（在角色选择器中）
function toggleProject(projectId) {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    if (!conv.projectIds) {
      conv.projectIds = []
    }
    const index = conv.projectIds.indexOf(projectId)
    if (index > -1) {
      conv.projectIds.splice(index, 1)
    } else {
      conv.projectIds.push(projectId)
    }
    chatStore.saveConversations()
  }
}

function selectAllProjects() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = projectStore.projects.map(p => p.id)
    chatStore.saveConversations()
  }
}

function clearAllProjects() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = []
    chatStore.saveConversations()
  }
}

// 构建项目上下文信息
function buildProjectContext() {
  if (!selectedProjectIds.value || selectedProjectIds.value.length === 0) {
    return ''
  }
  
  const { todos, filteredTodos } = todoStore
  const { projects } = projectStore
  
  // 获取选中的项目
  const selectedProjects = projects.filter(p => selectedProjectIds.value.includes(p.id))
  
  if (selectedProjects.length === 0) {
    return ''
  }
  
  let context = '【当前关联的项目信息】\n'
  
  selectedProjects.forEach(project => {
    context += `\n项目名称：${project.name}\n`
    context += `项目颜色：${project.color}\n`
    
    // 获取该项目的任务
    const projectTasks = todos.filter(t => t.projectId === project.id)
    
    if (projectTasks.length > 0) {
      const completedTasks = projectTasks.filter(t => t.completed)
      const pendingTasks = projectTasks.filter(t => !t.completed)
      
      context += `任务统计：共 ${projectTasks.length} 个任务，已完成 ${completedTasks.length} 个，待完成 ${pendingTasks.length} 个\n`
      
      // 添加待完成任务详情
      if (pendingTasks.length > 0) {
        context += `\n待完成任务：\n`
        pendingTasks.slice(0, 20).forEach((task, index) => {
          context += `${index + 1}. ${task.text}`
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate)
            const today = new Date()
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
            if (diffDays < 0) {
              context += ` [已逾期 ${Math.abs(diffDays)} 天]`
            } else if (diffDays === 0) {
              context += ` [今天到期]`
            } else if (diffDays <= 3) {
              context += ` [${diffDays} 天后到期]`
            }
          }
          
          // 添加子任务信息
          if (task.subtasks && task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(st => st.completed).length
            context += ` (子任务: ${completedSubtasks}/${task.subtasks.length})`
          }
          
          context += '\n'
        })
        
        if (pendingTasks.length > 20) {
          context += `... 还有 ${pendingTasks.length - 20} 个任务未显示\n`
        }
      }
      
      // 添加最近完成的任务（最多5个）
      if (completedTasks.length > 0) {
        const recentCompleted = completedTasks
          .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
          .slice(0, 5)
        
        context += `\n最近完成的任务：\n`
        recentCompleted.forEach((task, index) => {
          context += `${index + 1}. ${task.text}`
          if (task.completedAt) {
            const completedDate = new Date(task.completedAt)
            const today = new Date()
            const diffDays = Math.ceil((today - completedDate) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) {
              context += ` [今天完成]`
            } else {
              context += ` [${diffDays} 天前完成]`
            }
          }
          context += '\n'
        })
      }
    } else {
      context += `任务统计：暂无任务\n`
    }
    
    context += '\n---\n'
  })
  
  context += '\n请基于以上项目信息回答用户的问题，并提供个性化的建议。'
  
  return context
}

// 当前对话的角色信息（用于显示）
const currentConversationRoleInfo = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (!conv) return null
  
  const role = availableRoles.find(r => r.id === conv.roleId)
  const projectCount = conv.projectIds?.length || 0
  
  return {
    role,
    projectCount,
    hasProjects: projectCount > 0
  }
})

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
  const projectSelector = event.target.closest('.project-selector')
  const inputRoleSelector = event.target.closest('.input-role-selector')
  
  if (!projectSelector) {
    showProjectSelector.value = false
  }
  if (!inputRoleSelector) {
    showInputRoleSelector.value = false
  }
}

function handleQuickInputKeydown(event) {
  if (!isQuickInputMode.value) return
  if (event.key === 'Escape') {
    electronAPI?.exitQuickInputMode?.()
  }
}

async function handleQuickNewConversation() {
  if (!isQuickInputMode.value) return
  await chatStore.createNewConversation('task', [], { forceNew: true, silent: true })
  userInput.value = ''
  selectedImages.value = []
  resetQuickInputLayout(isQuickInputExpanded.value)
  nextTick(() => inputTextarea.value?.focus())
}

function handleOpenMainPage() {
  electronAPI?.openMainWindow?.()
}

function handleQuickClose() {
  electronAPI?.exitQuickInputMode?.()
}

async function resetQuickInputSession(options = {}) {
  if (!isQuickInputMode.value) return
  const forceNew = Boolean(options.forceNew)
  if (forceNew || messages.value.length > 0) {
    await chatStore.createNewConversation('task', [], { forceNew: true, silent: true })
  }
  userInput.value = ''
  selectedImages.value = []
  resetQuickInputLayout(false)
  nextTick(() => inputTextarea.value?.focus())
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleQuickInputKeydown)
  
  // 从本地存储恢复思考模式设置
  const savedReasoningMode = localStorage.getItem('todox_reasoning_mode')
  if (savedReasoningMode !== null) {
    appStore.enableReasoningMode = savedReasoningMode === 'true'
  }
  
  // 初始滚动到底部
  nextTick(() => scrollToBottom())

  if (isQuickInputMode.value) {
    await resetQuickInputSession({ forceNew: true })
  }

  if (electronAPI?.onQuickInputOpened) {
    electronAPI.onQuickInputOpened(async () => {
      if (isQuickInputMode.value) {
        await resetQuickInputSession()
      }
    })
  }

  if (electronAPI?.onQuickInputFocus) {
    electronAPI.onQuickInputFocus(() => {
      if (isQuickInputMode.value) {
        nextTick(() => inputTextarea.value?.focus())
      }
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleQuickInputKeydown)
})

// 快捷输入模式下自动聚焦
watch(isQuickInputMode, (enabled) => {
  if (enabled) {
    resetQuickInputLayout()
    nextTick(() => inputTextarea.value?.focus())
  }
}, { immediate: true })

watch(userInput, () => {
  if (isQuickInputMode.value) {
    nextTick(() => updateQuickInputSize())
  }
})


// 监听消息变化，自动滚动到底部
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

// 监听当前对话ID变化，滚动到底部
watch(currentConversationId, () => {
  nextTick(() => scrollToBottom())
})
</script>

<style scoped>
@import '../assets/styles/chat.css';

/* 思考模式开关样式 */
.reasoning-toggle {
  display: flex;
  align-items: center;
}

.btn-reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reasoning-toggle:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.btn-reasoning-toggle.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.btn-reasoning-toggle svg {
  width: 16px;
  height: 16px;
}

/* 计划生成器按钮 */
.btn-plan-generator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-plan-generator:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.btn-plan-generator:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-plan-generator svg {
  width: 16px;
  height: 16px;
}

/* 取消按钮 */
.btn-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.btn-cancel svg {
  width: 18px;
  height: 18px;
}

</style>
