<template>
  <div class="document-page">
    <!-- 文档列表侧边栏 -->
    <div class="documents-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div v-if="!sidebarCollapsed" class="header-actions">
          <button class="btn-new-document" @click="handleCreateDocument" title="新建文档">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>新建</span>
          </button>
          
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
        <button v-else class="btn-new-document" @click="handleCreateDocument" title="新建文档">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div class="documents-list">
        <div
          v-for="doc in filteredDocuments"
          :key="doc.id"
          class="document-item"
          :class="{ active: doc.id === currentDocumentId }"
          @click="handleSelectDocument(doc.id)"
        >
          <div class="document-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="document-info" v-if="!sidebarCollapsed">
            <div class="document-title">{{ doc.title || '无标题文档' }}</div>
            <div class="document-time">{{ formatTime(doc.updatedAt) }}</div>
          </div>
          <button 
            class="btn-delete-document" 
            v-if="!sidebarCollapsed"
            @click.stop="handleDeleteDocument(doc.id)"
            title="删除文档"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="filteredDocuments.length === 0" class="documents-empty">
          <p v-if="!sidebarCollapsed">
            {{ searchQuery ? '未找到匹配的文档' : '暂无文档' }}
          </p>
        </div>
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
          <div class="document-meta">
            <span class="meta-item">
              创建于 {{ formatDate(currentDocument.createdAt) }}
            </span>
            <span class="meta-item">
              更新于 {{ formatDate(currentDocument.updatedAt) }}
            </span>
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
        </div>

        <!-- 编辑模式 -->
        <div v-if="viewMode === 'edit'" class="document-content">
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
        <div v-else class="document-preview">
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
        <p>点击左侧「新建文档」按钮创建第一个文档</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useDocumentStore } from '../stores/document'
import { useAppStore } from '../stores/app'
import { marked } from 'marked'
import hljs from 'highlight.js'

const documentStore = useDocumentStore()
const appStore = useAppStore()

const { documents, currentDocumentId, currentDocument } = storeToRefs(documentStore)

// 本地状态
const sidebarCollapsed = ref(false)

// textarea 引用
const textareaRef = ref(null)
const viewMode = ref('preview') // 'edit' | 'preview' - 默认预览模式
const searchQuery = ref('') // 搜索关键词

// 过滤后的文档列表
const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) {
    return documents.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return documents.value.filter(doc => {
    return doc.title.toLowerCase().includes(query) ||
           (doc.content && doc.content.toLowerCase().includes(query))
  })
})

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GFM 换行
  gfm: true, // 启用 GitHub 风格的 Markdown
})

// 自定义渲染器以确保代码高亮正确应用
const renderer = new marked.Renderer()

// 自定义链接渲染 - 在新窗口打开
renderer.link = function({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}

renderer.code = function({ text, lang }) {
  // 新版 marked 传递的是对象 { text, lang, escaped }
  const codeStr = text || ''
  const language = lang || ''
  
  // 转义 HTML 特殊字符的辅助函数
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  // 如果指定了语言且 highlight.js 支持该语言
  if (language && hljs.getLanguage(language)) {
    try {
      const highlighted = hljs.highlight(codeStr, { language }).value
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
    } catch (err) {
      console.error('代码高亮失败:', err, language)
      return `<pre><code class="hljs">${escapeHtml(codeStr)}</code></pre>`
    }
  }
  
  // 否则尝试自动检测
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

// 创建新文档
async function handleCreateDocument() {
  await documentStore.createDocument()
}

// 选择文档
function handleSelectDocument(documentId) {
  documentStore.selectDocument(documentId)
}

// 删除文档
async function handleDeleteDocument(documentId) {
  await documentStore.deleteDocument(documentId)
}

// 标题改变
function handleTitleChange() {
  if (currentDocument.value) {
    documentStore.updateDocument(currentDocument.value.id, {
      title: currentDocument.value.title
    })
  }
}

// 内容改变（使用防抖保存）
function handleContentChange() {
  if (currentDocument.value) {
    documentStore.saveDocumentContent(
      currentDocument.value.id,
      currentDocument.value.content
    )
  }
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

// 挂载时加载文档
// 处理预览区域的点击事件（拦截链接点击）
function handlePreviewClick(event) {
  // 检查是否点击了链接
  const target = event.target
  if (target.tagName === 'A' && target.href) {
    event.preventDefault()
    // 在系统默认浏览器中打开链接
    window.electronAPI.openExternal(target.href)
  }
}

// 处理粘贴事件（支持粘贴图片）
async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  // 查找图片项
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()
      
      // 获取图片文件
      const file = item.getAsFile()
      if (!file) continue

      try {
        // 显示加载提示
        appStore.toast('正在保存图片...')
        
        // 将图片转换为 base64
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result
            
            // 保存图片到本地
            const result = await window.electronAPI.saveImageFromClipboard(base64Data)
            
            if (result.success && result.fileName) {
              // 获取光标位置
              const textarea = textareaRef.value
              const cursorPos = textarea.selectionStart
              const currentContent = currentDocument.value.content || ''
              
              // 插入图片 Markdown 语法
              const imageMarkdown = `![图片](todox-image://${result.fileName})`
              const newContent = 
                currentContent.slice(0, cursorPos) + 
                imageMarkdown + 
                currentContent.slice(cursorPos)
              
              // 更新内容
              currentDocument.value.content = newContent
              handleContentChange()
              
              // 设置新的光标位置（图片 Markdown 之后）
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

onMounted(async () => {
  // 文档数据已在 App.vue 中加载
})
</script>

<style>
/* 全局导入 highlight.js 样式（不能用 scoped） */
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
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-new-document {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.documents-sidebar.collapsed .btn-new-document {
  padding: 8px;
}

.btn-new-document:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-new-document svg {
  width: 16px;
  height: 16px;
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

.search-icon {
  width: 14px;
  height: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
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
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
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
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 6px;
}

.document-icon svg {
  width: 18px;
  height: 18px;
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

.btn-delete-document {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.document-item:hover .btn-delete-document {
  opacity: 1;
}

.btn-delete-document:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-delete-document svg {
  width: 14px;
  height: 14px;
  color: var(--danger-color);
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
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.document-title-input {
  width: 100%;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 8px 0;
  margin-bottom: 12px;
}

.document-title-input::placeholder {
  color: var(--text-tertiary);
}

.document-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}

.document-mode-toggle {
  display: flex;
  gap: 4px;
  margin-left: auto;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 4px;
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
  padding: 24px 32px;
}

.document-textarea {
  width: 100%;
  height: 100%;
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

/* 行内代码 */
.markdown-body :deep(code) {
  padding: 2px 6px;
  font-size: 13px;
  background: rgba(175, 184, 193, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #24292e;
}

/* 代码块容器 */
.markdown-body :deep(pre) {
  margin: 16px 0;
  padding: 16px;
  background: #f6f8fa;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow-x: auto;
}

/* 代码块内的代码 - 不覆盖颜色，让 highlight.js 接管 */
.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.6;
  /* 不设置 color，让 highlight.js 的语法高亮生效 */
}

/* 确保 highlight.js 的类能正常工作 */
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

