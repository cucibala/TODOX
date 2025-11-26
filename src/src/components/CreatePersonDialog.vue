<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <h2>创建新人物</h2>
      <div class="form">
        <div class="form-group">
          <label>姓名 *</label>
          <input v-model="name" type="text" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label>头像（可选）</label>
          <input v-model="avatar" type="text" placeholder="emoji 或图片链接" maxlength="2" />
        </div>
      </div>
      <div class="actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="create" class="btn-primary" :disabled="!name">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEmotionStore } from '../stores/emotion'

const emit = defineEmits(['close', 'created'])
const emotionStore = useEmotionStore()

const name = ref('')
const avatar = ref('')

async function create() {
  if (!name.value) return

  const person = await emotionStore.createPerson({
    name: name.value,
    avatar: avatar.value || null
  })

  emit('created', person)
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

.form-group input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
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
