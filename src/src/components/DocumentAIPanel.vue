<template>
  <div class="ai-panel" :class="{ collapsed: isCollapsed }">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title" v-if="!isCollapsed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
        <span>AI 助手</span>
      </div>
      <button class="btn-toggle-panel" @click="$emit('toggle')" :title="isCollapsed ? '展开' : '收起'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="isCollapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
        </svg>
      </button>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content" v-if="!isCollapsed">
      <!-- 功能按钮组 -->
      <div class="ai-actions">
        <button
          class="ai-action-btn"
          @click="handleAction('polish')"
          :disabled="!hasContent || isProcessing"
          title="优化和润色文档内容"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>润色</span>
        </button>

        <button
          class="ai-action-btn"
          @click="handleAction('summarize')"
          :disabled="!hasContent || isProcessing"
          title="生成文档摘要"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>总结</span>
        </button>

        <button
          class="ai-action-btn"
          @click="handleAction('expand')"
          :disabled="!hasContent || isProcessing"
          title="扩写文档内容"
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
          class="ai-action-btn"
          @click="handleAction('outline')"
          :disabled="!hasContent || isProcessing"
          title="生成文档大纲"
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
          class="ai-action-btn"
          @click="handleAction('translate')"
          :disabled="!hasContent || isProcessing"
          title="翻译文档"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 8h14M5 8a6 6 0 1 1 6 6m-6-6a6 6 0 1 0 6 6m0 0l4 4m0 0l4-4m-4 4V10"></path>
          </svg>
          <span>翻译</span>
        </button>

        <button
          class="ai-action-btn"
          @click="handleAction('continue')"
          :disabled="!hasContent || isProcessing"
          title="续写文档"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span>续写</span>
        </button>
      </div>

      <!-- 问答区域 -->
      <div class="ai-qa-section">
        <div class="qa-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>向 AI 提问</span>
        </div>
        <div class="qa-input-group">
          <textarea
            v-model="question"
            class="qa-input"
            placeholder="输入关于文档的问题..."
            rows="2"
            :disabled="!hasContent || isProcessing"
            @keydown.ctrl.enter="handleAskQuestion"
            @keydown.meta.enter="handleAskQuestion"
          ></textarea>
          <button
            class="btn-ask"
            @click="handleAskQuestion"
            :disabled="!hasContent || !question.trim() || isProcessing"
            title="Ctrl/Cmd + Enter 发送"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <!-- 处理状态显示 -->
      <div class="processing-status" v-if="isProcessing">
        <div class="status-spinner"></div>
        <span>{{ processingMessage }}</span>
      </div>

      <!-- 结果显示区域 -->
      <div class="ai-result" v-if="result">
        <div class="result-header">
          <span class="result-title">AI 结果</span>
          <div class="result-actions">
            <button class="btn-result-action" @click="handleCopyResult" title="复制">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-result-action" @click="handleInsertResult" title="插入到文档">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button class="btn-result-action" @click="handleReplaceResult" title="替换文档内容">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            </button>
            <button class="btn-result-action" @click="result = ''" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="result-content" v-html="renderedResult"></div>
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
  hasContent: {
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
  }
})

const emit = defineEmits([
  'toggle',
  'action',
  'ask-question',
  'copy-result',
  'insert-result',
  'replace-result'
])

const question = ref('')

// 渲染 AI 结果（Markdown）
const renderedResult = computed(() => {
  if (!props.result) return ''
  try {
    return marked.parse(props.result)
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return props.result
  }
})

function handleAction(action) {
  emit('action', action)
}

function handleAskQuestion() {
  if (!question.value.trim()) return
  emit('ask-question', question.value)
  question.value = ''
}

function handleCopyResult() {
  emit('copy-result')
}

function handleInsertResult() {
  emit('insert-result')
}

function handleReplaceResult() {
  emit('replace-result')
}
</script>

<style scoped>
.ai-panel {
  width: 320px;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.ai-panel.collapsed {
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

.ai-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.ai-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--text-primary);
}

.ai-action-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.ai-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-action-btn svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
}

.ai-qa-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.qa-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.qa-header svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

.qa-input-group {
  display: flex;
  gap: 8px;
}

.qa-input {
  flex: 1;
  min-width: 0;
  padding: 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.qa-input:focus {
  border-color: var(--primary-color);
}

.qa-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ask {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ask:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: scale(1.05);
}

.btn-ask:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ask svg {
  width: 18px;
  height: 18px;
}

.processing-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--primary-light);
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
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
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
  padding: 12px;
  max-height: 400px;
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
