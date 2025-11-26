<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog large">
      <h2>写日记</h2>
      <div class="form">
        <div class="form-group">
          <label>标题（可选）</label>
          <input v-model="title" type="text" placeholder="日记标题..." />
        </div>
        <div class="form-group">
          <label>内容</label>
          <textarea v-model="content" rows="10" placeholder="记录今天发生的事..."></textarea>
        </div>
        <div class="form-group">
          <label>心情</label>
          <select v-model="emotion">
            <option value="">不标记</option>
            <option value="开心">😊 开心</option>
            <option value="平静">😌 平静</option>
            <option value="难过">😢 难过</option>
            <option value="生气">😠 生气</option>
            <option value="兴奋">🤩 兴奋</option>
            <option value="焦虑">😰 焦虑</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="add" class="btn-primary" :disabled="!content">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEmotionStore } from '../stores/emotion'

const props = defineProps({
  personId: { type: String, required: false, default: null }
})

const emit = defineEmits(['close', 'added'])
const emotionStore = useEmotionStore()

const title = ref('')
const content = ref('')
const emotion = ref('')

async function add() {
  if (!content.value) return

  await emotionStore.createDiary({
    personId: props.personId,
    title: title.value,
    content: content.value,
    emotion: emotion.value || null
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

.form-group input,
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
