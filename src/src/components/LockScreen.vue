<template>
  <div class="lock-screen" :class="{ 'lock-screen--no-anim': initialLock }">
    <div class="lock-content">
      <div class="lock-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h2 class="lock-title">TodoX 已锁定</h2>
      <p class="lock-subtitle">请输入密码解锁</p>
      <form @submit.prevent="handleUnlock" class="lock-form">
        <input 
          v-model="password" 
          type="password" 
          class="lock-input" 
          placeholder="输入密码" 
          ref="passwordInput"
          autocomplete="off"
        />
        <div v-if="error" class="lock-error">{{ error }}</div>
        <button type="submit" class="lock-btn">解锁</button>
      </form>
      <div class="lock-footer">
        <button 
          type="button" 
          class="lock-link" 
          @click="appStore.showPasswordDialog = true"
        >
          设置/修改密码
        </button>
        <button
          type="button"
          class="lock-link"
          @click="openToolbox"
        >
          进入工具箱
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const { initialLock } = defineProps({
  initialLock: {
    type: Boolean,
    default: false
  }
})

const appStore = useAppStore()
const password = ref('')
const error = ref('')
const passwordInput = ref(null)

onMounted(() => {
  setTimeout(() => {
    passwordInput.value?.focus()
  }, 100)
})

async function handleUnlock() {
  error.value = ''
  const result = await appStore.unlockApp(password.value)
  
  if (!result.success) {
    error.value = result.error
    password.value = ''
    passwordInput.value?.focus()
  } else {
    password.value = ''
  }
}

function openToolbox() {
  appStore.currentPage = 'tools'
}
</script>

