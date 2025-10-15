<template>
  <div v-if="showPasswordDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content" style="min-width: 420px;">
      <div class="dialog-title" style="margin-bottom: 24px; text-align: center;">密码设置</div>
      <form @submit.prevent="handleConfirm">
        <div v-if="hasPassword" class="password-form-group">
          <label class="password-label">当前密码</label>
          <input 
            v-model="oldPassword" 
            type="password" 
            class="password-input" 
            placeholder="输入当前密码" 
            autocomplete="off"
          />
        </div>
        <div class="password-form-group">
          <label class="password-label">新密码</label>
          <input 
            v-model="newPassword" 
            type="password" 
            class="password-input" 
            placeholder="输入新密码（至少4位）" 
            autocomplete="off"
            required
            minlength="4"
          />
        </div>
        <div class="password-form-group">
          <label class="password-label">确认密码</label>
          <input 
            v-model="confirmPassword" 
            type="password" 
            class="password-input" 
            placeholder="再次输入新密码" 
            autocomplete="off"
            required
          />
        </div>
        <div v-if="error" class="password-error">{{ error }}</div>
        <div class="dialog-footer" style="margin-top: 24px;">
          <button type="button" class="dialog-btn dialog-btn-cancel" @click="handleClose">取消</button>
          <button 
            v-if="hasPassword" 
            type="button" 
            class="password-dialog-btn-clear" 
            @click="handleClear"
            style="background: var(--danger-color); color: white; padding: 10px 18px; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer;"
          >
            清除密码
          </button>
          <button type="submit" class="dialog-btn dialog-btn-confirm">确定</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { showPasswordDialog } = storeToRefs(appStore)

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const hasPassword = ref(false)

const electronAPI = window.electronAPI

watch(showPasswordDialog, async (show) => {
  if (show) {
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
    
    const result = await electronAPI.hasPassword()
    hasPassword.value = result.hasPassword
  }
})

function handleClose() {
  appStore.showPasswordDialog = false
}

async function handleConfirm() {
  error.value = ''
  
  if (newPassword.value.length < 4) {
    error.value = '密码至少需要4位'
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  
  let result
  
  if (hasPassword.value) {
    if (!oldPassword.value) {
      error.value = '请输入当前密码'
      return
    }
    result = await electronAPI.changePassword(oldPassword.value, newPassword.value)
  } else {
    result = await electronAPI.setPassword(newPassword.value)
  }
  
  if (result.success) {
    appStore.toast(hasPassword.value ? '密码修改成功' : '密码设置成功')
    handleClose()
  } else {
    error.value = result.error || '操作失败'
  }
}

async function handleClear() {
  error.value = ''
  
  if (!oldPassword.value) {
    error.value = '请输入当前密码以清除密码保护'
    return
  }
  
  const result = await electronAPI.clearPassword(oldPassword.value)
  
  if (result.success) {
    appStore.toast('密码保护已清除')
    handleClose()
  } else {
    error.value = result.error || '清除失败'
  }
}
</script>

<style scoped>
.password-form-group {
  margin-bottom: 18px;
}

.password-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.password-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.password-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-error {
  color: var(--danger-color);
  font-size: 12px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: rgba(245, 101, 101, 0.1);
  border-radius: var(--radius-sm);
  text-align: center;
}
</style>

