<template>
  <div class="toast" :class="[{ show: showToast }, `toast-${toastType}`]">
    <span class="toast-icon">{{ getIcon(toastType) }}</span>
    <span class="toast-text">{{ toastMessage }}</span>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { toastMessage, toastType, showToast } = storeToRefs(appStore)

function getIcon(type) {
  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ'
  }
  return icons[type] || icons.info
}
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  z-index: 10000;
  opacity: 0;
  transition: all 0.3s ease-in-out;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: auto;
  height: 20px;
  white-space: nowrap;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.toast-text {
  flex: 0 1 auto;
  max-width: 450px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

/* 不同类型的颜色 */
.toast-success {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.toast-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.toast-error {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.toast-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
</style>
