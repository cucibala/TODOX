<template>
  <div class="ssh-page" :data-theme="themeMode">
    <header class="ssh-header">
      <div>
        <h1>SSH</h1>
        <p>左侧管理连接，右侧切换终端。</p>
      </div>

      <div class="ssh-header-actions">
        <button class="ssh-btn" @click="toggleTheme">{{ themeMode === 'dark' ? '浅色' : '深色' }}</button>
        <button class="ssh-btn" @click="loadConnections">刷新</button>
        <button class="ssh-btn" @click="createCmdTab">新建 CMD</button>
        <button class="ssh-btn primary" @click="handleCreateConnection">新建连接</button>
      </div>
    </header>

    <section class="ssh-layout">
      <aside class="ssh-sidebar">
        <div class="ssh-sidebar-top">
          <input
            v-model="searchQuery"
            class="ssh-search-input"
            type="text"
            placeholder="搜索名称、主机、用户名"
          />
        </div>

        <section class="ssh-sidebar-panel top-panel">
          <div class="sidebar-panel-title">分组</div>
          <div class="ssh-inline-field group-create-row">
            <input v-model="newGroupName" type="text" placeholder="新建分组，例如：生产" />
            <button class="ssh-btn mini" @click="createGroup">新增分组</button>
          </div>
        </section>

        <div class="ssh-list-shell">
          <div v-if="loading" class="ssh-list-empty">正在加载连接...</div>
          <div v-else-if="filteredConnections.length === 0 && filteredCmdBookmarks.length === 0" class="ssh-list-empty">还没有保存连接。</div>

          <div v-else class="ssh-group-list">
            <div
              v-for="group in groupedConnections"
              :key="group.key"
              class="ssh-group-section"
            >
              <template v-if="editingGroupId !== null && editingGroupId === String(group.id)">
                <div
                  class="ssh-group-header editing"
                  :class="{
                    'ungrouped-group': group.key === '__ungrouped__',
                    'cmd-group': group.itemType === 'cmd'
                  }"
                >
                  <span class="ssh-group-arrow">✎</span>
                  <input
                    v-model="editingGroupName"
                    class="ssh-group-input"
                    type="text"
                    maxlength="30"
                    @keyup.enter="saveGroupRename"
                    @keyup.esc="cancelGroupRename"
                  />
                  <button class="ssh-btn mini" @click.stop="saveGroupRename">保存</button>
                  <button class="ssh-btn mini" @click.stop="cancelGroupRename">取消</button>
                </div>
              </template>
              <template v-else>
                <div
                  class="ssh-group-header"
                  :class="{
                    'ungrouped-group': group.key === '__ungrouped__',
                    'cmd-group': group.itemType === 'cmd'
                  }"
                  :draggable="!group.locked"
                  @click="toggleGroup(group.key)"
                  @dragstart="!group.locked && handleGroupDragStart(group.id)"
                  @dragover.prevent="true"
                  @drop.prevent="handleGroupHeaderDrop(group)"
                >
                  <span class="ssh-group-arrow">{{ collapsedGroups[group.key] ? '▸' : '▾' }}</span>
                  <span class="ssh-group-name">{{ group.name }}</span>
                  <span class="ssh-group-count">{{ group.items.length }}</span>
                  <button
                    v-if="!group.locked"
                    class="ssh-group-rename"
                    @click.stop="startGroupRename(group)"
                  >
                    重命名
                  </button>
                  <button
                    v-if="!group.locked"
                    class="ssh-group-delete"
                    @click.stop="deleteGroup(group.id)"
                  >
                    ×
                  </button>
                </div>
              </template>

              <div
                v-if="!collapsedGroups[group.key]"
                class="ssh-connection-list compact"
                @dragover.prevent
                @drop.prevent="handleSectionDrop(group)"
              >
                <div
                  v-for="connection in group.items"
                  :key="connection.id"
                  class="ssh-connection-item compact"
                  :class="{ active: group.itemType === 'ssh' && selectedConnectionId === connection.id }"
                  :draggable="true"
                  tabindex="0"
                  @click="group.itemType === 'ssh' ? selectConnection(connection.id) : null"
                  @dblclick="group.itemType === 'ssh' ? openConnectionEditor(connection) : openCmdBookmark(connection)"
                  @keydown.enter.prevent="group.itemType === 'ssh' ? selectConnection(connection.id) : null"
                  @keydown.space.prevent="group.itemType === 'ssh' ? selectConnection(connection.id) : null"
                  @dragstart="handleItemDragStart(group.itemType, connection.id, group.key)"
                  @dragover.prevent
                  @drop.prevent="handleItemDrop(group, connection.id)"
                >
                  <div class="ssh-connection-line">
                    <span class="ssh-connection-name compact">{{ connection.name }}</span>
                    <span class="ssh-connection-target compact">{{ group.itemType === 'ssh' ? formatTarget(connection) : connection.path }}</span>
                    <button
                      class="ssh-btn mini primary compact"
                      @click.stop="group.itemType === 'ssh' ? connectEmbeddedSession(connection) : openCmdBookmark(connection)"
                    >
                      连接
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="ssh-sidebar-panel">
          <div class="sidebar-panel-title">连接操作</div>

          <div class="ssh-editor-actions">
            <button class="ssh-btn" :disabled="!selectedConnection" @click="openConnectionEditor(selectedConnection)">编辑连接</button>
            <button class="ssh-btn" :disabled="!selectedConnection" @click="handleCopyCommand(selectedConnection)">复制命令</button>
            <button class="ssh-btn danger" :disabled="!selectedConnectionId" @click="handleDeleteConnection">删除</button>
          </div>
        </section>
      </aside>

      <main class="ssh-workspace">
        <div class="ssh-tabs-bar">
          <div class="ssh-tabs">
            <div v-if="sessionTabs.length === 0" class="ssh-tabs-empty">暂无终端会话</div>

            <button
              v-for="tab in sessionTabs"
              :key="tab.sessionId"
              class="ssh-tab"
              :class="{ active: activeSessionId === tab.sessionId }"
              @click="setActiveSession(tab.sessionId)"
            >
              <span
                class="ssh-tab-indicator"
                :data-connected="tab.status === 'connected' ? 'true' : 'false'"
                :title="tab.statusLabel"
              ></span>
              <span class="ssh-tab-title">{{ tab.title }}</span>
              <span class="ssh-tab-close" @click.stop="closeSessionTab(tab.sessionId)">×</span>
            </button>
          </div>

          <div class="ssh-terminal-actions">
            <button
              v-if="activeSession?.type === 'cmd'"
              class="ssh-btn mini"
              @click="saveCurrentCmdSession"
            >
              保存 CMD
            </button>
            <button class="ssh-btn mini" :disabled="!activeSessionId" @click="focusActiveTerminal">聚焦</button>
            <button class="ssh-btn mini" :disabled="!activeSessionId" @click="copyActiveTerminal">复制</button>
            <button class="ssh-btn mini" :disabled="!activeSessionId" @click="pasteActiveTerminal">粘贴</button>
            <button class="ssh-btn mini" :disabled="!activeSessionId" @click="sendControlC">Ctrl+C</button>
            <button class="ssh-btn mini" :disabled="!activeSessionId" @click="clearActiveTerminal">清空</button>
            <button class="ssh-btn mini danger" :disabled="!activeSessionId" @click="disconnectActiveSession">断开</button>
          </div>
        </div>

        <div ref="terminalStageRef" class="ssh-terminal-stage">
          <div v-if="sessionTabs.length === 0" class="ssh-terminal-empty">
            <div class="ssh-terminal-empty-title">没有正在运行的终端</div>
            <div class="ssh-terminal-empty-text">从左侧选择连接后点击“连接”即可打开一个终端 tab。</div>
          </div>

          <div
            v-for="tab in sessionTabs"
            v-show="activeSessionId === tab.sessionId"
            :key="`${tab.sessionId}-pane`"
            class="ssh-terminal-pane"
          >
            <div :ref="(el) => setTerminalHostRef(tab.sessionId, el)" class="ssh-terminal-host"></div>
          </div>
        </div>

        <div class="ssh-status-bar">
          <span>{{ activeSessionStatusText }}</span>
          <span v-if="activeSession">{{ activeSession.target }}</span>
        </div>
      </main>
    </section>

    <div v-if="showSaveCmdDialog" class="ssh-dialog-overlay" @click.self="closeSaveCmdDialog">
      <div class="ssh-dialog small">
        <div class="ssh-dialog-head">
          <div>
            <div class="editor-title">保存 CMD</div>
            <div class="editor-target">{{ cmdBookmarkDraft.path }}</div>
          </div>
          <button class="ssh-dialog-close" @click="closeSaveCmdDialog">×</button>
        </div>

        <label class="ssh-field">
          <span>CMD 名称</span>
          <input v-model="cmdBookmarkDraft.name" type="text" placeholder="例如：工作目录" />
        </label>

        <label class="ssh-field">
          <span>CMD 路径</span>
          <input v-model="cmdBookmarkDraft.path" type="text" placeholder="例如：C:\Users\Administrator" />
        </label>

        <div class="ssh-editor-actions">
          <button class="ssh-btn primary" @click="saveCmdBookmark">保存</button>
          <button class="ssh-btn" @click="closeSaveCmdDialog">取消</button>
        </div>
      </div>
    </div>

    <div v-if="showEditorDialog" class="ssh-dialog-overlay" @click.self="closeConnectionEditor">
      <div class="ssh-dialog">
        <div class="ssh-dialog-head">
          <div>
            <div class="editor-title">{{ editingConnectionId ? '编辑连接' : '新建连接' }}</div>
            <div class="editor-target">{{ formatTarget(editorDraft, true) }}</div>
          </div>
          <button class="ssh-dialog-close" @click="closeConnectionEditor">×</button>
        </div>

        <div class="ssh-form-grid">
          <label class="ssh-field">
            <span>名称</span>
            <input v-model="editorDraft.name" type="text" placeholder="例如：生产/应用01 或 生产 - 应用01" />
          </label>

          <label class="ssh-field">
            <span>所属分组</span>
            <select v-model="editorDraft.groupId" class="ssh-select">
              <option value="">未分组</option>
              <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
            </select>
          </label>

          <label class="ssh-field">
            <span>主机</span>
            <input v-model="editorDraft.host" type="text" placeholder="10.0.0.8 / host.example.com" />
          </label>

          <label class="ssh-field">
            <span>用户</span>
            <input v-model="editorDraft.username" type="text" placeholder="为空时使用系统用户名" />
          </label>

          <label class="ssh-field">
            <span>端口</span>
            <input v-model.number="editorDraft.port" type="number" min="1" max="65535" placeholder="22" />
          </label>
        </div>

        <label class="ssh-field">
          <span>私钥路径</span>
          <div class="ssh-inline-field">
            <input v-model="editorDraft.privateKeyPath" type="text" placeholder="C:\Users\me\.ssh\id_ed25519" />
            <button class="ssh-btn mini" @click="handlePickPrivateKey">选择</button>
          </div>
        </label>

        <div class="ssh-form-grid auth-grid">
          <label class="ssh-field">
            <span>代理类型</span>
            <select v-model="editorDraft.proxyType" class="ssh-select">
              <option value="none">不使用代理</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </label>

          <label v-if="editorDraft.proxyType === 'socks5'" class="ssh-field">
            <span>代理主机</span>
            <input v-model="editorDraft.proxyHost" type="text" placeholder="例如：127.0.0.1" />
          </label>

          <label v-if="editorDraft.proxyType === 'socks5'" class="ssh-field">
            <span>代理端口</span>
            <input v-model.number="editorDraft.proxyPort" type="number" min="1" max="65535" placeholder="1080" />
          </label>

          <label v-if="editorDraft.proxyType === 'socks5'" class="ssh-field">
            <span>代理用户名</span>
            <input v-model="editorDraft.proxyUsername" type="text" placeholder="没有可留空" />
          </label>
        </div>

        <label class="ssh-field">
          <span>登录后命令</span>
          <textarea v-model="editorDraft.remoteCommand" rows="2" placeholder="例如：tmux attach || tmux"></textarea>
        </label>

        <label class="ssh-field">
          <span>备注</span>
          <textarea v-model="editorDraft.note" rows="2" placeholder="例如：线上环境，只读排查"></textarea>
        </label>

        <div class="ssh-editor-actions">
          <button class="ssh-btn primary" @click="handleSaveConnection">保存</button>
          <button class="ssh-btn" @click="handleSaveAndConnect">保存并连接</button>
          <button class="ssh-btn" @click="closeConnectionEditor">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import '@xterm/xterm/css/xterm.css'

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useAppStore } from '../stores/app'
import { generateId } from '../utils/tools'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const connections = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedConnectionId = ref('')
const draft = ref(createDraft())
const themeMode = ref(localStorage.getItem('ssh-theme-mode') || 'dark')
const groups = ref([])
const connectionGroupMap = ref({})
const connectionOrderMap = ref({})
const collapsedGroups = ref({})
const newGroupName = ref('')
const draggingGroupId = ref('')
const draggingItem = ref(null)
const editingGroupId = ref(null)
const editingGroupName = ref('')
const cmdBookmarks = ref([])
const showEditorDialog = ref(false)
const editingConnectionId = ref('')
const editorDraft = ref(createDraft())
const showSaveCmdDialog = ref(false)
const cmdBookmarkDraft = ref({
  id: '',
  name: '',
  path: ''
})

const sessionTabs = ref([])
const activeSessionId = ref('')
const terminalStageRef = ref(null)

const terminalControllers = new Map()
const terminalHostRefs = new Map()
const pendingSessionEvents = new Map()
const ignoredSessionIds = new Set()
let resizeObserver = null
let sshSessionEventBound = false

const filteredConnections = computed(() => {
  const query = String(searchQuery.value || '').trim().toLowerCase()
  if (!query) return connections.value

  return connections.value.filter((connection) => {
    return [connection.name, connection.host, connection.username, connection.note]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query))
  })
})

const filteredCmdBookmarks = computed(() => {
  const query = String(searchQuery.value || '').trim().toLowerCase()
  if (!query) return cmdBookmarks.value

  return cmdBookmarks.value.filter((item) => {
    return [item.name, item.path]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query))
  })
})

const groupedConnections = computed(() => {
  const groupMap = new Map()
  const availableGroups = [...groups.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  availableGroups.forEach((group) => {
    groupMap.set(group.id, {
      key: group.id,
      id: group.id,
      name: group.name,
      items: []
    })
  })

  const orderedConnections = [...filteredConnections.value].sort((a, b) => {
    const aOrder = Number.isFinite(connectionOrderMap.value[a.id]) ? connectionOrderMap.value[a.id] : Number.MAX_SAFE_INTEGER
    const bOrder = Number.isFinite(connectionOrderMap.value[b.id]) ? connectionOrderMap.value[b.id] : Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) return aOrder - bOrder
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  })

  const ungroupedItems = []
  orderedConnections.forEach((connection) => {
    const groupId = connectionGroupMap.value[connection.id] || ''
    if (groupId && groupMap.has(groupId)) {
      groupMap.get(groupId).items.push(connection)
    } else {
      ungroupedItems.push(connection)
    }
  })

  const sections = Array.from(groupMap.values())
  if (ungroupedItems.length > 0 || sections.length === 0) {
    sections.push({
      key: '__ungrouped__',
      id: '',
      name: '未分组',
      locked: true,
      itemType: 'ssh',
      items: ungroupedItems
    })
  }

  sections.forEach((section) => {
    if (!section.itemType) {
      section.itemType = 'ssh'
    }
  })

  sections.push({
    key: '__cmd__',
    id: '__cmd__',
    name: 'CMD',
    locked: true,
    itemType: 'cmd',
    items: [...filteredCmdBookmarks.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  })

  return sections
})

const activeSession = computed(() => {
  return sessionTabs.value.find(item => item.sessionId === activeSessionId.value) || null
})

const selectedConnection = computed(() => {
  return connections.value.find(item => item.id === selectedConnectionId.value) || null
})

const activeSessionStatusText = computed(() => {
  if (!activeSession.value) return '未连接'
  return activeSession.value.message || activeSession.value.statusLabel
})

function createDraft(connection = null) {
  return {
    id: connection?.id || '',
    name: connection?.name || '',
    groupId: connection?.groupId || '',
    host: connection?.host || '',
    port: connection?.port ?? 22,
    username: connection?.username || '',
    proxyType: connection?.proxyType || 'none',
    proxyHost: connection?.proxyHost || '',
    proxyPort: connection?.proxyPort ?? 1080,
    proxyUsername: connection?.proxyUsername || '',
    privateKeyPath: connection?.privateKeyPath || '',
    remoteCommand: connection?.remoteCommand || '',
    note: connection?.note || '',
    createdAt: connection?.createdAt || '',
    updatedAt: connection?.updatedAt || '',
    lastConnectedAt: connection?.lastConnectedAt || ''
  }
}

function normalizeConnection(connection) {
  if (!connection) return null
  return {
    id: String(connection.id || ''),
    name: String(connection.name || '').trim(),
    host: String(connection.host || '').trim(),
    port: clampNumber(parseInt(connection.port, 10) || 22, 1, 65535),
    username: String(connection.username || '').trim(),
    proxyType: String(connection.proxyType || connection.proxy_type || 'none').trim() || 'none',
    proxyHost: String(connection.proxyHost || connection.proxy_host || '').trim(),
    proxyPort: clampNumber(parseInt(connection.proxyPort ?? connection.proxy_port, 10) || 1080, 1, 65535),
    proxyUsername: String(connection.proxyUsername || connection.proxy_username || '').trim(),
    privateKeyPath: String(connection.privateKeyPath || connection.private_key_path || '').trim(),
    remoteCommand: String(connection.remoteCommand || connection.remote_command || '').trim(),
    note: String(connection.note || '').trim(),
    createdAt: connection.createdAt || connection.created_at || '',
    updatedAt: connection.updatedAt || connection.updated_at || '',
    lastConnectedAt: connection.lastConnectedAt || connection.last_connected_at || ''
  }
}

function sortConnections(list) {
  return [...list].sort((a, b) => {
    const aLast = a.lastConnectedAt ? new Date(a.lastConnectedAt).getTime() : 0
    const bLast = b.lastConnectedAt ? new Date(b.lastConnectedAt).getTime() : 0
    if (aLast !== bLast) return bLast - aLast

    const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    if (aUpdated !== bUpdated) return bUpdated - aUpdated

    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  })
}

function formatTarget(connection, withPlaceholder = false) {
  const host = String(connection?.host || '').trim()
  const username = String(connection?.username || '').trim()
  const port = clampNumber(parseInt(connection?.port, 10) || 22, 1, 65535)

  if (!host) {
    if (!withPlaceholder) return ''
    return username ? `${username}@example.com` : 'example.com'
  }

  const target = username ? `${username}@${host}` : host
  return port === 22 ? target : `${target}:${port}`
}

function quoteArg(value) {
  const text = String(value ?? '')
  if (!text) return '""'
  if (/[\s"'`$\\]/.test(text)) {
    return `"${text.replace(/(["\\$`])/g, '\\$1')}"`
  }
  return text
}

function buildCommandPreview(connection) {
  const normalized = normalizeConnection(connection || {})
  const args = ['ssh']

  if (normalized.port !== 22) args.push('-p', String(normalized.port))
  if (normalized.privateKeyPath) args.push('-i', normalized.privateKeyPath)
  if (normalized.remoteCommand) args.push('-t')

  args.push(formatTarget(normalized, true))
  if (normalized.remoteCommand) args.push(normalized.remoteCommand)

  return args.map(quoteArg).join(' ')
}

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function buildSavePayload(source, options = {}) {
  const normalized = normalizeConnection(source)
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
  if (normalized.proxyType !== 'none' && normalized.proxyType !== 'socks5') {
    appStore.toast('当前仅支持 SOCKS5 代理', 'warning')
    return null
  }
  if (normalized.proxyType === 'socks5') {
    if (!normalized.proxyHost) {
      appStore.toast('请填写代理主机', 'warning')
      return null
    }
    if (!normalized.proxyPort || normalized.proxyPort < 1 || normalized.proxyPort > 65535) {
      appStore.toast('代理端口必须在 1-65535 之间', 'warning')
      return null
    }
  }
  return normalized
}

function buildSessionPayload(source) {
  const payload = buildSavePayload(source, { requireName: false })
  if (!payload) return null
  return payload
}

function toPlainData(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPasteShortcut(event) {
  const key = String(event?.key || '').toLowerCase()
  return (
    (((event?.ctrlKey || event?.metaKey) && !event?.altKey && key === 'v')) ||
    (!event?.ctrlKey && !event?.metaKey && !event?.altKey && event?.shiftKey && key === 'insert')
  )
}

function isCopyShortcut(event) {
  const key = String(event?.key || '').toLowerCase()
  const isMac = /mac|iphone|ipad|ipod/i.test(String(navigator?.platform || '').toLowerCase())
  if (isMac) {
    return (
      (event?.metaKey && !event?.ctrlKey && !event?.altKey && !event?.shiftKey && key === 'c') ||
      (event?.metaKey && !event?.ctrlKey && !event?.altKey && event?.shiftKey && key === 'c')
    )
  }

  return (
    (event?.ctrlKey && !event?.metaKey && !event?.altKey && !event?.shiftKey && key === 'c') ||
    (event?.ctrlKey && !event?.metaKey && !event?.altKey && event?.shiftKey && key === 'c') ||
    (event?.ctrlKey && !event?.metaKey && !event?.altKey && !event?.shiftKey && key === 'insert')
  )
}

async function readClipboardText() {
  if (typeof electronAPI?.readClipboardText === 'function') {
    try {
      return String(await electronAPI.readClipboardText() || '')
    } catch (error) {}
  }

  if (navigator?.clipboard?.readText) {
    return String(await navigator.clipboard.readText())
  }

  throw new Error('当前环境不支持读取剪贴板')
}

async function writeClipboardText(text = '') {
  const normalizedText = String(text || '')
  if (!normalizedText) return false

  if (typeof electronAPI?.writeClipboardText === 'function') {
    try {
      const result = await electronAPI.writeClipboardText(normalizedText)
      if (result?.success) {
        return true
      }
    } catch (error) {}
  }

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalizedText)
    return true
  }

  throw new Error('当前环境不支持写入剪贴板')
}

async function writeSessionInput(sessionId, data, options = {}) {
  const normalizedSessionId = String(sessionId || '').trim()
  const normalizedData = String(data || '')
  if (!normalizedSessionId || !normalizedData) {
    return false
  }

  if (!electronAPI?.writeSshSession) {
    if (options.showError !== false) {
      appStore.toast('当前环境不支持终端输入', 'warning')
    }
    return false
  }

  const result = await electronAPI.writeSshSession(normalizedSessionId, normalizedData)
  if (!result?.success) {
    if (options.showError !== false) {
      appStore.toast(result?.error || '写入终端失败', 'error')
    }
    return false
  }

  return true
}

async function pasteTextToSession(sessionId, text = '') {
  let content = String(text || '')

  if (!content) {
    try {
      content = await readClipboardText()
    } catch (error) {
      appStore.toast(error?.message || '读取剪贴板失败', 'error')
      return false
    }
  }

  if (!content) return false

  const success = await writeSessionInput(sessionId, content)
  if (success && activeSessionId.value === sessionId) {
    focusActiveTerminal()
  }
  return success
}

async function pasteActiveTerminal() {
  if (!activeSessionId.value) return
  await pasteTextToSession(activeSessionId.value)
}

async function copyTerminalSelection(sessionId, options = {}) {
  const controller = terminalControllers.get(String(sessionId || ''))
  const text = String(controller?.terminal?.getSelection?.() || '')
  if (!text) {
    if (options.showWarning !== false) {
      appStore.toast('请先在终端中选中文本', 'warning')
    }
    return false
  }

  try {
    await writeClipboardText(text)
    if (options.showToast !== false) {
      appStore.toast('终端内容已复制', 'success')
    }
    return true
  } catch (error) {
    appStore.toast(error?.message || '复制失败', 'error')
    return false
  }
}

async function copyActiveTerminal() {
  if (!activeSessionId.value) return
  await copyTerminalSelection(activeSessionId.value)
}

function getStatusLabel(status) {
  if (status === 'connected') return '已连接'
  if (status === 'connecting') return '连接中'
  if (status === 'error') return '失败'
  if (status === 'closed') return '已断开'
  return '空闲'
}

function toggleTheme() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('ssh-theme-mode', themeMode.value)
}

function toggleGroup(groupKey) {
  collapsedGroups.value = {
    ...collapsedGroups.value,
    [groupKey]: !collapsedGroups.value[groupKey]
  }
}

async function loadGroupSettings() {
  if (!electronAPI?.loadSshGroupSettings) return

  const result = await electronAPI.loadSshGroupSettings()
  if (!result?.success) return

  groups.value = Array.isArray(result.groups) ? result.groups : []
  connectionGroupMap.value = result.connectionGroupMap && typeof result.connectionGroupMap === 'object'
    ? result.connectionGroupMap
    : {}
  connectionOrderMap.value = result.connectionOrderMap && typeof result.connectionOrderMap === 'object'
    ? result.connectionOrderMap
    : {}
  cmdBookmarks.value = Array.isArray(result.cmdBookmarks) ? result.cmdBookmarks : []
}

async function persistGroupSettings() {
  if (!electronAPI?.saveSshGroupSettings) return

  const result = await electronAPI.saveSshGroupSettings(
    toPlainData(groups.value),
    toPlainData(connectionGroupMap.value),
    toPlainData(connectionOrderMap.value),
    toPlainData(cmdBookmarks.value)
  )
  if (result?.success) {
    groups.value = Array.isArray(result.groups) ? result.groups : groups.value
    connectionGroupMap.value = result.connectionGroupMap && typeof result.connectionGroupMap === 'object'
      ? result.connectionGroupMap
      : connectionGroupMap.value
    connectionOrderMap.value = result.connectionOrderMap && typeof result.connectionOrderMap === 'object'
      ? result.connectionOrderMap
      : connectionOrderMap.value
    cmdBookmarks.value = Array.isArray(result.cmdBookmarks) ? result.cmdBookmarks : cmdBookmarks.value
  }
}

async function createGroup() {
  const name = String(newGroupName.value || '').trim()
  if (!name) {
    appStore.toast('请填写分组名称', 'warning')
    return
  }

  const exists = groups.value.some(group => group.name.trim().toLowerCase() === name.toLowerCase())
  if (exists) {
    appStore.toast('分组名称已存在', 'warning')
    return
  }

  groups.value = [
    ...groups.value,
    {
      id: generateId(),
      name,
      order: groups.value.length
    }
  ]
  newGroupName.value = ''
  await persistGroupSettings()
  appStore.toast('分组已创建', 'success')
}

function startGroupRename(group) {
  if (!group || group.locked) return
  editingGroupId.value = String(group.id)
  editingGroupName.value = group.name
}

function cancelGroupRename() {
  editingGroupId.value = null
  editingGroupName.value = ''
}

async function saveGroupRename() {
  const groupId = editingGroupId.value
  const name = String(editingGroupName.value || '').trim()
  if (!groupId) return
  if (!name) {
    appStore.toast('分组名称不能为空', 'warning')
    return
  }

  const exists = groups.value.some(group => group.id !== groupId && group.name.trim().toLowerCase() === name.toLowerCase())
  if (exists) {
    appStore.toast('分组名称已存在', 'warning')
    return
  }

  groups.value = groups.value.map((group) => {
    if (group.id !== groupId) return group
    return {
      ...group,
      name
    }
  })

  await persistGroupSettings()
  cancelGroupRename()
  appStore.toast('分组已重命名', 'success')
}

async function deleteGroup(groupId) {
  const group = groups.value.find(item => item.id === groupId)
  if (!group) return

  const confirmed = await appStore.confirm(`确定删除分组“${group.name}”吗？该分组下的连接会移动到未分组。`)
  if (!confirmed) return

  groups.value = groups.value
    .filter(item => item.id !== groupId)
    .map((item, index) => ({
      ...item,
      order: index
    }))

  const nextMap = { ...connectionGroupMap.value }
  Object.keys(nextMap).forEach((connectionId) => {
    if (nextMap[connectionId] === groupId) {
      delete nextMap[connectionId]
    }
  })
  connectionGroupMap.value = nextMap
  await persistGroupSettings()
  appStore.toast('分组已删除', 'success')
}

function handleGroupDragStart(groupId) {
  draggingGroupId.value = groupId
}

function getNormalizedGroupId(groupKey) {
  return groupKey === '__ungrouped__' ? '' : groupKey
}

function getOrderedSshIdsByGroup(groupKey) {
  const normalizedGroupId = getNormalizedGroupId(groupKey)
  return [...connections.value]
    .filter(connection => (connectionGroupMap.value[connection.id] || '') === normalizedGroupId)
    .sort((a, b) => {
      const aOrder = Number.isFinite(connectionOrderMap.value[a.id]) ? connectionOrderMap.value[a.id] : Number.MAX_SAFE_INTEGER
      const bOrder = Number.isFinite(connectionOrderMap.value[b.id]) ? connectionOrderMap.value[b.id] : Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
    })
    .map(connection => connection.id)
}

async function handleGroupDrop(targetGroupId) {
  if (!draggingGroupId.value || draggingGroupId.value === targetGroupId) return

  const currentGroups = [...groups.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const sourceIndex = currentGroups.findIndex(group => group.id === draggingGroupId.value)
  const targetIndex = currentGroups.findIndex(group => group.id === targetGroupId)
  if (sourceIndex === -1 || targetIndex === -1) return

  const [moved] = currentGroups.splice(sourceIndex, 1)
  currentGroups.splice(targetIndex, 0, moved)
  groups.value = currentGroups.map((group, index) => ({
    ...group,
    order: index
  }))
  draggingGroupId.value = ''
  await persistGroupSettings()
}

function handleGroupHeaderDrop(group) {
  if (draggingGroupId.value && !group.locked) {
    handleGroupDrop(group.id)
    return
  }

  if (draggingItem.value) {
    handleSectionDrop(group)
  }
}

function handleItemDragStart(itemType, itemId, groupKey) {
  draggingItem.value = {
    itemType,
    itemId,
    groupKey
  }
}

async function handleItemDrop(section, targetItemId) {
  if (!draggingItem.value) return
  if (draggingItem.value.itemType !== section.itemType) return
  if (draggingItem.value.itemId === targetItemId) return

  if (section.itemType === 'ssh') {
    const sourceKey = draggingItem.value.groupKey
    const targetKey = section.key
    const sourceIds = getOrderedSshIdsByGroup(sourceKey).filter(itemId => itemId !== draggingItem.value.itemId)
    const targetIds = sourceKey === targetKey ? sourceIds : getOrderedSshIdsByGroup(targetKey).filter(itemId => itemId !== draggingItem.value.itemId)
    const targetIndex = targetIds.indexOf(targetItemId)
    if (targetIndex === -1) return

    targetIds.splice(targetIndex, 0, draggingItem.value.itemId)

    const nextGroupMap = { ...connectionGroupMap.value }
    const normalizedTargetGroupId = getNormalizedGroupId(targetKey)
    if (normalizedTargetGroupId) {
      nextGroupMap[draggingItem.value.itemId] = normalizedTargetGroupId
    } else {
      delete nextGroupMap[draggingItem.value.itemId]
    }
    connectionGroupMap.value = nextGroupMap

    const nextOrderMap = { ...connectionOrderMap.value }
    sourceIds.forEach((itemId, index) => {
      nextOrderMap[itemId] = index
    })
    targetIds.forEach((itemId, index) => {
      nextOrderMap[itemId] = index
    })
    connectionOrderMap.value = nextOrderMap
  } else if (section.itemType === 'cmd') {
    if (draggingItem.value.groupKey !== section.key) return
    const itemIds = section.items.map(item => item.id)
    const sourceIndex = itemIds.indexOf(draggingItem.value.itemId)
    const targetIndex = itemIds.indexOf(targetItemId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const reordered = [...itemIds]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const bookmarkMap = new Map(cmdBookmarks.value.map(item => [item.id, item]))
    cmdBookmarks.value = reordered.map((itemId, index) => ({
      ...bookmarkMap.get(itemId),
      order: index
    }))
  }

  draggingItem.value = null
  await persistGroupSettings()
}

async function handleSectionDrop(section) {
  if (!draggingItem.value) return
  if (draggingItem.value.itemType !== section.itemType) return

  if (section.itemType === 'ssh') {
    const sourceKey = draggingItem.value.groupKey
    const targetKey = section.key
    const sourceIds = getOrderedSshIdsByGroup(sourceKey).filter(itemId => itemId !== draggingItem.value.itemId)
    const targetIds = sourceKey === targetKey ? sourceIds : getOrderedSshIdsByGroup(targetKey).filter(itemId => itemId !== draggingItem.value.itemId)

    targetIds.push(draggingItem.value.itemId)

    const nextGroupMap = { ...connectionGroupMap.value }
    const normalizedTargetGroupId = getNormalizedGroupId(targetKey)
    if (normalizedTargetGroupId) {
      nextGroupMap[draggingItem.value.itemId] = normalizedTargetGroupId
    } else {
      delete nextGroupMap[draggingItem.value.itemId]
    }
    connectionGroupMap.value = nextGroupMap

    const nextOrderMap = { ...connectionOrderMap.value }
    sourceIds.forEach((itemId, index) => {
      nextOrderMap[itemId] = index
    })
    targetIds.forEach((itemId, index) => {
      nextOrderMap[itemId] = index
    })
    connectionOrderMap.value = nextOrderMap
  } else if (section.itemType === 'cmd') {
    if (draggingItem.value.groupKey !== section.key) return
    const reordered = section.items
      .map(item => item.id)
      .filter(itemId => itemId !== draggingItem.value.itemId)
    reordered.push(draggingItem.value.itemId)

    const bookmarkMap = new Map(cmdBookmarks.value.map(item => [item.id, item]))
    cmdBookmarks.value = reordered.map((itemId, index) => ({
      ...bookmarkMap.get(itemId),
      order: index
    }))
  }

  draggingItem.value = null
  await persistGroupSettings()
}

function openSaveCmdDialog(path = '') {
  const normalizedPath = String(path || '').trim()
  const defaultName = normalizedPath ? normalizedPath.split(/[\\/]/).filter(Boolean).pop() || 'CMD' : 'CMD'
  cmdBookmarkDraft.value = {
    id: '',
    name: defaultName,
    path: normalizedPath
  }
  showSaveCmdDialog.value = true
}

function closeSaveCmdDialog() {
  showSaveCmdDialog.value = false
  cmdBookmarkDraft.value = {
    id: '',
    name: '',
    path: ''
  }
}

async function saveCmdBookmark() {
  const name = String(cmdBookmarkDraft.value.name || '').trim()
  const path = String(cmdBookmarkDraft.value.path || '').trim()
  if (!name) {
    appStore.toast('请填写 CMD 名称', 'warning')
    return
  }
  if (!path) {
    appStore.toast('请填写 CMD 路径', 'warning')
    return
  }

  cmdBookmarks.value = [
    ...cmdBookmarks.value,
    {
      id: generateId(),
      name,
      path,
      order: cmdBookmarks.value.length
    }
  ]
  await persistGroupSettings()
  closeSaveCmdDialog()
  appStore.toast('CMD 收藏已保存', 'success')
}

async function saveCurrentCmdSession() {
  if (!activeSession.value || activeSession.value.type !== 'cmd') return
  if (!electronAPI?.resolveCmdSessionPath) return

  const result = await electronAPI.resolveCmdSessionPath(activeSession.value.sessionId)
  if (!result?.success) {
    appStore.toast(result?.error || '读取当前 CMD 路径失败', 'error')
    return
  }

  openSaveCmdDialog(result.path)
}

function getTerminalTheme() {
  if (themeMode.value === 'light') {
    return {
      background: '#ffffff',
      foreground: '#1f2937',
      cursor: '#5568d3',
      selectionBackground: 'rgba(85, 104, 211, 0.18)',
      black: '#1f2937',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#ca8a04',
      blue: '#2563eb',
      magenta: '#c026d3',
      cyan: '#0891b2',
      white: '#f8fafc',
      brightBlack: '#64748b',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#eab308',
      brightBlue: '#3b82f6',
      brightMagenta: '#d946ef',
      brightCyan: '#06b6d4',
      brightWhite: '#0f172a'
    }
  }

  return {
    background: '#06080f',
    foreground: '#e8f4ff',
    cursor: '#7ad8ff',
    selectionBackground: 'rgba(90, 160, 255, 0.28)',
    black: '#06080f',
    red: '#ff7c9d',
    green: '#73f0a2',
    yellow: '#ffd166',
    blue: '#69c9ff',
    magenta: '#ff7ae6',
    cyan: '#6ee7ff',
    white: '#e8f4ff',
    brightBlack: '#5a6b80',
    brightRed: '#ff96b0',
    brightGreen: '#9af6bc',
    brightYellow: '#ffe29a',
    brightBlue: '#8bd9ff',
    brightMagenta: '#ff9bf0',
    brightCyan: '#9af1ff',
    brightWhite: '#ffffff'
  }
}

function selectConnection(connectionId) {
  const connection = connections.value.find(item => item.id === String(connectionId))
  if (!connection) return
  selectedConnectionId.value = connection.id
  draft.value = createDraft(connection)
}

function resetSelection() {
  selectedConnectionId.value = ''
  draft.value = createDraft()
}

function handleCreateConnection() {
  editingConnectionId.value = ''
  editorDraft.value = createDraft()
  showEditorDialog.value = true
}

function openConnectionEditor(connection) {
  if (!connection) return
  editingConnectionId.value = String(connection.id)
  editorDraft.value = createDraft({
    ...connection,
    groupId: connectionGroupMap.value[connection.id] || ''
  })
  showEditorDialog.value = true
}

function closeConnectionEditor() {
  showEditorDialog.value = false
  editingConnectionId.value = ''
}

function upsertConnection(connection) {
  const normalized = normalizeConnection(connection)
  const index = connections.value.findIndex(item => item.id === normalized.id)
  if (index === -1) {
    connections.value.push(normalized)
  } else {
    connections.value.splice(index, 1, normalized)
  }
  connections.value = sortConnections(connections.value)
  return normalized
}

function getSessionTab(sessionId) {
  return sessionTabs.value.find(item => item.sessionId === sessionId) || null
}

function appendPendingSessionEvent(payload) {
  if (ignoredSessionIds.has(payload.sessionId)) return
  const list = pendingSessionEvents.get(payload.sessionId) || []
  list.push(payload)
  pendingSessionEvents.set(payload.sessionId, list)
}

function flushPendingSessionEvents(sessionId) {
  const list = pendingSessionEvents.get(sessionId)
  if (!list?.length) return
  pendingSessionEvents.delete(sessionId)
  list.forEach((payload) => applySessionEvent(payload))
}

async function resizeSession(sessionId, cols, rows) {
  if (!electronAPI?.resizeSshSession) return
  await electronAPI.resizeSshSession(sessionId, cols, rows)
}

function createTerminalController(sessionId, hostElement) {
  const fitAddon = new FitAddon()
  const terminal = new Terminal({
    cursorBlink: true,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.25,
    allowTransparency: false,
    scrollback: 3000,
    theme: getTerminalTheme()
  })

  terminal.loadAddon(fitAddon)
  terminal.open(hostElement)
  fitAddon.fit()

  const copyListener = (event) => {
    const selectedText = String(terminal.getSelection?.() || '')
    if (!selectedText) return

    event.preventDefault()
    event.stopPropagation()

    if (event.clipboardData?.setData) {
      event.clipboardData.setData('text/plain', selectedText)
    }
    void copyTerminalSelection(sessionId, { showToast: false, showWarning: false })
  }

  const pasteListener = (event) => {
    event.preventDefault()
    event.stopPropagation()
    void pasteTextToSession(sessionId, event.clipboardData?.getData('text/plain') || '')
  }

  const contextMenuListener = (event) => {
    event.preventDefault()
    event.stopPropagation()
    void pasteTextToSession(sessionId)
  }

  const clipboardTargets = [hostElement, hostElement.querySelector('.xterm-helper-textarea')].filter(Boolean)
  clipboardTargets.forEach((target) => {
    target.addEventListener('copy', copyListener, true)
    target.addEventListener('paste', pasteListener, true)
    target.addEventListener('contextmenu', contextMenuListener, true)
  })

  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== 'keydown') return true

    if (isCopyShortcut(event) && terminal.hasSelection?.()) {
      event.preventDefault()
      event.stopPropagation()
      void copyTerminalSelection(sessionId, { showToast: false, showWarning: false })
      return false
    }

    if (isPasteShortcut(event)) {
      event.preventDefault()
      event.stopPropagation()
      void pasteTextToSession(sessionId)
      return false
    }

    return true
  })

  const dataDisposable = terminal.onData(async (data) => {
    await writeSessionInput(sessionId, data, { showError: false })
  })

  const resizeDisposable = terminal.onResize(async ({ cols, rows }) => {
    await resizeSession(sessionId, cols, rows)
  })

  terminalControllers.set(sessionId, {
    terminal,
    fitAddon,
    dataDisposable,
    resizeDisposable,
    detachClipboardListeners: () => {
      clipboardTargets.forEach((target) => {
        target.removeEventListener('copy', copyListener, true)
        target.removeEventListener('paste', pasteListener, true)
        target.removeEventListener('contextmenu', contextMenuListener, true)
      })
    }
  })

  flushPendingSessionEvents(sessionId)
}

function ensureTerminalController(sessionId) {
  if (terminalControllers.has(sessionId)) return
  const hostElement = terminalHostRefs.get(sessionId)
  if (!hostElement) return
  createTerminalController(sessionId, hostElement)
}

function disposeTerminalController(sessionId) {
  const controller = terminalControllers.get(sessionId)
  if (!controller) return

  try { controller.dataDisposable?.dispose() } catch (error) {}
  try { controller.resizeDisposable?.dispose() } catch (error) {}
  try { controller.detachClipboardListeners?.() } catch (error) {}
  try { controller.terminal?.dispose() } catch (error) {}

  terminalControllers.delete(sessionId)
}

function setTerminalHostRef(sessionId, element) {
  if (element) {
    terminalHostRefs.set(sessionId, element)
    ensureTerminalController(sessionId)
    return
  }
  terminalHostRefs.delete(sessionId)
}

async function fitActiveTerminal() {
  const controller = terminalControllers.get(activeSessionId.value)
  if (!controller) return
  controller.fitAddon.fit()
  await resizeSession(activeSessionId.value, controller.terminal.cols, controller.terminal.rows)
}

function focusActiveTerminal() {
  terminalControllers.get(activeSessionId.value)?.terminal?.focus()
}

function clearActiveTerminal() {
  terminalControllers.get(activeSessionId.value)?.terminal?.clear()
}

function setActiveSession(sessionId) {
  activeSessionId.value = sessionId
}

async function closeSessionTab(sessionId) {
  const tab = getSessionTab(sessionId)
  if (!tab) return
  ignoredSessionIds.add(sessionId)
  if (tab.status === 'connected' || tab.status === 'connecting') {
    await electronAPI?.disconnectSshSession?.(sessionId)
  }

  sessionTabs.value = sessionTabs.value.filter(item => item.sessionId !== sessionId)
  pendingSessionEvents.delete(sessionId)
  disposeTerminalController(sessionId)
  terminalHostRefs.delete(sessionId)

  if (activeSessionId.value === sessionId) {
    activeSessionId.value = sessionTabs.value[0]?.sessionId || ''
  }
}

function applySessionEvent(payload) {
  if (ignoredSessionIds.has(payload.sessionId)) return
  const tab = getSessionTab(payload.sessionId)
  if (!tab) {
    appendPendingSessionEvent(payload)
    return
  }

  const controller = terminalControllers.get(payload.sessionId)

  if (payload.type === 'status') {
    tab.status = payload.status || tab.status
    tab.statusLabel = getStatusLabel(tab.status)
    tab.message = payload.message || tab.message

    if (payload.status === 'connected' && payload.connectionId) {
      const existing = connections.value.find(item => item.id === payload.connectionId)
      if (existing) {
        const connectedAt = new Date().toISOString()
        const updated = upsertConnection({
          ...existing,
          lastConnectedAt: connectedAt,
          updatedAt: connectedAt
        })
        if (selectedConnectionId.value === updated.id) {
          draft.value = createDraft(updated)
        }
      }
    }

    if (payload.message && controller?.terminal) {
      controller.terminal.writeln(`[TodoX] ${payload.message}`)
    }
    return
  }

  if (payload.type === 'data') {
    if (controller?.terminal) {
      controller.terminal.write(payload.data || '')
    } else {
      appendPendingSessionEvent(payload)
    }
    return
  }

  if (payload.type === 'closed') {
    tab.status = 'closed'
    tab.statusLabel = getStatusLabel('closed')
    tab.message = '会话已断开'
    if (controller?.terminal) {
      controller.terminal.writeln('\r\n[TodoX] 会话已断开')
    }
  }
}

function bindSshSessionEvent() {
  if (sshSessionEventBound || !electronAPI?.onSshSessionEvent) return
  sshSessionEventBound = true

  electronAPI.onSshSessionEvent(async (payload) => {
    if (!payload) return
    applySessionEvent(payload)

    if (payload.type === 'status' && payload.status === 'connected' && payload.sessionId === activeSessionId.value) {
      await nextTick()
      await fitActiveTerminal()
      focusActiveTerminal()
    }
  })
}

async function loadConnections() {
  if (!electronAPI?.loadSshConnections) {
    appStore.toast('当前环境不支持 SSH 连接器', 'warning')
    return
  }

  loading.value = true
  try {
    const result = await electronAPI.loadSshConnections()
    if (!result?.success) {
      throw new Error(result?.error || '加载 SSH 连接失败')
    }

    connections.value = sortConnections((result.connections || []).map(normalizeConnection).filter(Boolean))

    if (selectedConnectionId.value) {
      const selected = connections.value.find(item => item.id === selectedConnectionId.value)
      if (selected) {
        draft.value = createDraft(selected)
      } else {
        resetSelection()
      }
    } else if (!draft.value.name && !draft.value.host && connections.value[0]) {
      selectConnection(connections.value[0].id)
    }
  } catch (error) {
    console.error('加载 SSH 连接失败:', error)
    appStore.toast(error.message || '加载 SSH 连接失败', 'error')
  } finally {
    loading.value = false
  }
}

async function handleSaveConnection() {
  if (!electronAPI?.addSshConnection || !electronAPI?.updateSshConnection) {
    appStore.toast('当前环境不支持保存 SSH 连接', 'warning')
    return null
  }

  const payload = buildSavePayload(editorDraft.value)
  if (!payload) return null

  const now = new Date().toISOString()

  if (editingConnectionId.value) {
    const existing = connections.value.find(item => item.id === editingConnectionId.value)
    const savedConnection = {
      ...(existing || {}),
      ...payload,
      id: editingConnectionId.value,
      createdAt: existing?.createdAt || payload.createdAt || now,
      updatedAt: now,
      lastConnectedAt: existing?.lastConnectedAt || payload.lastConnectedAt || ''
    }

    const result = await electronAPI.updateSshConnection(savedConnection.id, toPlainData(savedConnection))
    if (!result?.success) {
      appStore.toast(result?.error || '保存失败', 'error')
      return null
    }

    const normalized = upsertConnection(savedConnection)
    selectedConnectionId.value = normalized.id
    draft.value = createDraft({
      ...normalized,
      groupId: editorDraft.value.groupId || ''
    })
    if (editorDraft.value.groupId) {
      connectionGroupMap.value = {
        ...connectionGroupMap.value,
        [normalized.id]: editorDraft.value.groupId
      }
    } else {
      const nextMap = { ...connectionGroupMap.value }
      delete nextMap[normalized.id]
      connectionGroupMap.value = nextMap
    }
    await persistGroupSettings()
    closeConnectionEditor()
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

  const result = await electronAPI.addSshConnection(toPlainData(newConnection))
  if (!result?.success) {
    appStore.toast(result?.error || '保存失败', 'error')
    return null
  }

  const normalized = upsertConnection(newConnection)
  selectedConnectionId.value = normalized.id
  draft.value = createDraft({
    ...normalized,
    groupId: editorDraft.value.groupId || ''
  })
  if (editorDraft.value.groupId) {
    connectionGroupMap.value = {
      ...connectionGroupMap.value,
      [normalized.id]: editorDraft.value.groupId
    }
    await persistGroupSettings()
  }
  closeConnectionEditor()
  appStore.toast('SSH 连接已保存', 'success')
  return normalized
}

async function handleSaveAndConnect() {
  const savedConnection = await handleSaveConnection()
  if (!savedConnection) return
  await connectEmbeddedSession(savedConnection)
}

async function handleDeleteConnection() {
  if (!electronAPI?.deleteSshConnection) {
    appStore.toast('当前环境不支持删除 SSH 连接', 'warning')
    return
  }

  if (!selectedConnectionId.value) {
    appStore.toast('请先选择要删除的连接', 'warning')
    return
  }

  const connection = connections.value.find(item => item.id === selectedConnectionId.value)
  if (!connection) return

  const confirmed = await appStore.confirm(`确定删除 SSH 连接“${connection.name}”吗？`)
  if (!confirmed) return

  const result = await electronAPI.deleteSshConnection(connection.id)
  if (!result?.success) {
    appStore.toast(result?.error || '删除失败', 'error')
    return
  }

  connections.value = connections.value.filter(item => item.id !== connection.id)
  const nextMap = { ...connectionGroupMap.value }
  delete nextMap[connection.id]
  connectionGroupMap.value = nextMap
  await persistGroupSettings()
  if (connections.value[0]) {
    selectConnection(connections.value[0].id)
  } else {
    resetSelection()
  }
  appStore.toast('SSH 连接已删除', 'success')
}

async function handlePickPrivateKey() {
  if (!electronAPI?.selectSshPrivateKey) {
    appStore.toast('当前环境不支持选择私钥文件', 'warning')
    return
  }

  const result = await electronAPI.selectSshPrivateKey()
  if (result?.success && result.path) {
    if (showEditorDialog.value) {
      editorDraft.value.privateKeyPath = result.path
    } else {
      draft.value.privateKeyPath = result.path
    }
  }
}

async function connectEmbeddedSession(connection) {
  if (!electronAPI?.connectSshSession) {
    appStore.toast('当前环境不支持应用内 SSH', 'warning')
    return
  }

  const payload = buildSessionPayload(connection)
  if (!payload) return

  if (!payload.privateKeyPath) {
    appStore.toast('应用内 SSH 需要先配置私钥路径', 'warning')
    return
  }

  const result = await electronAPI.connectSshSession(payload)
  if (!result?.success) {
    appStore.toast(result?.error || '连接失败', 'error')
    return
  }

  const tab = {
    sessionId: result.sessionId,
    connectionId: result.connectionId || payload.id || '',
    title: payload.name || payload.host,
    target: formatTarget(payload, true),
    type: 'ssh',
    status: 'connecting',
    statusLabel: getStatusLabel('connecting'),
    message: `正在连接 ${formatTarget(payload, true)}...`
  }

  sessionTabs.value.push(tab)
  activeSessionId.value = tab.sessionId

  await nextTick()
  ensureTerminalController(tab.sessionId)
  const controller = terminalControllers.get(tab.sessionId)
  if (controller) {
    controller.terminal.writeln(`[TodoX] ${tab.message}`)
  }
  await fitActiveTerminal()
  focusActiveTerminal()
}

async function createCmdTab(options = {}) {
  if (!electronAPI?.createCmdSession) {
    appStore.toast('当前环境不支持本地 CMD', 'warning')
    return
  }

  const path = String(options.path || '').trim()

  const result = await electronAPI.createCmdSession({
    cwd: path
  })
  if (!result?.success) {
    appStore.toast(result?.error || '创建 CMD 失败', 'error')
    return
  }

  const tab = {
    sessionId: result.sessionId,
    connectionId: '',
    title: options.name || result.title || 'CMD',
    target: result.cwd || path || '本地命令行',
    type: 'cmd',
    status: 'connected',
    statusLabel: getStatusLabel('connected'),
    message: `本地 CMD 已启动：${result.cwd || path || ''}`
  }

  sessionTabs.value.push(tab)
  activeSessionId.value = tab.sessionId

  await nextTick()
  ensureTerminalController(tab.sessionId)
  const controller = terminalControllers.get(tab.sessionId)
  if (controller) {
    controller.terminal.writeln('[TodoX] 本地 CMD 已启动')
  }
  await fitActiveTerminal()
  focusActiveTerminal()
}

async function openCmdBookmark(bookmark) {
  if (!bookmark) return
  await createCmdTab({
    name: bookmark.name,
    path: bookmark.path
  })
}

async function disconnectActiveSession() {
  if (!activeSessionId.value || !electronAPI?.disconnectSshSession) return
  await electronAPI.disconnectSshSession(activeSessionId.value)
}

async function sendControlC() {
  if (!activeSessionId.value) return
  await writeSessionInput(activeSessionId.value, '\u0003', { showError: false })
}

async function handleCopyCommand(connection) {
  if (!String(connection?.host || '').trim()) {
    appStore.toast('请先填写主机地址', 'warning')
    return
  }

  try {
    await navigator.clipboard.writeText(buildCommandPreview(connection))
    appStore.toast('已复制 SSH 命令', 'success')
  } catch (error) {
    appStore.toast('复制失败', 'error')
  }
}

watch(activeSessionId, async () => {
  await nextTick()
  await fitActiveTerminal()
  focusActiveTerminal()
})

watch(themeMode, () => {
  terminalControllers.forEach((controller) => {
    if (controller?.terminal) {
      controller.terminal.options.theme = getTerminalTheme()
    }
  })
})

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      fitActiveTerminal()
    })
    if (terminalStageRef.value) {
      resizeObserver.observe(terminalStageRef.value)
    }
  }

  bindSshSessionEvent()
  loadGroupSettings()
  loadConnections()
})

onBeforeUnmount(async () => {
  try { resizeObserver?.disconnect() } catch (error) {}

  for (const tab of [...sessionTabs.value]) {
    if (tab.status === 'connected' || tab.status === 'connecting') {
      await electronAPI?.disconnectSshSession?.(tab.sessionId)
    }
    disposeTerminalController(tab.sessionId)
  }
})
</script>

<style scoped>
.ssh-page {
  width: 100%;
  min-height: 100%;
  padding: 14px 16px 18px;
  box-sizing: border-box;
  background: var(--ssh-page-bg);
  color: var(--ssh-text-main);
  overflow-y: auto;
  --ssh-page-bg: linear-gradient(180deg, #060910 0%, #0a101a 100%);
  --ssh-surface: rgba(9, 14, 24, 0.98);
  --ssh-border: rgba(60, 88, 132, 0.7);
  --ssh-border-soft: rgba(66, 97, 146, 0.58);
  --ssh-input-border: rgba(66, 97, 146, 0.72);
  --ssh-input-bg: #0b1220;
  --ssh-input-placeholder: #5f7797;
  --ssh-input-focus: rgba(98, 178, 255, 0.72);
  --ssh-text-main: #e6f2ff;
  --ssh-text-strong: #f2fbff;
  --ssh-text-muted: #8ba1bf;
  --ssh-text-soft: #8298b5;
  --ssh-accent: #87e0ff;
  --ssh-accent-strong: #8ad9ff;
  --ssh-danger: #ff9ec2;
  --ssh-item-bg: #0a1120;
  --ssh-terminal-bg: #05080f;
  --ssh-shadow: 0 0 16px rgba(98, 178, 255, 0.08);
  --ssh-group-header-bg: linear-gradient(90deg, rgba(17, 39, 68, 0.96) 0%, rgba(9, 21, 38, 0.98) 100%);
  --ssh-group-header-border: rgba(92, 136, 196, 0.38);
  --ssh-group-header-accent: #7edcff;
  --ssh-group-header-edit-bg: linear-gradient(90deg, rgba(24, 54, 91, 0.98) 0%, rgba(11, 26, 46, 1) 100%);
  --ssh-group-header-ungrouped-bg: linear-gradient(90deg, rgba(48, 60, 82, 0.96) 0%, rgba(20, 28, 42, 0.98) 100%);
  --ssh-group-header-ungrouped-accent: #9fb5d1;
  --ssh-group-header-cmd-bg: linear-gradient(90deg, rgba(70, 42, 18, 0.96) 0%, rgba(35, 21, 9, 0.98) 100%);
  --ssh-group-header-cmd-accent: #ffbf69;
}

.ssh-page[data-theme='light'] {
  --ssh-page-bg: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);
  --ssh-surface: rgba(255, 255, 255, 0.98);
  --ssh-border: rgba(203, 213, 224, 0.95);
  --ssh-border-soft: rgba(226, 232, 240, 1);
  --ssh-input-border: rgba(203, 213, 224, 1);
  --ssh-input-bg: #ffffff;
  --ssh-input-placeholder: #94a3b8;
  --ssh-input-focus: rgba(102, 126, 234, 0.55);
  --ssh-text-main: #2d3748;
  --ssh-text-strong: #1a202c;
  --ssh-text-muted: #718096;
  --ssh-text-soft: #718096;
  --ssh-accent: #5568d3;
  --ssh-accent-strong: #5568d3;
  --ssh-danger: #d53f8c;
  --ssh-item-bg: #ffffff;
  --ssh-terminal-bg: #ffffff;
  --ssh-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  --ssh-group-header-bg: linear-gradient(90deg, rgba(225, 238, 255, 0.98) 0%, rgba(243, 248, 255, 1) 100%);
  --ssh-group-header-border: rgba(170, 192, 224, 0.75);
  --ssh-group-header-accent: #4d7dce;
  --ssh-group-header-edit-bg: linear-gradient(90deg, rgba(214, 231, 255, 1) 0%, rgba(238, 246, 255, 1) 100%);
  --ssh-group-header-ungrouped-bg: linear-gradient(90deg, rgba(234, 239, 247, 1) 0%, rgba(246, 248, 252, 1) 100%);
  --ssh-group-header-ungrouped-accent: #7f93ad;
  --ssh-group-header-cmd-bg: linear-gradient(90deg, rgba(255, 239, 214, 1) 0%, rgba(255, 247, 233, 1) 100%);
  --ssh-group-header-cmd-accent: #d18b2d;
}

.ssh-header,
.ssh-sidebar,
.ssh-workspace {
  border: 1px solid var(--ssh-border);
  border-radius: 14px;
  background: var(--ssh-surface);
}

.ssh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.ssh-header h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-family: 'Consolas', 'Courier New', monospace;
}

.ssh-header p {
  margin: 4px 0 0;
  color: var(--ssh-text-muted);
  font-size: 12px;
}

.ssh-header-actions,
.ssh-editor-actions,
.ssh-terminal-actions,
.ssh-connection-actions,
.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ssh-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 12px;
  min-height: calc(100vh - 150px);
}

.ssh-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
}

.ssh-sidebar-top {
  margin-bottom: 12px;
}

.ssh-search-input,
.ssh-field input,
.ssh-field textarea,
.ssh-select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ssh-input-border);
  background: var(--ssh-input-bg);
  color: var(--ssh-text-main);
  font-size: 13px;
  line-height: 1.5;
}

.ssh-search-input::placeholder,
.ssh-field input::placeholder,
.ssh-field textarea::placeholder,
.ssh-select::placeholder {
  color: var(--ssh-input-placeholder);
}

.ssh-search-input:focus,
.ssh-field input:focus,
.ssh-field textarea:focus,
.ssh-select:focus {
  outline: none;
  border-color: var(--ssh-input-focus);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ssh-input-focus) 25%, transparent);
}

.ssh-field textarea {
  resize: vertical;
  font-family: 'Consolas', 'Courier New', monospace;
}

.ssh-list-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ssh-group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 100%;
  overflow-y: auto;
}

.ssh-group-section {
  border: 1px solid var(--ssh-border-soft);
  border-radius: 10px;
  background: var(--ssh-item-bg);
  overflow: hidden;
}

.ssh-group-header {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px 9px 14px;
  border: none;
  background: var(--ssh-group-header-bg);
  box-shadow: inset 0 -1px 0 var(--ssh-group-header-border);
  color: var(--ssh-text-strong);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.ssh-group-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--ssh-group-header-accent);
}

.ssh-group-header[draggable='true'] {
  cursor: grab;
}

.ssh-group-header.editing {
  background: var(--ssh-group-header-edit-bg);
  cursor: default;
}

.ssh-group-header.ungrouped-group {
  background: var(--ssh-group-header-ungrouped-bg);
}

.ssh-group-header.ungrouped-group::before {
  background: var(--ssh-group-header-ungrouped-accent);
}

.ssh-group-header.cmd-group {
  background: var(--ssh-group-header-cmd-bg);
}

.ssh-group-header.cmd-group::before {
  background: var(--ssh-group-header-cmd-accent);
}

.ssh-group-arrow {
  color: var(--ssh-text-muted);
}

.ssh-group-name {
  flex: 1;
}

.ssh-group-count {
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--ssh-group-header-border) 88%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ssh-item-bg) 36%, transparent);
  color: var(--ssh-text-muted);
  font-size: 11px;
}

.ssh-group-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--ssh-input-border);
  background: var(--ssh-input-bg);
  color: var(--ssh-text-main);
  font-size: 12px;
}

.ssh-group-rename {
  padding: 0 8px;
  height: 24px;
  border: 1px solid var(--ssh-border-soft);
  border-radius: 8px;
  background: var(--ssh-item-bg);
  color: var(--ssh-text-muted);
  font-size: 11px;
  cursor: pointer;
}

.ssh-group-delete {
  width: 24px;
  height: 24px;
  border: 1px solid var(--ssh-border-soft);
  border-radius: 8px;
  background: var(--ssh-item-bg);
  color: var(--ssh-text-muted);
  cursor: pointer;
}

.ssh-list-empty {
  padding: 14px 4px;
  color: var(--ssh-text-muted);
  font-size: 13px;
}

.ssh-connection-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
  overflow-y: auto;
}

.ssh-connection-list.compact {
  gap: 0;
}

.ssh-connection-item {
  padding: 12px;
  border: 1px solid var(--ssh-border-soft);
  border-radius: 12px;
  background: var(--ssh-item-bg);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.ssh-connection-item:hover {
  border-color: var(--ssh-input-focus);
  box-shadow: var(--ssh-shadow);
}

.ssh-connection-item.active {
  border-color: color-mix(in srgb, var(--ssh-danger) 65%, var(--ssh-border-soft));
  box-shadow: var(--ssh-shadow);
}

.ssh-connection-item:focus-visible {
  outline: none;
  border-color: var(--ssh-input-focus);
}

.ssh-connection-item.compact {
  padding: 8px 10px;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--ssh-border-soft) 70%, transparent);
  border-radius: 0;
  box-shadow: none;
}

.ssh-connection-item.compact:first-child {
  border-top: none;
}

.ssh-connection-line {
  display: grid;
  grid-template-columns: minmax(0, 112px) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.ssh-connection-name,
.editor-title,
.ssh-tab-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ssh-text-strong);
}

.ssh-connection-name.compact {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssh-connection-target,
.editor-target,
.panel-subtitle {
  margin-top: 4px;
  color: var(--ssh-accent-strong);
  font-size: 12px;
  line-height: 1.5;
  font-family: 'Consolas', 'Courier New', monospace;
  word-break: break-all;
}

.ssh-connection-target.compact {
  margin-top: 0;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.ssh-connection-meta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--ssh-text-soft);
  font-size: 11px;
}

.ssh-connection-meta.compact {
  margin-top: 4px;
  padding-left: 122px;
  font-size: 10px;
}

.ssh-sidebar-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--ssh-border) 72%, transparent);
}

.ssh-sidebar-panel.top-panel {
  margin-top: 0;
  margin-bottom: 12px;
  padding-top: 0;
  padding-bottom: 12px;
  border-top: none;
  border-bottom: 1px solid color-mix(in srgb, var(--ssh-border) 72%, transparent);
}

.sidebar-panel-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ssh-text-strong);
}

.ssh-path-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.ssh-path-chip {
  max-width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--ssh-border-soft);
  border-radius: 999px;
  background: var(--ssh-item-bg);
  color: var(--ssh-text-soft);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ssh-path-chip.active {
  border-color: var(--ssh-input-focus);
  color: var(--ssh-accent);
}

.ssh-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ssh-form-grid.auth-grid {
  margin-top: 10px;
}

.ssh-form-grid.compact {
  grid-template-columns: 1fr;
}

.ssh-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ssh-field span {
  color: var(--ssh-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.ssh-inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.ssh-editor-actions {
  margin-top: 12px;
}

.ssh-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 8, 15, 0.72);
  z-index: 1200;
  padding: 20px;
}

.ssh-dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--ssh-border);
  border-radius: 14px;
  background: var(--ssh-surface);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
}

.ssh-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.ssh-dialog-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--ssh-border);
  border-radius: 10px;
  background: var(--ssh-item-bg);
  color: var(--ssh-text-main);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.ssh-workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  padding: 12px;
}

.ssh-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ssh-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.ssh-tabs-empty {
  color: #869dbc;
  font-size: 12px;
  white-space: nowrap;
}

.ssh-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--ssh-border-soft);
  background: var(--ssh-item-bg);
  color: var(--ssh-text-main);
  cursor: pointer;
}

.ssh-tab.active {
  border-color: var(--ssh-input-focus);
}

.ssh-tab-title {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssh-tab-indicator {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ff6b81;
  box-shadow: 0 0 8px rgba(255, 107, 129, 0.45);
}

.ssh-tab-indicator[data-connected='true'] {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.45);
}

.ssh-tab-close {
  flex-shrink: 0;
  color: var(--ssh-text-muted);
}

.ssh-terminal-stage {
  position: relative;
  min-height: 0;
  border: 1px solid var(--ssh-border-soft);
  border-radius: 12px;
  background: var(--ssh-terminal-bg);
  overflow: hidden;
}

.ssh-terminal-empty {
  height: 100%;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ssh-text-soft);
  text-align: center;
  padding: 20px;
}

.ssh-terminal-empty-title {
  font-size: 16px;
  color: var(--ssh-text-strong);
  margin-bottom: 8px;
}

.ssh-terminal-pane,
.ssh-terminal-host {
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.ssh-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  color: var(--ssh-text-muted);
  font-size: 12px;
}

.ssh-btn {
  padding: 9px 12px;
  border: 1px solid var(--ssh-input-border);
  border-radius: 10px;
  background: var(--ssh-item-bg);
  color: var(--ssh-text-main);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.ssh-btn:hover:not(:disabled) {
  border-color: var(--ssh-input-focus);
  box-shadow: var(--ssh-shadow);
}

.ssh-btn.primary {
  color: var(--ssh-accent);
  border-color: var(--ssh-input-focus);
}

.ssh-btn.danger {
  color: var(--ssh-danger);
  border-color: color-mix(in srgb, var(--ssh-danger) 60%, var(--ssh-input-border));
}

.ssh-btn.mini {
  padding: 6px 10px;
}

.ssh-btn.compact {
  padding: 4px 10px;
  font-size: 11px;
}

.group-create-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.ssh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 1200px) {
  .ssh-layout {
    grid-template-columns: 1fr;
  }

  .ssh-list-shell {
    max-height: 280px;
  }
}

@media (max-width: 760px) {
  .ssh-page {
    padding: 12px;
  }

  .ssh-header,
  .ssh-tabs-bar,
  .ssh-status-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .ssh-form-grid {
    grid-template-columns: 1fr;
  }

  .ssh-inline-field {
    grid-template-columns: 1fr;
  }

  .ssh-tab-title {
    max-width: 120px;
  }

  .ssh-connection-line {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .ssh-connection-meta.compact {
    padding-left: 0;
  }
}
</style>
