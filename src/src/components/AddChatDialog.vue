<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h2>添加聊天记录</h2>
      <div class="form">
        <div class="form-group">
          <label>发送者</label>
          <select v-model="sender">
            <option value="me">我</option>
            <option value="them">对方</option>
          </select>
        </div>
        <div class="form-group">
          <label>消息内容</label>
          <textarea v-model="content" rows="4" placeholder="输入消息内容..."></textarea>
        </div>
      </div>
      <div class="actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="add" class="btn-primary" :disabled="!content">添加</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEmotionStore } from '../stores/emotion'

const props = defineProps({
  personId: { type: String, required: true }
})

const emit = defineEmits(['close', 'added'])
const emotionStore = useEmotionStore()

const sender = ref('them')
const content = ref('')

async function add() {
  if (!content.value) return

  await emotionStore.addChatRecord({
    personId: props.personId,
    sender: sender.value,
    content: content.value
  })

  emit('added')
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
  width: 400px;
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

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
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
