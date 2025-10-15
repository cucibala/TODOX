<template>
  <header class="header">
    <div class="header-content">
      <div class="header-stats">
        <span class="stat-item">
          <span class="stat-label">总计:</span>
          <span class="stat-value">{{ totalCount }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">已完成:</span>
          <span class="stat-value">{{ completedCount }}</span>
        </span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useTodoStore } from '../stores/todo'

const todoStore = useTodoStore()
const { totalCount, completedCount } = storeToRefs(todoStore)
</script>

