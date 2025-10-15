<template>
  <div v-if="showConfirmDialog" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-content">
      <div class="dialog-title">确认操作</div>
      <div class="confirm-dialog-message">{{ confirmMessage }}</div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel" @click="handleCancel">取消</button>
        <button class="dialog-btn dialog-btn-confirm" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { showConfirmDialog, confirmMessage } = storeToRefs(appStore)

function handleCancel() {
  appStore.confirmDialogResult(false)
}

function handleConfirm() {
  appStore.confirmDialogResult(true)
}
</script>

