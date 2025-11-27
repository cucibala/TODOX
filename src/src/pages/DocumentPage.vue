<template>
  <div class="document-page">
    <!-- 文档列表侧边栏 -->
    <div class="documents-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div v-if="!sidebarCollapsed" class="header-actions">
          <div class="btn-group">
            <button class="btn-new-document" @click="handleCreateDocument" title="新建文档">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </button>
            <button class="btn-new-folder" @click="handleCreateFolder" title="新建文件夹">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索..."
              class="search-input"
            />
            <button
              v-if="searchQuery"
              class="btn-clear-search"
              @click="searchQuery = ''"
              title="清空搜索"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div v-else class="btn-group-collapsed">
          <button class="btn-new-document" @click="handleCreateDocument" title="新建文档">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <div
        class="documents-list"
        @dragover.prevent="handleRootDragOver"
        @drop="handleRootDrop"
        @dragleave="handleRootDragLeave"
        :class="{ 'drag-over-root': isDraggingOverRoot }"
      >
        <!-- 搜索结果视图 -->
        <template v-if="searchQuery">
          <div
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-item"
            :class="{ active: doc.id === currentDocumentId }"
            @click="handleSelectDocument(doc.id)"
          >
            <div class="document-icon">
              <svg v-if="doc.type === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="document-info" v-if="!sidebarCollapsed">
              <div class="document-title">{{ doc.title || '无标题' }}</div>
              <div class="document-time">{{ formatTime(doc.updatedAt) }}</div>
            </div>
          </div>
          <div v-if="filteredDocuments.length === 0" class="documents-empty">
            <p v-if="!sidebarCollapsed">未找到匹配的文档</p>
          </div>
        </template>

        <!-- 树形视图 -->
        <template v-else>
          <DocumentTreeItem
            v-for="item in documentTree"
            :key="item.id"
            :item="item"
            :level="0"
            :sidebar-collapsed="sidebarCollapsed"
            :current-document-id="currentDocumentId"
            :expanded-folders="expandedFolders"
            :dragging-item="draggingItem"
            @select="handleSelectDocument"
            @delete="handleDeleteDocument"
            @create-document="handleCreateDocumentInFolder"
            @create-folder="handleCreateFolderInFolder"
            @rename="handleRename"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @drop="handleDrop"
          />

          <div v-if="documentTree.length === 0" class="documents-empty">
            <p v-if="!sidebarCollapsed">暂无文档</p>
          </div>
        </template>
      </div>

      <button class="btn-toggle-sidebar" @click="sidebarCollapsed = !sidebarCollapsed" title="收起/展开">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="sidebarCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
        </svg>
      </button>
    </div>

    <!-- 文档编辑区域 -->
    <div class="document-main">
      <div v-if="currentDocument" class="document-editor">
        <!-- 文档标题编辑 -->
        <div class="document-header">
          <input
            v-model="currentDocument.title"
            @input="handleTitleChange"
            class="document-title-input"
            placeholder="文档标题"
            maxlength="100"
          />
          <div class="document-mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: viewMode === 'edit' }"
              @click="viewMode = 'edit'"
              title="编辑模式"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>编辑</span>
            </button>
            <button
              class="mode-btn"
              :class="{ active: viewMode === 'preview' }"
              @click="viewMode = 'preview'"
              title="预览模式"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>预览</span>
            </button>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-if="viewMode === 'edit'" class="document-content">
          <!-- AI 工具栏 -->
          <div class="ai-toolbar">
            <div class="ai-toolbar-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span>AI 助手</span>
            </div>
            <div class="ai-toolbar-actions">
              <button
                class="ai-tool-btn"
                @click="handleAIAction('polish')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="润色"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>润色</span>
              </button>
              <button
                class="ai-tool-btn"
                @click="handleAIAction('summarize')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="总结"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>总结</span>
              </button>
              <button
                class="ai-tool-btn"
                @click="handleAIAction('expand')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="扩写"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <span>扩写</span>
              </button>
              <button
                class="ai-tool-btn"
                @click="handleAIAction('outline')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="大纲"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>大纲</span>
              </button>
              <button
                class="ai-tool-btn"
                @click="handleAIAction('translate')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="翻译"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 8h14M5 8a6 6 0 1 1 6 6m-6-6a6 6 0 1 0 6 6m0 0l4 4m0 0l4-4m-4 4V10"></path>
                </svg>
                <span>翻译</span>
              </button>
              <button
                class="ai-tool-btn"
                @click="handleAIAction('continue')"
                :disabled="!currentDocument?.content || aiProcessing"
                title="续写"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span>续写</span>
              </button>
              <div class="ai-toolbar-divider"></div>
              <div class="ai-qa-inline">
                <input
                  v-model="inlineQuestion"
                  type="text"
                  class="ai-qa-input"
                  placeholder="向 AI 提问..."
                  :disabled="!currentDocument?.content || aiProcessing"
                  @keydown.enter="handleAskQuestion(inlineQuestion); inlineQuestion = ''"
                />
                <button
                  class="ai-qa-btn"
                  @click="handleAskQuestion(inlineQuestion); inlineQuestion = ''"
                  :disabled="!currentDocument?.content || !inlineQuestion.trim() || aiProcessing"
                  title="提问"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- AI 处理状态和结果 -->
          <div class="ai-inline-result" v-if="aiProcessing || aiResult">
            <div class="ai-result-header">
              <span v-if="aiProcessing" class="ai-processing">
                <span class="ai-spinner"></span>
                {{ aiProcessingMessage }}
              </span>
              <span v-else class="ai-result-title">AI 结果</span>
              <div class="ai-result-actions" v-if="aiResult && !aiProcessing">
                <button class="ai-result-btn" @click="handleCopyResult" title="复制">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="ai-result-btn" @click="handleInsertResult" title="插入">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button class="ai-result-btn" @click="handleReplaceResult" title="替换">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <polyline points="23 20 23 14 17 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                </button>
                <button class="ai-result-btn" @click="aiResult = ''" title="关闭">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div class="ai-result-content" v-if="aiResult && !aiProcessing" v-html="renderedAIResult"></div>
          </div>

          <textarea
            ref="textareaRef"
            v-model="currentDocument.content"
            @input="handleContentChange"
            @paste="handlePaste"
            class="document-textarea"
            placeholder="支持 Markdown 语法，开始编写...（支持粘贴图片）"
          ></textarea>
        </div>

        <!-- 预览模式 -->
        <div v-else class="document-preview" ref="previewRef">
          <div
            class="markdown-body"
            v-html="renderedMarkdown"
            @click="handlePreviewClick"
          ></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="document-empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        <h3>开始创建你的文档</h3>
        <p>点击左侧按钮创建文档或文件夹</p>
      </div>
    </div>

    <!-- 智能检索面板 -->
    <DocumentSearchPanel
      :is-collapsed="searchPanelCollapsed"
      :is-processing="searchProcessing"
      :processing-message="searchProcessingMessage"
      :result="searchResult"
      :document-map="searchDocumentMap"
      @toggle="searchPanelCollapsed = !searchPanelCollapsed"
      @search="handleSearchDocuments"
      @copy-result="handleCopySearchResult"
      @clear-result="searchResult = ''"
      @navigate-document="handleNavigateDocument"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDocumentStore } from '../stores/document'
import { useAppStore } from '../stores/app'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DocumentTreeItem from '../components/DocumentTreeItem.vue'
import DocumentSearchPanel from '../components/DocumentSearchPanel.vue'
import { DocumentAITool } from '../utils/document_ai_tool'
import { DeepSeekClient } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'

const documentStore = useDocumentStore()
const appStore = useAppStore()
const electronAPI = window.electronAPI

const { documents, currentDocumentId, currentDocument, documentTree, expandedFolders } = storeToRefs(documentStore)

// 本地状态
const sidebarCollapsed = ref(false)
const textareaRef = ref(null)
const previewRef = ref(null)
const viewMode = ref('preview')
const searchQuery = ref('')
const draggingItem = ref(null)
const isDraggingOverRoot = ref(false)
const isNavigatingToDocument = ref(false) // 标记是否正在跳转到文档

// AI 助手状态（编辑区内嵌）
const aiProcessing = ref(false)
const aiProcessingMessage = ref('')
const aiResult = ref('')
const aiClient = ref(null)
const aiTool = ref(null)
const inlineQuestion = ref('')

// 智能检索面板状态
const searchPanelCollapsed = ref(false)
const searchProcessing = ref(false)
const searchProcessingMessage = ref('')
const searchResult = ref('')
const searchDocumentMap = ref({})

// 过滤后的文档列表（用于搜索）
const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) {
    return []
  }

  const query = searchQuery.value.toLowerCase()
  return documents.value.filter(doc => {
    return doc.title?.toLowerCase().includes(query) ||
           (doc.content && doc.content.toLowerCase().includes(query))
  })
})

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 自定义渲染器
const renderer = new marked.Renderer()

renderer.link = function({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}

renderer.code = function({ text, lang }) {
  const codeStr = text || ''
  const language = lang || ''

  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  if (language && hljs.getLanguage(language)) {
    try {
      const highlighted = hljs.highlight(codeStr, { language }).value
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
    } catch (err) {
      console.error('代码高亮失败:', err, language)
      return `<pre><code class="hljs">${escapeHtml(codeStr)}</code></pre>`
    }
  }

  try {
    const result = hljs.highlightAuto(codeStr)
    return `<pre><code class="hljs ${result.language ? `language-${result.language}` : ''}">${result.value}</code></pre>`
  } catch (err) {
    console.error('自动高亮失败:', err)
    return `<pre><code class="hljs">${escapeHtml(codeStr)}</code></pre>`
  }
}

marked.setOptions({ renderer })

// 渲染 Markdown
const renderedMarkdown = computed(() => {
  if (!currentDocument.value?.content) {
    return '<div class="empty-preview">暂无内容，切换到编辑模式开始编写...</div>'
  }

  try {
    return marked.parse(currentDocument.value.content)
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return '<div class="error-preview">渲染失败，请检查 Markdown 语法</div>'
  }
})

// 渲染 AI 结果
const renderedAIResult = computed(() => {
  if (!aiResult.value) return ''
  try {
    return marked.parse(aiResult.value)
  } catch (error) {
    console.error('AI 结果渲染失败:', error)
    return aiResult.value
  }
})

// 创建新文档（根目录）
async function handleCreateDocument() {
  await documentStore.createDocument()
}

// 创建新文件夹（根目录）
async function handleCreateFolder() {
  await documentStore.createFolder()
}

// 在指定文件夹中创建文档
async function handleCreateDocumentInFolder(folderId) {
  await documentStore.createDocument(null, folderId)
}

// 在指定文件夹中创建文件夹
async function handleCreateFolderInFolder(folderId) {
  await documentStore.createFolder(null, folderId)
}

// 选择文档
function handleSelectDocument(documentId) {
  documentStore.selectDocument(documentId)
}

// 删除文档
async function handleDeleteDocument(documentId) {
  await documentStore.deleteDocument(documentId)
}

// 重命名
async function handleRename({ id, title }) {
  await documentStore.updateDocument(id, { title })
}

// 标题改变
function handleTitleChange() {
  if (currentDocument.value) {
    documentStore.updateDocument(currentDocument.value.id, {
      title: currentDocument.value.title
    })
  }
}

// 内容改变
function handleContentChange() {
  if (currentDocument.value) {
    documentStore.saveDocumentContent(
      currentDocument.value.id,
      currentDocument.value.content
    )
  }
}

// 拖拽开始
function handleDragStart(item) {
  draggingItem.value = item
}

// 拖拽结束
function handleDragEnd() {
  draggingItem.value = null
  isDraggingOverRoot.value = false
}

// 拖放到指定位置
async function handleDrop({ targetId, position }) {
  if (!draggingItem.value) return
  if (draggingItem.value.id === targetId) return

  const target = documents.value.find(d => d.id === targetId)
  if (!target) return

  let newParentId = null
  let newOrderIndex = 0

  if (position === 'inside' && target.type === 'folder') {
    // 移动到文件夹内
    newParentId = targetId
    const children = documentStore.getChildrenByParentId(targetId)
    newOrderIndex = children.length
  } else if (position === 'before') {
    // 移动到目标之前
    newParentId = target.parentId
    newOrderIndex = target.orderIndex
  } else if (position === 'after') {
    // 移动到目标之后
    newParentId = target.parentId
    newOrderIndex = target.orderIndex + 1
  }

  await documentStore.moveDocument(draggingItem.value.id, newParentId, newOrderIndex)
  draggingItem.value = null
}

// 根目录拖放处理
function handleRootDragOver(event) {
  if (!draggingItem.value) return
  event.preventDefault()
  isDraggingOverRoot.value = true
}

function handleRootDragLeave() {
  isDraggingOverRoot.value = false
}

async function handleRootDrop() {
  if (!draggingItem.value) return

  // 移动到根目录末尾
  const rootItems = documentStore.getChildrenByParentId(null)
  await documentStore.moveDocument(draggingItem.value.id, null, rootItems.length)

  draggingItem.value = null
  isDraggingOverRoot.value = false
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
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

// 格式化完整日期
function formatDate(timestamp) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 处理预览区域的点击事件
function handlePreviewClick(event) {
  const target = event.target
  if (target.tagName === 'A' && target.href) {
    event.preventDefault()
    window.electronAPI.openExternal(target.href)
  }
}

// 处理粘贴事件
async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()

      const file = item.getAsFile()
      if (!file) continue

      try {
        appStore.toast('正在保存图片...')

        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result
            const result = await window.electronAPI.saveImageFromClipboard(base64Data)

            if (result.success && result.fileName) {
              const textarea = textareaRef.value
              const cursorPos = textarea.selectionStart
              const currentContent = currentDocument.value.content || ''

              const imageMarkdown = `![图片](todox-image://${result.fileName})`
              const newContent =
                currentContent.slice(0, cursorPos) +
                imageMarkdown +
                currentContent.slice(cursorPos)

              currentDocument.value.content = newContent
              handleContentChange()

              await nextTick()
              const newCursorPos = cursorPos + imageMarkdown.length
              textarea.setSelectionRange(newCursorPos, newCursorPos)
              textarea.focus()

              appStore.toast('图片已插入')
            } else {
              appStore.toast('保存图片失败')
            }
          } catch (error) {
            console.error('保存图片异常:', error)
            appStore.toast('保存图片异常')
          }
        }

        reader.readAsDataURL(file)
      } catch (error) {
        console.error('处理图片失败:', error)
        appStore.toast('处理图片失败')
      }

      break
    }
  }
}

// 初始化 AI 客户端
async function initAIClient() {
  try {
    if (appStore.currentAIModel === 'doubao') {
      const result = await electronAPI.getDoubaoKey()
      if (result.success && result.key) {
        const endpoint = result.endpoint || 'https://ark.cn-beijing.volces.com/api/v3'
        const model = result.model || 'doubao-seed-1-6-251015'
        aiClient.value = new DoubaoClient(result.key, endpoint, model)
        aiTool.value = new DocumentAITool(aiClient.value)
      }
    } else {
      const result = await electronAPI.getDeepSeekKey()
      if (result.success && result.key) {
        aiClient.value = new DeepSeekClient(result.key)
        aiTool.value = new DocumentAITool(aiClient.value)
      }
    }
  } catch (error) {
    console.error('初始化 AI 客户端失败:', error)
  }
}

// AI 操作处理
async function handleAIAction(action) {
  if (!currentDocument.value?.content) {
    appStore.toast('文档内容为空')
    return
  }

  if (!aiTool.value) {
    appStore.toast('请先配置 AI API 密钥')
    appStore.showApiKeyDialog = true
    return
  }

  aiProcessing.value = true
  aiResult.value = ''

  try {
    const content = currentDocument.value.content
    let result = ''

    switch (action) {
      case 'polish':
        result = await aiTool.value.polishDocument(
          content,
          '',
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      case 'summarize':
        result = await aiTool.value.summarizeDocument(
          content,
          500,
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      case 'expand':
        result = await aiTool.value.expandDocument(
          content,
          '',
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      case 'outline':
        result = await aiTool.value.generateOutline(
          content,
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      case 'translate':
        result = await aiTool.value.translateDocument(
          content,
          '英文',
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      case 'continue':
        result = await aiTool.value.continueWriting(
          content,
          '',
          (msg) => { aiProcessingMessage.value = msg }
        )
        break

      default:
        appStore.toast('未知操作')
        return
    }

    aiResult.value = result
    aiPanelCollapsed.value = false
    appStore.toast('处理完成')
  } catch (error) {
    console.error('AI 处理失败:', error)
    appStore.toast(error.message || 'AI 处理失败')
  } finally {
    aiProcessing.value = false
    aiProcessingMessage.value = ''
  }
}

// AI 问答处理
async function handleAskQuestion(question) {
  if (!currentDocument.value?.content) {
    appStore.toast('文档内容为空')
    return
  }

  if (!aiTool.value) {
    appStore.toast('请先配置 AI API 密钥')
    appStore.showApiKeyDialog = true
    return
  }

  aiProcessing.value = true
  aiResult.value = ''

  try {
    const result = await aiTool.value.askQuestion(
      currentDocument.value.content,
      question,
      (msg) => { aiProcessingMessage.value = msg }
    )

    aiResult.value = result
    appStore.toast('回答完成')
  } catch (error) {
    console.error('AI 问答失败:', error)
    appStore.toast(error.message || 'AI 问答失败')
  } finally {
    aiProcessing.value = false
    aiProcessingMessage.value = ''
  }
}

// 智能文档检索处理
async function handleSearchDocuments(question) {
  if (!aiTool.value) {
    appStore.toast('请先配置 AI API 密钥')
    appStore.showApiKeyDialog = true
    return
  }

  if (documents.value.length === 0) {
    appStore.toast('暂无文档可供检索')
    return
  }

  searchProcessing.value = true
  searchResult.value = ''
  searchDocumentMap.value = {}

  try {
    const { result, documentMap } = await aiTool.value.searchDocuments(
      documents.value,
      question,
      (msg) => { searchProcessingMessage.value = msg }
    )

    searchResult.value = result
    searchDocumentMap.value = documentMap
    appStore.toast('检索完成')
  } catch (error) {
    console.error('文档检索失败:', error)
    appStore.toast(error.message || '文档检索失败')
  } finally {
    searchProcessing.value = false
    searchProcessingMessage.value = ''
  }
}

// 复制检索结果
async function handleCopySearchResult() {
  try {
    await navigator.clipboard.writeText(searchResult.value)
    appStore.toast('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    appStore.toast('复制失败')
  }
}

// 跳转到检索到的文档，并定位到匹配位置
async function handleNavigateDocument(seqId, searchKeyword = '') {
  const docInfo = searchDocumentMap.value[seqId]
  if (docInfo && docInfo.id) {
    // 标记正在跳转到文档，防止滚动同步逻辑干扰
    isNavigatingToDocument.value = true

    // 先选择文档
    documentStore.selectDocument(docInfo.id)

    // 切换到编辑模式以便定位
    viewMode.value = 'edit'

    // 等待 DOM 更新后定位到匹配位置
    await nextTick()

    if (searchKeyword && textareaRef.value) {
      const content = currentDocument.value?.content || ''
      // 从搜索问题中提取关键词进行定位
      const keywords = searchKeyword.split(/\s+/).filter(k => k.length >= 2)

      // 在文档中查找第一个匹配的关键词位置
      let matchPos = -1
      let matchKeyword = ''
      for (const keyword of keywords) {
        const pos = content.toLowerCase().indexOf(keyword.toLowerCase())
        if (pos !== -1) {
          matchPos = pos
          matchKeyword = keyword
          break
        }
      }

      if (matchPos !== -1) {
        const textarea = textareaRef.value
        textarea.focus()
        textarea.setSelectionRange(matchPos, matchPos + matchKeyword.length)

        // 使用正确的方式计算滚动位置：根据匹配位置之前的换行符数量计算行号
        const textBeforeMatch = content.substring(0, matchPos)
        const lineNumber = (textBeforeMatch.match(/\n/g) || []).length

        // 获取 textarea 的实际行高
        const computedStyle = window.getComputedStyle(textarea)
        const lineHeight = parseFloat(computedStyle.lineHeight) || 27 // 默认行高

        // 计算滚动位置，让匹配位置显示在可视区域中间
        const targetScrollTop = Math.max(0, lineNumber * lineHeight - textarea.clientHeight / 3)
        textarea.scrollTop = targetScrollTop
      }
    }

    // 重置标记
    isNavigatingToDocument.value = false
    appStore.toast(`已跳转到文档: ${docInfo.title}`)
  } else {
    appStore.toast('文档不存在')
  }
}

// 复制 AI 结果
async function handleCopyResult() {
  try {
    await navigator.clipboard.writeText(aiResult.value)
    appStore.toast('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    appStore.toast('复制失败')
  }
}

// 插入 AI 结果到文档
function handleInsertResult() {
  if (!currentDocument.value) return

  const textarea = textareaRef.value
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const currentContent = currentDocument.value.content || ''

  const newContent =
    currentContent.slice(0, cursorPos) +
    '\n\n' +
    aiResult.value +
    '\n\n' +
    currentContent.slice(cursorPos)

  currentDocument.value.content = newContent
  handleContentChange()

  nextTick(() => {
    const newCursorPos = cursorPos + aiResult.value.length + 4
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })

  appStore.toast('已插入到文档')
  aiResult.value = ''
}

// 替换文档内容为 AI 结果
async function handleReplaceResult() {
  const confirmed = await appStore.confirm('确定要用 AI 结果替换整个文档内容吗？')
  if (!confirmed) return

  if (!currentDocument.value) return

  currentDocument.value.content = aiResult.value
  handleContentChange()

  appStore.toast('已替换文档内容')
  aiResult.value = ''
}

// 监听模式切换，同步滚动位置
watch(viewMode, async (newMode, oldMode) => {
  // 如果是跳转到文档触发的模式切换，不进行滚动同步
  if (isNavigatingToDocument.value) return

  if (!currentDocument.value?.content) return

  await nextTick()

  // 从编辑模式切换到预览模式
  if (oldMode === 'edit' && newMode === 'preview' && textareaRef.value && previewRef.value) {
    const textarea = textareaRef.value
    const preview = previewRef.value

    // 计算编辑模式的滚动百分比
    const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)

    // 应用到预览模式
    if (preview.scrollHeight > preview.clientHeight) {
      preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)
    }
  }

  // 从预览模式切换到编辑模式
  if (oldMode === 'preview' && newMode === 'edit' && textareaRef.value && previewRef.value) {
    const textarea = textareaRef.value
    const preview = previewRef.value

    // 计算预览模式的滚动百分比
    const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight)

    // 应用到编辑模式
    if (textarea.scrollHeight > textarea.clientHeight) {
      textarea.scrollTop = scrollPercentage * (textarea.scrollHeight - textarea.clientHeight)
    }
  }
})

onMounted(async () => {
  // 文档数据已在 App.vue 中加载
  // 初始化 AI 客户端
  await initAIClient()
})
</script>

<style>
/* 全局导入 highlight.js 样式 */
@import 'highlight.js/styles/github.css';
</style>

<style scoped>

.document-page {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--bg-primary);
}

/* 文档列表侧边栏 */
.documents-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s ease;
}

.documents-sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  height: 72px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-group {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-group-collapsed {
  display: flex;
  justify-content: center;
}

.btn-new-document,
.btn-new-folder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new-document:hover,
.btn-new-folder:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-new-folder {
  background: var(--bg-tertiary, #e5e7eb);
  color: var(--text-primary);
}

.btn-new-folder:hover {
  background: var(--hover-bg);
}

.btn-new-document svg,
.btn-new-folder svg {
  width: 18px;
  height: 18px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 6px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  font-size: 13px;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.btn-clear-search {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
}

.btn-clear-search:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-clear-search svg {
  width: 10px;
  height: 10px;
  color: var(--text-secondary);
}

.documents-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 100px;
}

.documents-list.drag-over-root {
  background: rgba(108, 92, 231, 0.05);
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
  position: relative;
}

.document-item:hover {
  background: var(--hover-bg);
}

.document-item.active {
  background: var(--primary-light);
}

.document-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 6px;
}

.document-icon svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.documents-empty {
  padding: 24px;
  text-align: center;
}

.documents-empty p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.btn-toggle-sidebar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-sidebar:hover {
  background: var(--hover-bg);
}

.btn-toggle-sidebar svg {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}

/* 文档编辑区域 */
.document-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.document-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.document-header {
  height: 72px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.document-title-input {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 8px 12px;
}

.document-title-input::placeholder {
  color: var(--text-tertiary);
}

.document-mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 4px;
  flex-shrink: 0;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.mode-btn.active {
  color: white;
  background: var(--primary-color);
}

.mode-btn svg {
  width: 16px;
  height: 16px;
}

.document-content {
  flex: 1;
  overflow: hidden;
  padding: 16px 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* AI 工具栏样式 */
.ai-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  flex-shrink: 0;
}

.ai-toolbar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-color);
  flex-shrink: 0;
}

.ai-toolbar-label svg {
  width: 16px;
  height: 16px;
}

.ai-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}

.ai-tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-tool-btn:hover:not(:disabled) {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: rgba(108, 92, 231, 0.05);
}

.ai-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-tool-btn svg {
  width: 14px;
  height: 14px;
}

.ai-toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 8px;
}

.ai-qa-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 200px;
}

.ai-qa-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: none;
}

.ai-qa-input:focus {
  border-color: var(--primary-color);
}

.ai-qa-input:disabled {
  opacity: 0.5;
}

.ai-qa-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ai-qa-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.ai-qa-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-qa-btn svg {
  width: 14px;
  height: 14px;
}

/* AI 结果内嵌区域 */
.ai-inline-result {
  background: var(--bg-secondary);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.1) 0%, rgba(108, 92, 231, 0.05) 100%);
  border-bottom: 1px solid var(--border-color);
}

.ai-processing {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

.ai-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.ai-result-actions {
  display: flex;
  gap: 4px;
}

.ai-result-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-result-btn:hover {
  background: var(--hover-bg);
}

.ai-result-btn svg {
  width: 12px;
  height: 12px;
  color: var(--text-secondary);
}

.ai-result-content {
  padding: 12px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  flex: 1;
}

.ai-result-content :deep(p) {
  margin: 6px 0;
}

.ai-result-content :deep(ul),
.ai-result-content :deep(ol) {
  margin: 6px 0;
  padding-left: 1.5em;
}

.ai-result-content :deep(code) {
  padding: 2px 4px;
  background: rgba(175, 184, 193, 0.2);
  border-radius: 3px;
  font-size: 12px;
}

.document-textarea {
  flex: 1;
  width: 100%;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.document-textarea::placeholder {
  color: var(--text-tertiary);
}

/* Markdown 预览样式 */
.document-preview {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.markdown-body {
  max-width: 900px;
  margin: 0 auto;
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 15px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.markdown-body :deep(h1) {
  font-size: 32px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.markdown-body :deep(h2) {
  font-size: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.markdown-body :deep(h3) {
  font-size: 20px;
}

.markdown-body :deep(h4) {
  font-size: 18px;
}

.markdown-body :deep(h5) {
  font-size: 16px;
}

.markdown-body :deep(h6) {
  font-size: 14px;
  color: var(--text-secondary);
}

.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(blockquote) {
  margin: 16px 0;
  padding: 0 1em;
  color: var(--text-secondary);
  border-left: 4px solid var(--primary-color);
  background: var(--bg-secondary);
  border-radius: 0 4px 4px 0;
}

.markdown-body :deep(blockquote p) {
  margin: 12px 0;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  font-size: 13px;
  background: rgba(175, 184, 193, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #24292e;
}

.markdown-body :deep(pre) {
  margin: 16px 0;
  padding: 16px;
  background: #f6f8fa;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-body :deep(pre code.hljs) {
  display: block;
  overflow-x: auto;
  padding: 0;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  border-spacing: 0;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  text-align: left;
}

.markdown-body :deep(table th) {
  background: var(--bg-secondary);
  font-weight: 600;
}

.markdown-body :deep(table tr:nth-child(even)) {
  background: var(--bg-secondary);
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.markdown-body :deep(hr) {
  height: 1px;
  padding: 0;
  margin: 24px 0;
  background-color: var(--border-color);
  border: 0;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  text-decoration: line-through;
}

.empty-preview,
.error-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.error-preview {
  color: var(--danger-color);
}

/* 空状态 */
.document-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 50%;
  margin-bottom: 24px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: var(--text-tertiary);
}

.document-empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.document-empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* 滚动条样式 */
.documents-list::-webkit-scrollbar {
  width: 6px;
}

.documents-list::-webkit-scrollbar-track {
  background: transparent;
}

.documents-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.documents-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
