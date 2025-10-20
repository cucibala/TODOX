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
.ai-summary-dialog {
  max-width: 600px;
  width: 90%;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-header svg:first-child {
  width: 24px;
  height: 24px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.dialog-header h3 {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-close svg {
  width: 20px;
  height: 20px;
}

.summary-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 20px;
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
</style>

