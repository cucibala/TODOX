<template>
  <div class="toolbox-page">
    <div class="toolbox-body">
      <aside v-if="!props.hideSidebar" class="toolbox-sidebar">
        <div class="toolbox-sidebar-title">工具列表</div>
        <button
          v-for="tool in availableTools"
          :key="tool.id"
          class="toolbox-tool"
          @click="openTool(tool)"
        >
          <span class="toolbox-tool-icon" v-html="tool.icon"></span>
          <span class="toolbox-tool-name">{{ tool.name }}</span>
        </button>
      </aside>

      <main class="toolbox-content" :class="{ 'toolbox-content-standalone': props.hideSidebar }">
        <div v-if="!props.hideTabs" class="toolbox-tabs">
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
          <h3>{{ props.standaloneToolId ? '正在打开工具' : '还没有打开工具' }}</h3>
          <p>{{ props.standaloneToolId ? '请稍候，正在初始化页面内容' : '点击左侧工具，创建新的工具页面' }}</p>
        </div>

        <section v-else class="tool-card">
          <div v-if="activeTab.type === 'image-to-base64'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>选择任意文件后生成 Base64 字符串</span>
                </div>
              </div>
              <span class="tool-tag">文件</span>
            </div>
            <div class="tool-card-body" tabindex="0" @paste="(event) => handlePasteImage(event, activeTab)">
              <input
                type="file"
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
                  <div class="tool-upload-title">选择文件</div>
                  <div class="tool-upload-desc">支持任意文件类型，可拖放或粘贴文件</div>
                  <div v-if="activeTab.state.imageName" class="tool-file-meta">
                    <span>{{ activeTab.state.imageName }}</span>
                    <span>{{ activeTab.state.imageSize }}</span>
                    <span v-if="activeTab.state.fileType">{{ activeTab.state.fileType }}</span>
                  </div>
                </div>
                <button class="tool-btn primary" @click="handlePickImage(activeTab)">选择文件</button>
                <button class="tool-btn" :disabled="!activeTab.state.imageDataUrl" @click="handleClearImageToBase64(activeTab)">清空</button>
              </div>

              <div v-if="activeTab.state.imageDataUrl" class="tool-preview">
                <img v-if="activeTab.state.isImage" :src="activeTab.state.imageDataUrl" alt="图片预览" @error="handleImagePreviewError" />
                <div v-else class="tool-file-info">
                  <div class="file-info-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                  </div>
                  <div class="file-info-details">
                    <div class="file-info-name">{{ activeTab.state.imageName }}</div>
                    <div class="file-info-meta">
                      <span>{{ activeTab.state.imageSize }}</span>
                      <span v-if="activeTab.state.fileType">{{ activeTab.state.fileType }}</span>
                    </div>
                  </div>
                </div>
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

          <div v-else-if="activeTab.type === 'http-image-receiver'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12h4l3 8 4-16 3 8h4"></path>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>启动本地 HTTP 服务，接收图片并实时预览</span>
                </div>
              </div>
              <span class="tool-tag">接口</span>
            </div>
            <div class="tool-card-body">
              <div class="tool-status">
                <div class="tool-status-item">
                  <span class="tool-status-label">服务状态</span>
                  <span class="tool-status-pill" :class="{ running: activeTab.state.serverRunning }">
                    {{ activeTab.state.serverRunning ? '运行中' : '已停止' }}
                  </span>
                </div>
                <div class="tool-status-item">
                  <span class="tool-status-label">监听地址</span>
                  <span class="tool-status-value">{{ formatListenAddress(activeTab.state) }}</span>
                </div>
                <div v-if="activeTab.state.lastError" class="tool-status-error">
                  {{ activeTab.state.lastError }}
                </div>
              </div>

              <div class="tool-actions">
                <button class="tool-btn primary" :disabled="activeTab.state.serverRunning" @click="handleStartHttpServer(activeTab)">
                  启动服务
                </button>
                <button class="tool-btn" :disabled="!activeTab.state.serverRunning" @click="handleStopHttpServer(activeTab)">
                  停止服务
                </button>
                <button class="tool-btn" :disabled="!activeTab.state.imageDataUrl" @click="handleClearHttpImage(activeTab)">
                  清空图片
                </button>
              </div>

              <div class="tool-output">
                <label>调用示例</label>
                <textarea
                  :value="buildHttpExample(activeTab.state.host, activeTab.state.port)"
                  rows="5"
                  readonly
                ></textarea>
              </div>

              <div v-if="activeTab.state.imageDataUrl" class="tool-preview">
                <img :src="activeTab.state.imageDataUrl" alt="HTTP 图片预览" @error="handleHttpImagePreviewError(activeTab)" />
              </div>
              <div v-else class="tool-preview tool-preview-empty">
                暂无图片，等待 /set_image 上传
              </div>
              <div v-if="activeTab.state.receivedAt" class="tool-meta">
                <span>接收时间：{{ formatReceivedAt(activeTab.state.receivedAt) }}</span>
                <span v-if="activeTab.state.payloadBytes">大小：{{ formatFileSize(activeTab.state.payloadBytes) }}</span>
                <span v-if="activeTab.state.mime">类型：{{ activeTab.state.mime }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab.type === 'text-to-qrcode'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="3" height="3" rx="0.5"></rect>
                  <rect x="19" y="19" width="2" height="2" rx="0.5"></rect>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>输入文字或链接生成二维码（需联网）</span>
                </div>
              </div>
              <span class="tool-tag">文本</span>
            </div>
            <div class="tool-card-body">
              <div class="tool-input">
                <label>内容</label>
                <textarea
                  v-model="activeTab.state.textInput"
                  rows="5"
                  placeholder="输入文字、链接或任意内容"
                ></textarea>
                <div class="tool-form-row">
                  <span class="tool-inline-label">尺寸</span>
                  <input
                    type="number"
                    v-model.number="activeTab.state.size"
                    min="128"
                    max="1024"
                    step="8"
                  />
                  <span class="tool-inline-hint">px（128-1024）</span>
                </div>
                <div class="tool-actions">
                  <button class="tool-btn primary" @click="handleGenerateQr(activeTab)">生成二维码</button>
                  <button class="tool-btn" :disabled="!activeTab.state.textInput" @click="handleClearTextToQr(activeTab)">清空</button>
                </div>
              </div>

              <div v-if="activeTab.state.qrDataUrl" class="tool-preview">
                <img :src="activeTab.state.qrDataUrl" alt="二维码预览" @error="handleQrPreviewError(activeTab)" />
              </div>
              <div v-else class="tool-preview tool-preview-empty">
                暂无二维码
              </div>

              <div class="tool-actions">
                <button
                  class="tool-btn"
                  :disabled="!activeTab.state.qrDataUrl"
                  @click="handleCopy(activeTab.state.qrDataUrl, '已复制二维码链接')"
                >
                  复制链接
                </button>
                <button
                  class="tool-btn"
                  :disabled="!activeTab.state.qrDataUrl"
                  @click="handleDownloadQr(activeTab)"
                >
                  下载二维码
                </button>
              </div>
              <div v-if="activeTab.state.qrError" class="tool-error">{{ activeTab.state.qrError }}</div>
            </div>
          </div>

          <div v-else-if="activeTab.type === 'ssh-connector'">
            <div class="tool-card-header">
              <div class="tool-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="14" rx="2"></rect>
                  <path d="M7 8l3 3-3 3"></path>
                  <line x1="12" y1="14" x2="17" y2="14"></line>
                  <path d="M8 20h8"></path>
                </svg>
                <div>
                  <h3>{{ activeTab.title }}</h3>
                  <span>保存 SSH 连接信息，通过系统终端快速发起连接</span>
                </div>
              </div>
              <span class="tool-tag">SSH</span>
            </div>
            <div class="tool-card-body ssh-tool-body">
              <div class="ssh-security-note">
                支持保存主机、端口、用户名、密码、私钥路径和登录后命令；通过系统终端连接时，密码仍可能由 ssh 自行提示输入。
              </div>

              <div class="ssh-tool-layout">
                <section class="ssh-saved-list">
                  <div class="ssh-panel-header">
                    <div>
                      <div class="ssh-panel-title">已保存连接</div>
                      <div class="ssh-panel-subtitle">
                        {{ getFilteredSshConnections(activeTab).length }} 个结果
                      </div>
                    </div>
                    <button class="tool-btn" @click="handleCreateSshConnection(activeTab)">新建</button>
                  </div>

                  <div class="ssh-search-box">
                    <input
                      v-model="activeTab.state.searchQuery"
                      type="text"
                      placeholder="搜索名称、主机、用户名"
                    />
                  </div>

                  <div v-if="activeTab.state.loading" class="ssh-empty-state">
                    正在加载连接信息...
                  </div>
                  <div v-else-if="getFilteredSshConnections(activeTab).length === 0" class="ssh-empty-state">
                    还没有保存 SSH 连接
                  </div>

                  <div v-else class="ssh-connection-list">
                    <div
                      v-for="connection in getFilteredSshConnections(activeTab)"
                      :key="connection.id"
                      class="ssh-connection-card"
                      :class="{ active: activeTab.state.selectedConnectionId === connection.id }"
                      tabindex="0"
                      @click="selectSshConnection(activeTab, connection.id)"
                      @keydown.enter.prevent="selectSshConnection(activeTab, connection.id)"
                      @keydown.space.prevent="selectSshConnection(activeTab, connection.id)"
                    >
                      <div class="ssh-connection-card-head">
                        <div class="ssh-connection-name">{{ connection.name }}</div>
                        <div class="ssh-connection-target">{{ formatSshTarget(connection) }}</div>
                      </div>

                      <div class="ssh-connection-badges">
                        <span v-if="connection.password" class="ssh-badge">密码</span>
                        <span v-if="connection.privateKeyPath" class="ssh-badge">私钥</span>
                        <span v-if="connection.remoteCommand" class="ssh-badge">命令</span>
                        <span v-if="connection.lastConnectedAt" class="ssh-badge subtle">最近使用</span>
                      </div>

                      <div class="ssh-connection-meta">
                        <span v-if="connection.lastConnectedAt">上次连接：{{ formatSshTime(connection.lastConnectedAt) }}</span>
                        <span v-else>尚未连接</span>
                      </div>

                      <div class="ssh-card-actions">
                        <button class="ssh-mini-btn primary" @click.stop="handleConnectSsh(activeTab, connection)">
                          连接
                        </button>
                        <button class="ssh-mini-btn" @click.stop="handleCopySshCommand(connection)">
                          复制命令
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="ssh-editor-panel">
                  <div class="ssh-panel-header">
                    <div>
                      <div class="ssh-panel-title">
                        {{ activeTab.state.selectedConnectionId ? '编辑连接' : '新建连接' }}
                      </div>
                      <div class="ssh-panel-subtitle">
                        连接会在系统终端中打开，适合密码登录或 SSH Key 登录
                      </div>
                    </div>
                  </div>

                  <div class="ssh-form-grid">
                    <label class="ssh-field">
                      <span>连接名称</span>
                      <input v-model="activeTab.state.draft.name" type="text" placeholder="例如：生产服务器" />
                    </label>

                    <label class="ssh-field">
                      <span>主机地址</span>
                      <input v-model="activeTab.state.draft.host" type="text" placeholder="例如：192.168.1.88 或 example.com" />
                    </label>

                    <label class="ssh-field">
                      <span>用户名</span>
                      <input v-model="activeTab.state.draft.username" type="text" placeholder="留空则使用系统默认用户" />
                    </label>

                    <label class="ssh-field">
                      <span>端口</span>
                      <input v-model.number="activeTab.state.draft.port" type="number" min="1" max="65535" placeholder="22" />
                    </label>
                  </div>

                  <label class="ssh-field">
                    <span>私钥路径</span>
                    <div class="ssh-inline-field">
                      <input
                        v-model="activeTab.state.draft.privateKeyPath"
                        type="text"
                        placeholder="例如：C:\\Users\\me\\.ssh\\id_ed25519"
                      />
                      <button class="tool-btn" @click="handlePickSshPrivateKey(activeTab)">选择文件</button>
                      <button
                        class="tool-btn"
                        :disabled="!activeTab.state.draft.privateKeyPath"
                        @click="activeTab.state.draft.privateKeyPath = ''"
                      >
                        清空
                      </button>
                    </div>
                  </label>

                  <label class="ssh-field">
                    <span>登录密码</span>
                    <input
                      v-model="activeTab.state.draft.password"
                      type="password"
                      autocomplete="current-password"
                      placeholder="可留空；保存后可在 SSH 页面复用"
                    />
                  </label>

                  <label class="ssh-field">
                    <span>登录后命令</span>
                    <textarea
                      v-model="activeTab.state.draft.remoteCommand"
                      rows="3"
                      placeholder="例如：tmux attach || tmux"
                    ></textarea>
                  </label>

                  <label class="ssh-field">
                    <span>备注</span>
                    <textarea
                      v-model="activeTab.state.draft.note"
                      rows="3"
                      placeholder="补充说明、环境用途、跳板机信息等"
                    ></textarea>
                  </label>

                  <div class="ssh-command-preview">
                    <label>命令预览</label>
                    <textarea
                      :value="buildSshCommandPreview(activeTab.state.draft)"
                      rows="3"
                      readonly
                    ></textarea>
                  </div>

                  <div class="tool-actions ssh-form-actions">
                    <button class="tool-btn primary" @click="handleSaveSshConnection(activeTab)">保存连接</button>
                    <button class="tool-btn" @click="handleSaveAndConnectSsh(activeTab)">保存并连接</button>
                    <button class="tool-btn" @click="handleConnectSsh(activeTab, activeTab.state.draft)">直接连接</button>
                    <button class="tool-btn" @click="handleCopySshCommand(activeTab.state.draft)">复制命令</button>
                    <button
                      class="tool-btn"
                      :disabled="!activeTab.state.selectedConnectionId"
                      @click="handleDeleteSshConnection(activeTab)"
                    >
                      删除连接
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { generateId } from '../utils/tools'

const props = defineProps({
  standaloneToolId: {
    type: String,
    default: ''
  },
  hideSidebar: {
    type: Boolean,
    default: false
  },
  hideTabs: {
    type: Boolean,
    default: false
  }
})

const appStore = useAppStore()
const electronAPI = window.electronAPI

const tools = [
  {
    id: 'image-to-base64',
    name: '文件转 Base64',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
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
  },
  {
    id: 'http-image-receiver',
    name: 'HTTP 图片接收',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h4l3 8 4-16 3 8h4"></path>
      </svg>
    `
  },
  {
    id: 'text-to-qrcode',
    name: '文字转二维码',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="3" height="3" rx="0.5"></rect>
        <rect x="19" y="19" width="2" height="2" rx="0.5"></rect>
      </svg>
    `
  },
  {
    id: 'ssh-connector',
    name: 'SSH 连接器',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="14" rx="2"></rect>
        <path d="M7 8l3 3-3 3"></path>
        <line x1="12" y1="14" x2="17" y2="14"></line>
        <path d="M8 20h8"></path>
      </svg>
    `
  }
]

const availableTools = computed(() => {
  if (props.standaloneToolId) {
    return tools.filter(tool => tool.id === props.standaloneToolId)
  }
  return tools.filter(tool => tool.id !== 'ssh-connector')
})

const tabs = ref([])
const activeTabId = ref(null)
const imageInputRefs = ref({})
let nextTabId = 1
let latestHttpImagePayload = null

const activeTab = computed(() => tabs.value.find(tab => tab.id === activeTabId.value))

function openTool(tool) {
  const existing = tabs.value.find(tab => tab.type === tool.id)
  if (existing) {
    if (tool.id === 'ssh-connector') {
      loadSshConnections(existing)
    }
    activeTabId.value = existing.id
    return
  }
  const tab = createTab(tool)
  tabs.value.push(tab)
  activeTabId.value = tab.id
  if (tool.id === 'ssh-connector') {
    loadSshConnections(tab)
  }
}

if (props.standaloneToolId) {
  const standaloneTool = tools.find(tool => tool.id === props.standaloneToolId)
  if (standaloneTool) {
    openTool(standaloneTool)
  }
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
    state: createToolState(tool.id)
  }
}

function createToolState(type) {
  if (type === 'image-to-base64') return createImageToBase64State()
  if (type === 'base64-to-image') return createBase64ToImageState()
  if (type === 'text-to-qrcode') return createTextToQrState()
  if (type === 'ssh-connector') return createSshConnectorState()
  return createHttpImageReceiverState()
}

function createImageToBase64State() {
  return {
    imageName: '',
    imageSize: '',
    imageBase64: '',
    imageDataUrl: '',
    isImage: false,
    fileType: ''
  }
}

function createBase64ToImageState() {
  return {
    base64Input: '',
    base64ImageUrl: '',
    base64Error: ''
  }
}

function createHttpImageReceiverState() {
  const state = {
    serverRunning: false,
    host: '127.0.0.1',
    port: 17890,
    lastError: '',
    imageDataUrl: '',
    receivedAt: 0,
    payloadBytes: 0,
    mime: ''
  }
  if (latestHttpImagePayload) {
    Object.assign(state, latestHttpImagePayload)
  }
  return state
}

function createTextToQrState() {
  return {
    textInput: '',
    qrDataUrl: '',
    qrError: '',
    size: 240
  }
}

function createSshDraft(connection = null) {
  return {
    id: connection?.id || '',
    name: connection?.name || '',
    host: connection?.host || '',
    port: connection?.port ?? 22,
    username: connection?.username || '',
    privateKeyPath: connection?.privateKeyPath || '',
    password: connection?.password || '',
    remoteCommand: connection?.remoteCommand || '',
    note: connection?.note || '',
    createdAt: connection?.createdAt || '',
    updatedAt: connection?.updatedAt || '',
    lastConnectedAt: connection?.lastConnectedAt || ''
  }
}

function createSshConnectorState() {
  return {
    connections: [],
    loading: false,
    searchQuery: '',
    selectedConnectionId: '',
    draft: createSshDraft()
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
  processImageFile(tab, file)
}

function handlePasteImage(event, tab) {
  const clipboard = event.clipboardData
  if (!clipboard) return
  let file = null
  if (clipboard.files?.length) {
    file = clipboard.files[0]
  } else if (clipboard.items?.length) {
    for (const item of clipboard.items) {
      if (item.kind === 'file') {
        file = item.getAsFile()
        break
      }
    }
  }
  if (!file) {
    appStore.toast('剪贴板中没有文件（可粘贴图片/文件）', 'warning')
    return
  }
  event.preventDefault()
  processImageFile(tab, file)
}

function processImageFile(tab, file) {
  tab.state.imageName = file.name || 'file'
  tab.state.imageSize = formatFileSize(file.size)
  tab.state.fileType = file.type || '未知类型'
  tab.state.isImage = file.type.startsWith('image/')

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result || ''
    if (typeof dataUrl !== 'string') {
      appStore.toast('文件读取失败')
      return
    }
    tab.state.imageDataUrl = dataUrl
    tab.state.imageBase64 = stripDataUrl(dataUrl)
  }
  reader.onerror = () => {
    appStore.toast('文件读取失败')
  }
  reader.readAsDataURL(file)
}

function handleClearImageToBase64(tab) {
  tab.state.imageName = ''
  tab.state.imageSize = ''
  tab.state.imageBase64 = ''
  tab.state.imageDataUrl = ''
  tab.state.isImage = false
  tab.state.fileType = ''
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

function handleGenerateQr(tab) {
  const text = (tab.state.textInput || '').trim()
  if (!text) {
    tab.state.qrError = '请输入要生成的内容'
    appStore.toast('请输入要生成的内容', 'warning')
    return
  }
  const size = clampNumber(parseInt(tab.state.size, 10) || 240, 128, 1024)
  tab.state.size = size
  tab.state.qrDataUrl = buildQrImageUrl(text, size)
  tab.state.qrError = ''
}

function handleClearTextToQr(tab) {
  tab.state.textInput = ''
  tab.state.qrDataUrl = ''
  tab.state.qrError = ''
}

function handleQrPreviewError(tab) {
  tab.state.qrError = '二维码预览失败'
  appStore.toast('二维码预览失败', 'warning')
  tab.state.qrDataUrl = ''
}

function normalizeSshConnection(connection) {
  if (!connection) return null
  return {
    id: String(connection.id || ''),
    name: String(connection.name || '').trim(),
    host: String(connection.host || '').trim(),
    port: clampNumber(parseInt(connection.port, 10) || 22, 1, 65535),
    username: String(connection.username || '').trim(),
    privateKeyPath: String(connection.privateKeyPath || connection.private_key_path || '').trim(),
    password: connection.password === undefined || connection.password === null ? '' : String(connection.password),
    remoteCommand: String(connection.remoteCommand || connection.remote_command || '').trim(),
    note: String(connection.note || '').trim(),
    createdAt: connection.createdAt || connection.created_at || '',
    updatedAt: connection.updatedAt || connection.updated_at || '',
    lastConnectedAt: connection.lastConnectedAt || connection.last_connected_at || ''
  }
}

function sortSshConnections(connections) {
  return [...connections].sort((a, b) => {
    const aLast = a.lastConnectedAt ? new Date(a.lastConnectedAt).getTime() : 0
    const bLast = b.lastConnectedAt ? new Date(b.lastConnectedAt).getTime() : 0
    if (aLast !== bLast) return bLast - aLast

    const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    if (aUpdated !== bUpdated) return bUpdated - aUpdated

    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  })
}

function getFilteredSshConnections(tab) {
  const query = String(tab?.state?.searchQuery || '').trim().toLowerCase()
  const connections = tab?.state?.connections || []
  if (!query) return connections

  return connections.filter((connection) => {
    return [
      connection.name,
      connection.host,
      connection.username,
      connection.note
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query))
  })
}

function buildSshTarget(connection, withPlaceholder = false) {
  const host = String(connection?.host || '').trim()
  const username = String(connection?.username || '').trim()
  if (!host) {
    if (!withPlaceholder) return ''
    return username ? `${username}@example.com` : 'example.com'
  }
  return username ? `${username}@${host}` : host
}

function formatSshTarget(connection) {
  const target = buildSshTarget(connection)
  const port = clampNumber(parseInt(connection?.port, 10) || 22, 1, 65535)
  return port === 22 ? target : `${target}:${port}`
}

function quoteSshPreviewArg(arg) {
  const text = String(arg ?? '')
  if (!text) return '""'
  if (/[\s"'`$\\]/.test(text)) {
    return `"${text.replace(/(["\\$`])/g, '\\$1')}"`
  }
  return text
}

function buildSshCommandPreview(connection) {
  const normalized = normalizeSshConnection(connection || {})
  const args = ['ssh']

  if (normalized.port !== 22) {
    args.push('-p', String(normalized.port))
  }
  if (normalized.privateKeyPath) {
    args.push('-i', normalized.privateKeyPath)
  }
  if (normalized.remoteCommand) {
    args.push('-t')
  }

  args.push(buildSshTarget(normalized, true))

  if (normalized.remoteCommand) {
    args.push(normalized.remoteCommand)
  }

  return args.map(quoteSshPreviewArg).join(' ')
}

function selectSshConnection(tab, connectionId) {
  const connection = tab.state.connections.find(item => item.id === String(connectionId))
  if (!connection) return

  tab.state.selectedConnectionId = connection.id
  tab.state.draft = createSshDraft(connection)
}

function handleCreateSshConnection(tab) {
  tab.state.selectedConnectionId = ''
  tab.state.draft = createSshDraft()
}

function upsertSshConnection(tab, connection) {
  const normalized = normalizeSshConnection(connection)
  const index = tab.state.connections.findIndex(item => item.id === normalized.id)
  if (index === -1) {
    tab.state.connections.push(normalized)
  } else {
    tab.state.connections.splice(index, 1, normalized)
  }
  tab.state.connections = sortSshConnections(tab.state.connections)
  return normalized
}

function buildSshPayload(source, options = {}) {
  const normalized = normalizeSshConnection(source)
  if (options.requireName !== false && !normalized.name) {
    appStore.toast('请填写连接名称', 'warning')
    return null
  }
  if (!normalized.host) {
    appStore.toast('请填写主机地址', 'warning')
    return null
  }
  if (!normalized.port || normalized.port < 1 || normalized.port > 65535) {
    appStore.toast('端口必须在 1-65535 之间', 'warning')
    return null
  }
  return normalized
}

async function loadSshConnections(tab) {
  if (!electronAPI?.loadSshConnections) {
    appStore.toast('当前环境不支持 SSH 连接器', 'warning')
    return
  }

  tab.state.loading = true
  try {
    const result = await electronAPI.loadSshConnections()
    if (!result?.success) {
      throw new Error(result?.error || '加载 SSH 连接失败')
    }

    tab.state.connections = sortSshConnections((result.connections || []).map(normalizeSshConnection).filter(Boolean))
    if (tab.state.selectedConnectionId) {
      const selected = tab.state.connections.find(item => item.id === tab.state.selectedConnectionId)
      if (selected) {
        tab.state.draft = createSshDraft(selected)
      } else {
        handleCreateSshConnection(tab)
      }
    } else if (!tab.state.draft.name && !tab.state.draft.host && tab.state.connections[0]) {
      selectSshConnection(tab, tab.state.connections[0].id)
    }
  } catch (error) {
    console.error('加载 SSH 连接失败:', error)
    appStore.toast(error.message || '加载 SSH 连接失败', 'error')
  } finally {
    tab.state.loading = false
  }
}

async function handleSaveSshConnection(tab) {
  if (!electronAPI?.addSshConnection || !electronAPI?.updateSshConnection) {
    appStore.toast('当前环境不支持保存 SSH 连接', 'warning')
    return null
  }

  const payload = buildSshPayload(tab.state.draft)
  if (!payload) return null

  const now = new Date().toISOString()
  if (tab.state.selectedConnectionId) {
    const existing = tab.state.connections.find(item => item.id === tab.state.selectedConnectionId)
    const savedConnection = {
      ...(existing || {}),
      ...payload,
      id: tab.state.selectedConnectionId,
      createdAt: existing?.createdAt || payload.createdAt || now,
      updatedAt: now,
      lastConnectedAt: existing?.lastConnectedAt || payload.lastConnectedAt || ''
    }

    const result = await electronAPI.updateSshConnection(savedConnection.id, savedConnection)
    if (!result?.success) {
      appStore.toast(result?.error || '保存失败', 'error')
      return null
    }

    const normalized = upsertSshConnection(tab, savedConnection)
    tab.state.selectedConnectionId = normalized.id
    tab.state.draft = createSshDraft(normalized)
    appStore.toast('SSH 连接已更新', 'success')
    return normalized
  }

  const newConnection = {
    ...payload,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    lastConnectedAt: ''
  }

  const result = await electronAPI.addSshConnection(newConnection)
  if (!result?.success) {
    appStore.toast(result?.error || '保存失败', 'error')
    return null
  }

  const normalized = upsertSshConnection(tab, newConnection)
  tab.state.selectedConnectionId = normalized.id
  tab.state.draft = createSshDraft(normalized)
  appStore.toast('SSH 连接已保存', 'success')
  return normalized
}

async function handleSaveAndConnectSsh(tab) {
  const savedConnection = await handleSaveSshConnection(tab)
  if (!savedConnection) return
  await handleConnectSsh(tab, savedConnection)
}

async function handleDeleteSshConnection(tab) {
  if (!electronAPI?.deleteSshConnection) {
    appStore.toast('当前环境不支持删除 SSH 连接', 'warning')
    return
  }

  const connectionId = tab.state.selectedConnectionId
  if (!connectionId) {
    appStore.toast('请先选择要删除的连接', 'warning')
    return
  }

  const connection = tab.state.connections.find(item => item.id === connectionId)
  if (!connection) return

  const confirmed = await appStore.confirm(`确定删除 SSH 连接“${connection.name}”吗？`)
  if (!confirmed) return

  const result = await electronAPI.deleteSshConnection(connectionId)
  if (!result?.success) {
    appStore.toast(result?.error || '删除失败', 'error')
    return
  }

  tab.state.connections = tab.state.connections.filter(item => item.id !== connectionId)
  const nextConnection = tab.state.connections[0] || null
  if (nextConnection) {
    selectSshConnection(tab, nextConnection.id)
  } else {
    handleCreateSshConnection(tab)
  }
  appStore.toast('SSH 连接已删除', 'success')
}

async function handlePickSshPrivateKey(tab) {
  if (!electronAPI?.selectSshPrivateKey) {
    appStore.toast('当前环境不支持选择私钥文件', 'warning')
    return
  }

  const result = await electronAPI.selectSshPrivateKey()
  if (result?.success && result.path) {
    tab.state.draft.privateKeyPath = result.path
  }
}

async function handleConnectSsh(tab, connection) {
  if (!electronAPI?.connectSsh) {
    appStore.toast('当前环境不支持 SSH 连接', 'warning')
    return
  }

  const payload = buildSshPayload(connection, { requireName: false })
  if (!payload) return

  const result = await electronAPI.connectSsh(payload)
  if (!result?.success) {
    appStore.toast(result?.error || 'SSH 启动失败', 'error')
    return
  }

  if (payload.id && result.lastConnectedAt) {
    const existing = tab.state.connections.find(item => item.id === payload.id)
    if (existing) {
      const updated = upsertSshConnection(tab, {
        ...existing,
        lastConnectedAt: result.lastConnectedAt,
        updatedAt: result.lastConnectedAt
      })
      if (tab.state.selectedConnectionId === updated.id) {
        tab.state.draft = createSshDraft(updated)
      }
    }
  }

  appStore.toast('SSH 会话已在系统终端中打开', 'success')
}

async function handleCopySshCommand(connection) {
  if (!String(connection?.host || '').trim()) {
    appStore.toast('请先填写主机地址', 'warning')
    return
  }
  await handleCopy(buildSshCommandPreview(connection), '已复制 SSH 命令')
}

function formatSshTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

async function handleStartHttpServer(tab) {
  if (!electronAPI?.startToolboxHttp) {
    appStore.toast('当前环境不支持启动服务', 'warning')
    return
  }
  const result = await electronAPI.startToolboxHttp()
  if (result?.success) {
    applyToolboxHttpStatus(result)
    appStore.toast('HTTP 服务已启动', 'success')
  } else {
    appStore.toast(result?.lastError || '启动失败', 'error')
  }
}

async function handleStopHttpServer(tab) {
  if (!electronAPI?.stopToolboxHttp) {
    appStore.toast('当前环境不支持停止服务', 'warning')
    return
  }
  const result = await electronAPI.stopToolboxHttp()
  if (result?.success) {
    applyToolboxHttpStatus(result)
    appStore.toast('HTTP 服务已停止', 'success')
  } else {
    appStore.toast(result?.lastError || '停止失败', 'error')
  }
}

function handleClearHttpImage(tab) {
  tab.state.imageDataUrl = ''
  tab.state.receivedAt = 0
  tab.state.payloadBytes = 0
  tab.state.mime = ''
}

function handleHttpImagePreviewError(tab) {
  appStore.toast('图片预览失败', 'warning')
  tab.state.imageDataUrl = ''
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

function handleDownloadQr(tab) {
  if (!tab.state.qrDataUrl) {
    appStore.toast('没有可下载的二维码', 'warning')
    return
  }
  const link = document.createElement('a')
  link.href = tab.state.qrDataUrl
  link.download = `qrcode-${Date.now()}.png`
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

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

function buildQrImageUrl(text, size) {
  const encoded = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

function buildHttpExample(host, port) {
  const resolvedHost = host === '0.0.0.0' ? '<本机IP>' : host || '127.0.0.1'
  return [
    `POST http://${resolvedHost}:${port}/set_image`,
    'Content-Type: application/json',
    '',
    '{"dataUrl":"data:image/png;base64,..."}',
    '// 或 {"base64":"...","mime":"image/png"}'
  ].join('\n')
}

function formatReceivedAt(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function applyToolboxHttpStatus(status) {
  tabs.value.forEach((tab) => {
    if (tab.type !== 'http-image-receiver') return
    tab.state.serverRunning = !!status.running
    tab.state.host = status.host || tab.state.host
    tab.state.port = status.port || tab.state.port
    tab.state.lastError = status.lastError || ''
  })
}

function formatListenAddress(state) {
  const host = state?.host || '127.0.0.1'
  const displayHost = host === '0.0.0.0' ? '0.0.0.0 (局域网可用)' : host
  return `${displayHost}:${state?.port || 17890}`
}

function applyToolboxImagePayload(payload) {
  if (!payload?.dataUrl) return
  const normalized = {
    imageDataUrl: payload.dataUrl,
    receivedAt: payload.receivedAt || Date.now(),
    payloadBytes: payload.payloadBytes || 0,
    mime: payload.mime || ''
  }
  latestHttpImagePayload = normalized
  tabs.value.forEach((tab) => {
    if (tab.type !== 'http-image-receiver') return
    Object.assign(tab.state, normalized)
  })
}

async function initToolboxHttpStatus() {
  if (!electronAPI?.getToolboxHttpStatus) return
  const result = await electronAPI.getToolboxHttpStatus()
  if (result?.success) {
    applyToolboxHttpStatus(result)
  }
}

onMounted(() => {
  initToolboxHttpStatus()
  electronAPI?.onToolboxHttpStatus?.((status) => {
    applyToolboxHttpStatus(status)
  })
  electronAPI?.onToolboxImageReceived?.((payload) => {
    applyToolboxImagePayload(payload)
  })
})
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

.toolbox-content-standalone {
  padding: 22px 24px 26px;
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

.tool-preview-empty {
  min-height: 160px;
  color: var(--text-secondary);
  font-size: 13px;
}

.tool-preview img {
  max-width: 100%;
  max-height: 220px;
  border-radius: 10px;
  object-fit: contain;
}

.tool-file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  width: 100%;
}

.file-info-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(108, 92, 231, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-info-icon svg {
  width: 24px;
  height: 24px;
  color: #5f6be4;
}

.file-info-details {
  flex: 1;
  min-width: 0;
}

.file-info-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  word-break: break-all;
}

.file-info-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.tool-output label,
.tool-input label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  display: block;
}

.tool-form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 10px;
}

.tool-form-row input {
  width: 96px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
}

.tool-inline-label {
  font-weight: 600;
  color: var(--text-primary);
}

.tool-inline-hint {
  color: var(--text-secondary);
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

.tool-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8f9ff;
  border: 1px dashed rgba(108, 92, 231, 0.2);
}

.tool-status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
}

.tool-status-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.tool-status-value {
  color: var(--text-primary);
  font-weight: 600;
}

.tool-status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  color: var(--text-secondary);
  font-weight: 600;
}

.tool-status-pill.running {
  background: rgba(34, 197, 94, 0.16);
  color: #16a34a;
}

.tool-status-error {
  font-size: 12px;
  color: var(--danger-color);
  font-weight: 600;
}

.tool-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.ssh-tool-body {
  gap: 18px;
}

.ssh-security-note {
  padding: 12px 14px;
  border-radius: 12px;
  background: #f5f9ff;
  border: 1px solid #d7e5ff;
  color: #4a5f86;
  font-size: 12px;
  line-height: 1.6;
}

.ssh-tool-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.ssh-saved-list,
.ssh-editor-panel {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.ssh-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8ff 100%);
}

.ssh-panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.ssh-panel-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.ssh-search-box {
  padding: 14px 16px 0;
}

.ssh-search-box input,
.ssh-field input,
.ssh-field textarea,
.ssh-command-preview textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.6;
  box-sizing: border-box;
  resize: vertical;
}

.ssh-search-box input,
.ssh-field input {
  font-family: inherit;
  resize: none;
}

.ssh-field textarea,
.ssh-command-preview textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.ssh-search-box input:focus,
.ssh-field input:focus,
.ssh-field textarea:focus,
.ssh-command-preview textarea:focus {
  outline: none;
  border-color: #8aa8ff;
  box-shadow: 0 0 0 3px rgba(112, 144, 255, 0.12);
}

.ssh-empty-state {
  padding: 28px 16px 24px;
  color: var(--text-secondary);
  font-size: 13px;
}

.ssh-connection-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
  max-height: 560px;
  overflow-y: auto;
}

.ssh-connection-card {
  width: 100%;
  text-align: left;
  border: 1px solid #dce6f4;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ssh-connection-card:hover {
  border-color: #94b4ff;
  box-shadow: 0 10px 20px rgba(41, 84, 153, 0.08);
}

.ssh-connection-card:focus-visible {
  outline: none;
  border-color: #5f84ff;
  box-shadow: 0 0 0 3px rgba(95, 132, 255, 0.18);
}

.ssh-connection-card.active {
  border-color: #5f84ff;
  background: linear-gradient(180deg, #eef4ff 0%, #f7fbff 100%);
  box-shadow: 0 10px 24px rgba(95, 132, 255, 0.14);
}

.ssh-connection-card-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ssh-connection-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.ssh-connection-target {
  font-size: 12px;
  color: #436088;
  word-break: break-all;
}

.ssh-connection-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.ssh-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #396090;
  background: #eaf2ff;
}

.ssh-badge.subtle {
  color: #5d6e85;
  background: #eef2f7;
}

.ssh-connection-meta {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.ssh-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.ssh-mini-btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ssh-mini-btn:hover {
  border-color: #7c9bff;
  color: var(--text-primary);
}

.ssh-mini-btn.primary {
  background: #5f84ff;
  border-color: #5f84ff;
  color: #ffffff;
}

.ssh-editor-panel {
  padding-bottom: 16px;
}

.ssh-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 16px 16px 0;
}

.ssh-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 16px;
  margin-top: 14px;
}

.ssh-field span,
.ssh-command-preview label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.ssh-inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}

.ssh-command-preview {
  padding: 16px 16px 0;
}

.ssh-form-actions {
  padding: 16px 16px 0;
  margin-top: 0;
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

  .ssh-tool-layout {
    grid-template-columns: 1fr;
  }

  .ssh-form-grid {
    grid-template-columns: 1fr;
  }

  .ssh-inline-field {
    grid-template-columns: 1fr;
  }
}
</style>
