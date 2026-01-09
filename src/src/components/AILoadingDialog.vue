<template>
  <div v-if="appStore.showAILoadingDialog" class="dialog-overlay">
    <div class="loading-dialog">
      <div class="loading-animation">
        <div class="spinner">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4"></circle>
          </svg>
        </div>
        <div class="ai-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
      </div>
      <div class="loading-text">
        <div class="main-text">AI 正在分析任务</div>
        <div class="sub-text">智能拆解中，请稍候<span class="dots">...</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.2s ease;
  backdrop-filter: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.loading-dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 40px 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-animation {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  position: absolute;
  width: 100%;
  height: 100%;
  color: var(--primary-color);
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner circle {
  stroke-dasharray: 95;
  stroke-dashoffset: 25;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes dash {
  0% {
    stroke-dashoffset: 95;
  }
  50% {
    stroke-dashoffset: 25;
  }
  100% {
    stroke-dashoffset: 95;
  }
}

.ai-icon {
  position: absolute;
  width: 32px;
  height: 32px;
  color: var(--primary-color);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.ai-icon svg {
  width: 100%;
  height: 100%;
}

.loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.main-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.sub-text {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.dots {
  display: inline-block;
  width: 20px;
  text-align: left;
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% {
    content: '.';
  }
  40% {
    content: '..';
  }
  60%, 100% {
    content: '...';
  }
}
</style>

