<template>
  <div v-if="appStore.showAISummaryDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-box ai-summary-dialog">
      <div class="dialog-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h3>今日任务总结</h3>
        <button class="btn-close" @click="handleClose" title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="summary-content">
        {{ appStore.aiSummaryContent }}
      </div>
      
      <div class="dialog-actions">
        <button class="btn-confirm" @click="handleClose">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'

const appStore = useAppStore()

function handleClose() {
  appStore.showAISummaryDialog = false
  appStore.aiSummaryContent = ''
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
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-box {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  overflow: hidden;
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

.ai-summary-dialog {
  width: 600px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
}

.dialog-header svg:first-child {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.dialog-header h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-close svg {
  width: 16px;
  height: 16px;
}

.summary-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-primary);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.summary-content::-webkit-scrollbar {
  width: 8px;
}

.summary-content::-webkit-scrollbar-track {
  background: transparent;
}

.summary-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.summary-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 20px 20px;
}

.btn-confirm {
  padding: 9px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--primary-color);
  color: white;
  min-width: 80px;
}

.btn-confirm:hover {
  background: var(--primary-hover);
}
</style>

