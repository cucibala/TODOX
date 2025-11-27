<template>
  <div class="search-panel" :class="{ collapsed: isCollapsed }">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title" v-if="!isCollapsed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>智能检索</span>
      </div>
      <button class="btn-toggle-panel" @click="$emit('toggle')" :title="isCollapsed ? '展开' : '收起'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="isCollapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
        </svg>
      </button>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content" v-if="!isCollapsed">
      <!-- 搜索输入区域 -->
      <div class="search-section">
        <div class="search-input-group">
          <textarea
            v-model="searchQuestion"
            class="search-input"
            placeholder="输入问题，在所有文档中搜索...&#10;例如：我的 FlyBit 账号密码是什么？"
            rows="3"
            :disabled="isProcessing"
            @keydown.ctrl.enter="handleSearch"
            @keydown.meta.enter="handleSearch"
          ></textarea>
        </div>
        <button
          class="btn-search"
          @click="handleSearch"
          :disabled="!searchQuestion.trim() || isProcessing"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>{{ isProcessing ? '检索中...' : '开始检索' }}</span>
        </button>
        <div class="search-hint">Ctrl/Cmd + Enter 快速搜索 · 支持自然语言提问</div>
      </div>

      <!-- 处理状态显示 -->
      <div class="processing-status" v-if="isProcessing">
        <div class="status-spinner"></div>
        <span>{{ processingMessage }}</span>
      </div>

      <!-- 结果显示区域 -->
      <div class="search-result" v-if="result && !isProcessing">
        <div class="result-header">
          <span class="result-title">检索结果</span>
          <div class="result-actions">
            <button class="btn-result-action" @click="handleCopyResult" title="复制">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-result-action" @click="$emit('clear-result')" title="清空">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="result-content" v-html="renderedResult" @click="handleResultClick"></div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-if="!result && !isProcessing">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <p>在所有文档中智能搜索信息</p>
        <p class="empty-hint">支持自然语言提问，AI 会自动分析相关文档</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  processingMessage: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    default: ''
  },
  documentMap: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'toggle',
  'search',
  'copy-result',
  'clear-result',
  'navigate-document'
])

const searchQuestion = ref('')

// 自定义 marked renderer 来处理文档链接
const renderer = new marked.Renderer()
renderer.text = function(token) {
  const text = token.text || token
  // 匹配【文档 X】的模式，转换为可点击链接
  return text.replace(/【文档\s*(\d+)】/g, '<a href="#" class="doc-link" data-doc-id="$1">【文档 $1】</a>')
}

marked.setOptions({ renderer })

// 渲染结果（Markdown）
const renderedResult = computed(() => {
  if (!props.result) return ''
  try {
    return marked.parse(props.result)
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return props.result
  }
})

function handleSearch() {
  if (!searchQuestion.value.trim()) return
  emit('search', searchQuestion.value)
}

function handleCopyResult() {
  emit('copy-result')
}

function handleResultClick(event) {
  const target = event.target
  if (target.classList.contains('doc-link')) {
    event.preventDefault()
    const docId = parseInt(target.dataset.docId)
    if (docId) {
      emit('navigate-document', docId)
    }
  }
}
</script>

<style scoped>
.search-panel {
  width: 360px;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.search-panel.collapsed {
  width: 48px;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-title svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
}

.btn-toggle-panel {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-panel:hover {
  background: var(--hover-bg);
}

.btn-toggle-panel svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 搜索区域 */
.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input-group {
  display: flex;
}

.search-input {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.search-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-search {
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.btn-search:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-search svg {
  width: 18px;
  height: 18px;
}

.search-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

/* 处理状态 */
.processing-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.1) 0%, rgba(108, 92, 231, 0.05) 100%);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

.status-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 结果区域 */
.search-result {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.result-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-actions {
  display: flex;
  gap: 4px;
}

.btn-result-action {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-result-action:hover {
  background: var(--hover-bg);
}

.btn-result-action svg {
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
}

.result-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}

.result-content :deep(h1),
.result-content :deep(h2),
.result-content :deep(h3) {
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 600;
}

.result-content :deep(p) {
  margin: 8px 0;
}

.result-content :deep(ul),
.result-content :deep(ol) {
  margin: 8px 0;
  padding-left: 1.5em;
}

.result-content :deep(code) {
  padding: 2px 4px;
  background: rgba(175, 184, 193, 0.2);
  border-radius: 3px;
  font-size: 12px;
}

.result-content :deep(pre) {
  margin: 8px 0;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow-x: auto;
}

.result-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

/* 文档链接样式 */
.result-content :deep(.doc-link) {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  background: rgba(108, 92, 231, 0.1);
  border-radius: 4px;
  transition: all 0.2s;
}

.result-content :deep(.doc-link:hover) {
  background: rgba(108, 92, 231, 0.2);
  text-decoration: underline;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}

.empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 50%;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: var(--text-tertiary);
}

.empty-state p {
  margin: 4px 0;
  font-size: 14px;
}

.empty-state .empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar,
.result-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track,
.result-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb,
.result-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.result-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
