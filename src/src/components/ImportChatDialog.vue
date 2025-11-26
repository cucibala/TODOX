<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog large">
      <h2>导入聊天记录</h2>
      <div class="form">
        <div class="form-group">
          <label>粘贴聊天记录</label>
          <textarea v-model="chatText" rows="15" placeholder="粘贴聊天记录，AI 会自动解析...&#10;&#10;支持格式：&#10;微信导出、QQ导出或纯文本"></textarea>
        </div>
      </div>
      <div class="actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="importChat" class="btn-primary" :disabled="!chatText || importing">
          {{ importing ? '导入中...' : '导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEmotionStore } from '../stores/emotion'
import { useChatStore } from '../stores/chat'
import { useAppStore } from '../stores/app'
import { EmotionAITool } from '../utils/emotion_ai_tool'

const props = defineProps({
  personId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'imported'])

const emotionStore = useEmotionStore()
const chatStore = useChatStore()
const appStore = useAppStore()

const chatText = ref('')
const importing = ref(false)

async function importChat() {
  if (!chatText.value) {
    appStore.toast('请输入聊天记录', 'warning')
    return
  }

  if (!chatStore.currentClient) {
    appStore.toast('AI 客户端未初始化，请先配置 API 密钥', 'warning')
    appStore.showApiKeyDialog = true
    return
  }

  importing.value = true
  try {
    const aiTool = new EmotionAITool(emotionStore, chatStore.currentClient)
    await aiTool.execute('importChatHistory', {
      personId: props.personId,
      chatText: chatText.value,
      format: 'auto'
    })

    appStore.toast('聊天记录导入成功', 'success')
    emit('imported')
  } catch (error) {
    console.error('导入失败:', error)
    appStore.toast('导入失败: ' + error.message, 'error')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 24px;
  width: 600px;
  max-width: 90%;
}

.dialog h2 {
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
