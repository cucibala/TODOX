<template>
  <div class="toolbox-page">
    <div class="toolbox-body">
      <aside class="toolbox-sidebar">
        <div class="toolbox-sidebar-title">工具列表</div>
        <button
          v-for="tool in tools"
          :key="tool.id"
          class="toolbox-tool"
          @click="openTool(tool)"
        >
          <span class="toolbox-tool-icon" v-html="tool.icon"></span>
          <span class="toolbox-tool-name">{{ tool.name }}</span>
        </button>
      </aside>

      <main class="toolbox-content">
        <div class="toolbox-tabs">
          <div class="toolbox-tabs-inner">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="toolbox-tab"
              :class="{ active: tab.id === activeTabId }"
              @click="setActiveTab(tab.id)"
            >
              <span class="tab-title">{{ tab.title }}</span>
              <span class="tab-close" @click.stop="closeTab(tab.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </span>
            </button>
            <div v-if="tabs.length === 0" class="toolbox-tabs-empty">
              请选择左侧工具开始
            </div>
          </div>
        </div>
        <div v-if="!activeTab" class="toolbox-empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L3 18v3h3l7.5-7.5a3 3 0 0 0 4.2-4.2l-3-3z"></path>
              <path d="M8.5 13.5l2 2"></path>
            </svg>
          </div>
          <h3>还没有打开工具</h3>
          <p>点击左侧工具，创建新的工具页面</p>
        </div>

        <section v-else class="tool-card">
          <div v-if="activeTab.type === 'image-to-base64'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>选择图片后生成 Base64 字符串</span>
                </div>
              </div>
              <span class="tool-tag">图片</span>
            </div>
            <div class="tool-card-body" tabindex="0" @paste="(event) => handlePasteImage(event, activeTab)">
              <input
                type="file"
                accept="image/*"
                class="tool-hidden-input"
                :ref="(el) => setImageInputRef(activeTab.id, el)"
                @change="(event) => handleImageChange(event, activeTab)"
              />
              <div
                class="tool-upload"
                @dragover.prevent
                @drop.prevent="(event) => handleDropImage(event, activeTab)"
              >
                <div class="tool-upload-info">
                  <div class="tool-upload-title">选择图片文件</div>
                  <div class="tool-upload-desc">支持 PNG / JPG / GIF / WebP，可拖放或粘贴</div>
                  <div v-if="activeTab.state.imageName" class="tool-file-meta">
                    <span>{{ activeTab.state.imageName }}</span>
                    <span>{{ activeTab.state.imageSize }}</span>
                  </div>
                </div>
                <button class="tool-btn primary" @click="handlePickImage(activeTab)">选择图片</button>
                <button class="tool-btn" :disabled="!activeTab.state.imageDataUrl" @click="handleClearImageToBase64(activeTab)">清空</button>
              </div>

              <div v-if="activeTab.state.imageDataUrl" class="tool-preview">
                <img :src="activeTab.state.imageDataUrl" alt="图片预览" @error="handleImagePreviewError" />
              </div>

              <div class="tool-output">
                <label>Base64 输出</label>
                <textarea
                  v-model="activeTab.state.imageBase64"
                  rows="6"
                  placeholder="这里会显示 Base64 内容"
                  readonly
                ></textarea>
                <div class="tool-actions">
                  <button
                    class="tool-btn"
                    :disabled="!activeTab.state.imageBase64"
                    @click="handleCopy(activeTab.state.imageBase64, '已复制 Base64')"
                  >
                    复制 Base64
                  </button>
                  <button
                    class="tool-btn"
                    :disabled="!activeTab.state.imageDataUrl"
                    @click="handleCopy(activeTab.state.imageDataUrl, '已复制 Data URL')"
                  >
                    复制 Data URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab.type === 'base64-to-image'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>输入 Base64 或 Data URL 生成预览</span>
                </div>
              </div>
              <span class="tool-tag">转换</span>
            </div>
            <div class="tool-card-body">
              <div class="tool-input">
                <label>Base64 输入</label>
                <textarea
                  v-model="activeTab.state.base64Input"
                  rows="6"
                  placeholder="粘贴 Base64 内容或 data:image/...;base64, 开头的 Data URL"
                ></textarea>
                <div class="tool-actions">
                  <button class="tool-btn primary" @click="handleGenerateImage(activeTab)">生成预览</button>
                  <button class="tool-btn" :disabled="!activeTab.state.base64Input" @click="handleClearBase64ToImage(activeTab)">清空</button>
                </div>
              </div>

              <div v-if="activeTab.state.base64ImageUrl" class="tool-preview">
                <img :src="activeTab.state.base64ImageUrl" alt="Base64 预览" @error="handleBase64PreviewError(activeTab)" />
              </div>

              <div class="tool-actions">
                <button
                  class="tool-btn"
                  :disabled="!activeTab.state.base64ImageUrl"
                  @click="handleCopy(activeTab.state.base64ImageUrl, '已复制 Data URL')"
                >
                  复制 Data URL
                </button>
                <button
                  class="tool-btn"
                  :disabled="!activeTab.state.base64ImageUrl"
                  @click="handleDownloadImage(activeTab)"
                >
                  下载图片
                </button>
              </div>
              <div v-if="activeTab.state.base64Error" class="tool-error">{{ activeTab.state.base64Error }}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()

const tools = [
  {
    id: 'image-to-base64',
    name: '图片转 Base64',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    `
  },
  {
    id: 'base64-to-image',
    name: 'Base64 转图片',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    `
  }
]

const tabs = ref([])
const activeTabId = ref(null)
const imageInputRefs = ref({})
let nextTabId = 1

const activeTab = computed(() => tabs.value.find(tab => tab.id === activeTabId.value))

function openTool(tool) {
  const existing = tabs.value.find(tab => tab.type === tool.id)
  if (existing) {
    activeTabId.value = existing.id
    return
  }
  const tab = createTab(tool)
  tabs.value.push(tab)
  activeTabId.value = tab.id
}

function setActiveTab(tabId) {
  activeTabId.value = tabId
}

function closeTab(tabId) {
  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index === -1) return

  const wasActive = tabId === activeTabId.value
  tabs.value.splice(index, 1)
  delete imageInputRefs.value[tabId]

  if (wasActive) {
    const leftTab = tabs.value[index - 1]
    const fallbackTab = leftTab || tabs.value[index] || null
    activeTabId.value = fallbackTab ? fallbackTab.id : null
  }
}

function createTab(tool) {
  const id = nextTabId++
  return {
    id,
    title: tool.name,
    type: tool.id,
    state: tool.id === 'image-to-base64' ? createImageToBase64State() : createBase64ToImageState()
  }
}

function createImageToBase64State() {
  return {
    imageName: '',
    imageSize: '',
    imageBase64: '',
    imageDataUrl: ''
  }
}

function createBase64ToImageState() {
  return {
    base64Input: '',
    base64ImageUrl: '',
    base64Error: ''
  }
}

function setImageInputRef(tabId, element) {
  if (!tabId || !element) return
  imageInputRefs.value[tabId] = element
}

function handlePickImage(tab) {
  const input = imageInputRefs.value[tab.id]
  input?.click()
}

function handleImageChange(event, tab) {
  const file = event.target.files?.[0]
  if (!file) return
  processImageFile(tab, file)
}

function handleDropImage(event, tab) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    appStore.toast('请拖放图片文件', 'warning')
    return
  }
  processImageFile(tab, file)
}

function handlePasteImage(event, tab) {
  const items = event.clipboardData?.items
  if (!items) return
  let imageFile = null
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      imageFile = item.getAsFile()
      break
    }
  }
  if (!imageFile) {
    appStore.toast('剪贴板中没有图片', 'warning')
    return
  }
  event.preventDefault()
  processImageFile(tab, imageFile)
}

function processImageFile(tab, file) {
  tab.state.imageName = file.name || 'clipboard-image'
  tab.state.imageSize = formatFileSize(file.size)

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result || ''
    if (typeof dataUrl !== 'string') {
      appStore.toast('图片读取失败')
      return
    }
    tab.state.imageDataUrl = dataUrl
    tab.state.imageBase64 = stripDataUrl(dataUrl)
  }
  reader.onerror = () => {
    appStore.toast('图片读取失败')
  }
  reader.readAsDataURL(file)
}

function handleClearImageToBase64(tab) {
  tab.state.imageName = ''
  tab.state.imageSize = ''
  tab.state.imageBase64 = ''
  tab.state.imageDataUrl = ''
  const input = imageInputRefs.value[tab.id]
  if (input) {
    input.value = ''
  }
}

function handleGenerateImage(tab) {
  const normalized = normalizeBase64(tab.state.base64Input)
  if (!normalized) {
    tab.state.base64Error = '请输入 Base64 内容'
    appStore.toast('请输入 Base64 内容', 'warning')
    return
  }
  const dataUrl = ensureDataUrl(normalized)
  if (!dataUrl) {
    tab.state.base64Error = 'Base64 格式不正确'
    appStore.toast('Base64 格式不正确', 'warning')
    return
  }
  tab.state.base64ImageUrl = dataUrl
  tab.state.base64Error = ''
}

function handleClearBase64ToImage(tab) {
  tab.state.base64Input = ''
  tab.state.base64ImageUrl = ''
  tab.state.base64Error = ''
}

function handleImagePreviewError() {
  appStore.toast('图片预览失败', 'warning')
}

function handleBase64PreviewError(tab) {
  tab.state.base64Error = '图片预览失败，请检查 Base64 内容是否正确'
  appStore.toast('图片预览失败', 'warning')
}

async function handleCopy(text, message) {
  if (!text) {
    appStore.toast('没有可复制的内容', 'warning')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    appStore.toast(message || '已复制到剪贴板', 'success')
  } catch (error) {
    appStore.toast('复制失败', 'error')
  }
}

function handleDownloadImage(tab) {
  if (!tab.state.base64ImageUrl) {
    appStore.toast('没有可下载的图片', 'warning')
    return
  }
  const link = document.createElement('a')
  link.href = tab.state.base64ImageUrl
  link.download = `base64-image.${mimeToExt(parseMimeFromDataUrl(tab.state.base64ImageUrl))}`
  link.click()
}

function normalizeBase64(value) {
  if (!value) return ''
  return value.trim().replace(/\s+/g, '')
}

function stripDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:.*;base64,(.*)$/)
  return match ? match[1] : dataUrl
}

function parseMimeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'image/png'
}

function ensureDataUrl(base64) {
  if (!base64) return ''
  if (base64.startsWith('data:')) return base64
  const mime = guessMime(base64)
  return `data:${mime};base64,${base64}`
}

function guessMime(base64) {
  if (base64.startsWith('iVBORw0')) return 'image/png'
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

function mimeToExt(mime) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/bmp') return 'bmp'
  return 'png'
}

function formatFileSize(size) {
  if (!size && size !== 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.toolbox-page {
  height: 100%;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.toolbox-tabs {
  margin-bottom: 16px;
  background: linear-gradient(180deg, #f6f7fb 0%, #eef1f7 100%);
  border: 1px solid var(--border-color);
  border-radius: 14px;
}

.toolbox-tabs-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.toolbox-tabs-inner::-webkit-scrollbar {
  height: 6px;
}

.toolbox-tabs-inner::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}

.toolbox-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 12px 12px 6px 6px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbox-tab:hover {
  border-color: rgba(108, 92, 231, 0.2);
  color: var(--text-primary);
}

.toolbox-tab.active {
  background: #ffffff;
  color: var(--text-primary);
  border-color: rgba(108, 92, 231, 0.2);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
}

.tab-title {
  white-space: nowrap;
}

.tab-close {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.tab-close svg {
  width: 12px;
  height: 12px;
}

.tab-close:hover {
  background: rgba(148, 163, 184, 0.2);
  color: var(--text-primary);
}

.toolbox-tabs-empty {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 6px 4px;
}

.toolbox-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.toolbox-sidebar {
  width: 220px;
  padding: 16px 14px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbox-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.toolbox-tool {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f8f9ff;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbox-tool:hover {
  border-color: rgba(108, 92, 231, 0.25);
  box-shadow: 0 6px 12px rgba(15, 23, 42, 0.08);
}

.toolbox-tool-icon :deep(svg) {
  width: 18px;
  height: 18px;
  color: #5f6be4;
}

.toolbox-content {
  flex: 1;
  padding: 18px 22px 24px;
  overflow-y: auto;
}

.toolbox-empty-state {
  height: 100%;
  border-radius: 18px;
  border: 1px dashed var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
}

.toolbox-empty-state .empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: rgba(108, 92, 231, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6be4;
}

.toolbox-empty-state svg {
  width: 26px;
  height: 26px;
}

.toolbox-empty-state h3 {
  margin: 4px 0 0;
  font-size: 16px;
  color: var(--text-primary);
}

.toolbox-empty-state p {
  margin: 0;
  font-size: 13px;
}

.tool-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tool-card-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(135deg, rgba(120, 150, 255, 0.08) 0%, rgba(120, 150, 255, 0.02) 100%);
}

.tool-card-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-card-title svg {
  width: 22px;
  height: 22px;
  color: #5f6be4;
}

.tool-card-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.tool-card-title span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tool-tag {
  padding: 4px 10px;
  font-size: 11px;
  color: #4b63f0;
  background: rgba(88, 101, 242, 0.12);
  border-radius: 999px;
  font-weight: 600;
}

.tool-card-body {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-hidden-input {
  display: none;
}

.tool-upload {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8f9ff;
  border: 1px dashed rgba(108, 92, 231, 0.2);
}

.tool-upload-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.tool-upload-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.tool-file-meta {
  margin-top: 6px;
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tool-preview {
  border-radius: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-preview img {
  max-width: 100%;
  max-height: 220px;
  border-radius: 10px;
  object-fit: contain;
}

.tool-output label,
.tool-input label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  display: block;
}

.tool-output textarea,
.tool-input textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.tool-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.tool-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--primary-color);
  background: var(--bg-primary);
}

.tool-btn.primary {
  background: linear-gradient(135deg, #6f7eea 0%, #5c6df2 100%);
  color: white;
  border-color: transparent;
}

.tool-btn.primary:hover:not(:disabled) {
  box-shadow: 0 8px 16px rgba(92, 109, 242, 0.25);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.tool-error {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(245, 101, 101, 0.12);
  color: var(--danger-color);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .toolbox-body {
    flex-direction: column;
  }

  .toolbox-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .tool-upload {
    grid-template-columns: 1fr;
  }
}
</style>
