<template>
  <div
    v-if="show"
    class="inline-ai-assistant"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    ref="panelRef"
  >
    <div class="ai-content">
      <div class="ai-input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="question"
          placeholder="向 AI 提问 (Ctrl+Enter 发送)"
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
        <div v-if="aiResult" class="ai-result markdown-body" v-html="renderedAIResult"></div>
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
  }
})

const emit = defineEmits(['close', 'insert'])

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
  
  const messages = [
    { role: 'system', content: '你是一个通用的 AI 助手，请简洁、专业、友好地回答用户的问题。' },
    { role: 'user', content: currentQuestion }
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
