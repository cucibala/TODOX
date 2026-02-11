<template>
  <div
    v-if="show"
    class="inline-ai-assistant"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    ref="panelRef"
  >
    <div class="ai-content">
      <!-- 选中文字提示 -->
      <div v-if="selectedText" class="selected-text-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
          <rect x="9" y="3" width="6" height="4" rx="2"></rect>
        </svg>
        <span>已选中 {{ selectedText.length }} 个字符</span>
      </div>

      <div class="ai-input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="question"
          :placeholder="selectedText ? '如何处理选中的文字？(Ctrl+Enter 发送)' : '向 AI 提问 (Ctrl+Enter 发送)'"
          rows="1"
          class="ai-input"
          @keydown.ctrl.enter.prevent="sendQuestion"
          @input="autoResizeTextarea"
        ></textarea>
        <button class="btn-send" @click="sendQuestion" :disabled="isProcessing || !question.trim()">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <div v-if="isProcessing || aiResult" class="ai-result-wrapper">
        <div v-if="isProcessing && !aiResult" class="ai-processing-indicator">
          <div class="ai-spinner"></div>
          <span>正在思考...</span>
        </div>
        <div v-if="aiResult" class="ai-result-content">
          <div class="ai-result markdown-body" v-html="renderedAIResult"></div>
          <div class="ai-result-actions">
            <button v-if="selectedText" class="btn-action btn-replace" @click="handleReplace">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              替换
            </button>
            <button v-else class="btn-action btn-insert" @click="handleInsert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              插入
            </button>
            <button class="btn-action btn-copy" @click="handleCopy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              复制
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { DeepSeekClient } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'
import { marked } from 'marked'
import hljs from 'highlight.js'

const props = defineProps({
  show: Boolean,
  position: {
    type: Object,
    default: () => ({ top: 0, left: 0 })
  },
  selectedText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'insert', 'replace'])

const appStore = useAppStore()
const question = ref('')
const aiResult = ref('')
const isProcessing = ref(false)
const textareaRef = ref(null)
const panelRef = ref(null)

// --- AI Client ---
const aiClient = ref(null)
async function initAIClient() {
  if (aiClient.value) return true
  try {
    const modelMap = {
      doubao: { get: window.electronAPI.getDoubaoKey, Client: DoubaoClient },
      deepseek: { get: window.electronAPI.getDeepSeekKey, Client: DeepSeekClient }
    }
    const model = appStore.currentAIModel
    if (!modelMap[model]) return false

    const result = await modelMap[model].get()
    if (result.success && result.key) {
      aiClient.value = new modelMap[model].Client(result.key, result.endpoint, result.model)
      return true
    } else {
      appStore.toast('AI 服务未配置，请在设置中提供 API 密钥。')
      appStore.showApiKeyDialog = true
      return false
    }
  } catch (error) {
    appStore.toast(`初始化 AI 客户端失败: ${error.message}`)
    return false
  }
}

// --- Lifecycle and Visibility ---
watch(() => props.show, (newVal) => {
  if (newVal) {
    question.value = ''
    aiResult.value = ''
    isProcessing.value = false
    nextTick(() => textareaRef.value?.focus())
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('mousedown', handleClickOutside)
})

function handleGlobalKeydown(event) {
  if (props.show && event.key === 'Escape') {
    emit('close')
  }
}

function handleClickOutside(event) {
  if (props.show && panelRef.value && !panelRef.value.contains(event.target)) {
    emit('close')
  }
}

// --- Markdown Rendering ---
marked.setOptions({ breaks: true, gfm: true, highlight: (code, lang) => hljs.highlight(code, { language: hljs.getLanguage(lang) ? lang : 'plaintext' }).value })
const renderedAIResult = computed(() => marked.parse(aiResult.value || ''))

// --- Core AI Interaction ---
async function sendQuestion() {
  if (!question.value.trim() || isProcessing.value) return
  if (!await initAIClient()) return

  isProcessing.value = true
  aiResult.value = ''
  const currentQuestion = question.value

  // 如果有选中的文字，构建包含上下文的提示
  let userContent = currentQuestion
  if (props.selectedText) {
    userContent = `我选中了以下文字：

\`\`\`
${props.selectedText}
\`\`\`

请根据我的要求处理这段文字：${currentQuestion}

请直接返回处理后的结果，不要包含任何解释说明。`
  }

  const messages = [
    {
      role: 'system',
      content: props.selectedText
        ? '你是一个文档编辑助手，专门帮助用户优化和处理文本内容。请直接返回处理后的结果，不要添加任何解释说明或额外的文字。'
        : `你是一个极简 AI 助手，只给答案，不要废话。
仅当用户输入以 "?" 或 "？" 结尾时，才执行下面的“极简回答”要求；否则正常回答（简洁可解释）。

示例1：
用户问：opencv 怎么不编译test项？
正确回答：cmake -DBUILD_TESTS=OFF ..
错误回答：OpenCV默认会编译测试项目。如果你想跳过测试项目的编译，可以在cmake配置时添加参数...(太啰嗦)

示例2：
用户问：python怎么读json？
正确回答：import json; data = json.load(open('file.json'))
错误回答：Python读取JSON文件有多种方式，最常用的是使用内置的json模块...(太啰嗦)

“极简回答”要求：
- 只给核心答案（命令/代码/关键词）
- 不要解释原因和背景
- 不要说"你可以"、"建议"之类的词
- 不要多个方案对比
- 代码直接给，不要前后说明`
    },
    { role: 'user', content: userContent }
  ]

  try {
    await aiClient.value.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        aiResult.value += chunk
      }
    })
  } catch (error) {
    aiResult.value = `**错误**: ${error.message}`
  } finally {
    isProcessing.value = false
  }
}

// --- Action Handlers ---
function handleReplace() {
  if (!aiResult.value) return
  emit('replace', aiResult.value)
  emit('close')
}

function handleInsert() {
  if (!aiResult.value) return
  emit('insert', aiResult.value)
  emit('close')
}

async function handleCopy() {
  if (!aiResult.value) return
  try {
    await navigator.clipboard.writeText(aiResult.value)
    appStore.toast('已复制到剪贴板')
  } catch (error) {
    appStore.toast('复制失败')
  }
}

// --- Utils ---
function autoResizeTextarea() {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
    }
  })
}
</script>

<style scoped>
@import 'highlight.js/styles/github-dark.css';

.inline-ai-assistant {
  position: absolute;
  z-index: 1000;
  width: 500px;
  max-width: 90vw;
  max-height: 500px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow-y: auto;
}

.ai-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.ai-input {
  flex-grow: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  max-height: 120px;
}

.btn-send {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-send:disabled {
  opacity: 0.5;
}
.btn-send svg {
  width: 14px;
  height: 14px;
}

.ai-result-wrapper {
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
}

.ai-result {
  line-height: 1.6;
}

.ai-processing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  padding: 8px 0;
}
.ai-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Selected Text Hint */
.selected-text-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}
.selected-text-hint svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
  flex-shrink: 0;
}

/* AI Result Content */
.ai-result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-result {
  line-height: 1.6;
}

/* AI Result Actions */
.ai-result-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-action:hover {
  background: var(--bg-hover);
}
.btn-action svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.btn-replace {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.btn-replace:hover {
  opacity: 0.9;
}

.btn-insert {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.btn-insert:hover {
  opacity: 0.9;
}

/* Markdown Styles */
.markdown-body :deep(p:last-child) {
    margin-bottom: 0;
}
.markdown-body :deep(pre) {
    background: #1e1e1e;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
}
.markdown-body :deep(code:not(pre > code)) {
    background: rgba(175, 184, 193, 0.2);
    padding: .2em .4em;
    border-radius: 3px;
}
</style>
