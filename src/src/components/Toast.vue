<template>
  <div class="toast-lanes">
    <div
      v-for="(item, index) in activeToasts"
      :key="item.id"
      class="toast"
      :class="`toast-${item.type}`"
      :style="{
        '--toast-duration': `${item.duration}ms`,
        '--toast-delay': `${item.delay || 0}ms`,
        '--toast-push': `${(activeToasts.length - 1 - index) * 40}px`
      }"
      @animationend="() => handleAnimationEnd(item.id)"
    >
      <div class="toast-inner">
        <span class="toast-icon">{{ getIcon(item.type) }}</span>
        <span class="toast-text">{{ item.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { activeToasts } = storeToRefs(appStore)

function getIcon(type) {
  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ'
  }
  return icons[type] || icons.info
}

function handleAnimationEnd(id) {
  appStore.advanceToast(id)
}
</script>

<style scoped>
.toast-lanes {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 32px;
  pointer-events: none;
  z-index: 100002;
}

.toast {
  position: absolute;
  top: 6px;
  left: 8px;
  transform: translateX(-120%);
  padding: 6px 12px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: none;
  max-width: calc(100vw - 16px);
  width: auto;
  height: 20px;
  white-space: nowrap;
  -webkit-app-region: no-drag;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.toast-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transform: translateX(var(--toast-push, 0px));
  transition: transform 0.28s ease;
}

.toast {
  animation: toast-danmaku var(--toast-duration, 3200ms) forwards;
  animation-delay: var(--toast-delay, 0ms);
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
  max-width: calc(100vw - 120px);
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

/* 不同类型的颜色 */
.toast-success {
  background: transparent;
  color: #b8f2c2;
}

.toast-warning {
  background: transparent;
  color: #ffd08a;
}

.toast-error {
  background: transparent;
  color: #ffb3b3;
}

.toast-info {
  background: transparent;
  color: #f5f5f5;
}

@keyframes toast-danmaku {
  0% {
    opacity: 0;
    transform: translateX(-120%);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  12% {
    opacity: 1;
  }
  50% {
    transform: translateX(calc(50vw - 120px));
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  70% {
    opacity: 1;
    transform: translateX(calc(50vw - 120px));
    animation-timing-function: cubic-bezier(0.3, 0.1, 0.7, 0.9);
  }
  100% {
    opacity: 0;
    transform: translateX(100vw);
  }
}
</style>
