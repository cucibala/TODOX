<template>
  <div class="ssh-page" :data-theme="themeMode">
    <header class="ssh-header">
      <div>
        <h1>SSH</h1>
        <p>左侧管理连接，顶部终端 tab 支持拖动排序和多排显示；连接为原生 SSH，SSH2 为兼容模式。</p>
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
          <div class="ssh-sidebar-headline">
            <div class="ssh-sidebar-headline-row">
              <div class="sidebar-panel-title">分组</div>
              <button
                class="ssh-plain-icon-btn group-add-btn"
                @click="toggleGroupCreator"
                :title="showGroupCreator ? '关闭新建分组' : '新建分组'"
                :aria-label="showGroupCreator ? '关闭新建分组' : '新建分组'"
              >
                {{ showGroupCreator ? '×' : '+' }}
              </button>
            </div>
            <div v-if="showGroupCreator" class="top-create-row">
              <div class="group-create-card">
                <div class="group-create-card-head">
                  <div class="group-create-card-title">新建分组</div>
                  <div class="group-create-card-desc">把服务器和 CMD 收藏整理到同一个区域里。</div>
                </div>
                <div class="ssh-inline-field group-create-form">
                  <input
                    ref="groupCreateInputRef"
                    v-model="newGroupName"
                    class="ssh-group-create-input"
                    type="text"
                    maxlength="30"
                    placeholder="例如：生产 / 测试 / 常用"
                    @keyup.enter="createGroup"
                  />
                  <button class="ssh-btn mini primary" @click="createGroup">创建</button>
                </div>
              </div>
            </div>
          </div>

          <input
            v-model="searchQuery"
            class="ssh-search-input"
            type="text"
            placeholder="搜索名称、主机、用户名"
          />
        </div>

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
                  @dragend="handleDragEnd"
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
                  :class="{
                    active:
                      (group.itemType === 'ssh' && selectedConnectionId === connection.id) ||
                      (group.itemType === 'cmd' && selectedCmdBookmarkId === connection.id)
                  }"
                  :draggable="true"
                  tabindex="0"
                  @click="group.itemType === 'ssh' ? selectConnection(connection.id) : selectCmdBookmark(connection.id)"
                  @dblclick="group.itemType === 'ssh' ? openConnectionEditor(connection) : openCmdBookmark(connection)"
                  @keydown.enter.prevent="group.itemType === 'ssh' ? selectConnection(connection.id) : selectCmdBookmark(connection.id)"
                  @keydown.space.prevent="group.itemType === 'ssh' ? selectConnection(connection.id) : selectCmdBookmark(connection.id)"
                  @dragstart="handleItemDragStart(group.itemType, connection.id, group.key)"
                  @dragend="handleDragEnd"
                  @dragover.prevent
                  @drop.prevent="handleItemDrop(group, connection.id)"
                >
                  <div class="ssh-connection-line">
                    <span class="ssh-connection-name compact">{{ connection.name }}</span>
                    <span class="ssh-connection-target compact">{{ group.itemType === 'ssh' ? formatTarget(connection) : connection.path }}</span>
                    <div class="ssh-connection-actions-inline">
                      <template v-if="group.itemType === 'ssh'">
                        <button
                          class="ssh-plain-icon-btn ssh-connect-icon-btn"
                          title="原生 SSH 连接"
                          aria-label="原生 SSH 连接"
                          @click.stop="connectNativeSession(connection)"
                        >
                          <img :src="connectIcon" alt="" />
                        </button>
                        <button
                          class="ssh-inline-action-btn"
                          title="SSH2 兼容模式，适合代理、上传下载和兼容性兜底"
                          aria-label="SSH2 兼容模式"
                          @click.stop="connectEmbeddedSession(connection)"
                        >
                          SSH2
                        </button>
                      </template>
                      <button
                        v-else
                        class="ssh-plain-icon-btn ssh-connect-icon-btn"
                        title="打开 CMD"
                        aria-label="打开 CMD"
                        @click.stop="openCmdBookmark(connection)"
                      >
                        <img :src="connectIcon" alt="" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section
          class="ssh-delete-dropzone"
          :data-active="isDeleteDropActive ? 'true' : 'false'"
          @dragover.prevent="handleDeleteDragOver"
          @dragleave.prevent="handleDeleteDragLeave"
          @drop.prevent="handleDeleteDrop"
        >
          <div class="ssh-delete-drop-title">{{ deleteDropTitle }}</div>
          <div class="ssh-delete-drop-text">将分组、SSH 连接或 CMD 收藏拖动到这里删除</div>
        </section>
      </aside>

      <main class="ssh-workspace">
        <div class="ssh-tabs-bar">
          <div
            class="ssh-tabs"
            @dragover.prevent="handleSessionTabsDragOver"
            @drop.prevent="handleSessionTabsDrop"
          >
            <div v-if="sessionTabs.length === 0" class="ssh-tabs-empty">暂无终端会话</div>

            <button
              v-for="tab in sessionTabs"
              :key="tab.sessionId"
              class="ssh-tab"
              :class="{ active: activeSessionId === tab.sessionId }"
              :data-dragging="draggingSessionId === tab.sessionId ? 'true' : 'false'"
              :data-drop-target="sessionDropTarget.sessionId === tab.sessionId ? sessionDropTarget.position : ''"
              draggable="true"
              @click="setActiveSession(tab.sessionId)"
              @dragstart="handleSessionTabDragStart(tab.sessionId, $event)"
              @dragover.prevent="handleSessionTabDragOver(tab.sessionId, $event)"
              @drop.stop.prevent="handleSessionTabDrop(tab.sessionId)"
              @dragend="handleSessionTabDragEnd"
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
            <button
              v-if="activeSession?.type === 'ssh'"
              class="ssh-btn mini"
              :disabled="!canUploadToActiveSession"
              @click="openDownloadDialog"
            >
              下载文件
            </button>
          </div>
        </div>

        <div
          ref="terminalStageRef"
          class="ssh-terminal-stage"
          @dragenter="handleTerminalDragEnter"
          @dragover="handleTerminalDragOver"
          @dragleave="handleTerminalDragLeave"
          @drop="handleTerminalFileDrop"
        >
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

          <div
            v-if="isTerminalDropActive"
            class="ssh-terminal-dropzone"
            :data-enabled="canUploadToActiveSession ? 'true' : 'false'"
          >
            <div class="ssh-terminal-drop-title">
              {{ canUploadToActiveSession ? '释放以上传文件' : '当前会话不支持拖动上传' }}
            </div>
            <div class="ssh-terminal-drop-text">
              {{ canUploadToActiveSession ? '文件将上传到远程主目录，并显示实时进度' : '请先连接一个 SSH 会话' }}
            </div>
          </div>

          <div v-if="activeUploadItems.length > 0" class="ssh-upload-panel">
            <div
              v-for="item in activeUploadItems"
              :key="item.id"
              class="ssh-upload-item"
              :data-status="item.status"
            >
              <div class="ssh-upload-topline">
                <span class="ssh-upload-direction" :data-direction="item.direction">{{ item.directionLabel }}</span>
                <span class="ssh-upload-name" :title="item.fileName">{{ item.fileName }}</span>
                <span class="ssh-upload-percent">{{ item.progressText }}</span>
              </div>
              <div class="ssh-upload-track">
                <div class="ssh-upload-bar" :style="{ width: `${item.progress}%` }"></div>
              </div>
              <div class="ssh-upload-meta" :title="item.detailText">{{ item.detailText }}</div>
            </div>
          </div>
        </div>

        <div class="ssh-status-bar">
          <span>{{ activeSessionStatusText }}</span>
          <span v-if="activeSession">{{ activeSession.target }}</span>
        </div>
      </main>
    </section>

    <div
      v-if="showSaveCmdDialog"
      class="ssh-dialog-overlay"
      @pointerdown.self="armOverlayClose('saveCmd')"
      @pointerup.self="handleOverlayPointerUp('saveCmd', closeSaveCmdDialog)"
    >
      <div class="ssh-dialog small">
        <div class="ssh-dialog-head">
          <div>
            <div class="editor-title">{{ cmdBookmarkDraft.id ? '编辑 CMD' : '保存 CMD' }}</div>
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

    <div
      v-if="showDownloadDialog"
      class="ssh-dialog-overlay"
      @pointerdown.self="armOverlayClose('download')"
      @pointerup.self="handleOverlayPointerUp('download', closeDownloadDialog)"
    >
      <div class="ssh-dialog ssh-download-dialog">
        <div class="ssh-dialog-head">
          <div>
            <div class="editor-title">下载服务器文件</div>
            <div class="editor-target">{{ activeSession?.target || '当前 SSH 会话' }}</div>
          </div>
          <button class="ssh-dialog-close" @click="closeDownloadDialog">×</button>
        </div>

        <div class="ssh-download-toolbar">
          <label class="ssh-field ssh-download-path-field">
            <span>当前目录</span>
            <input
              :value="downloadDraft.currentPath || '加载中...'"
              type="text"
              readonly
            />
          </label>
          <div class="ssh-download-toolbar-actions">
            <button class="ssh-btn mini" :disabled="!downloadDraft.parentPath || downloadDraft.loading" @click="navigateDownloadParent">上一级</button>
            <button class="ssh-btn mini" :disabled="downloadDraft.loading" @click="refreshDownloadDirectory()">刷新</button>
          </div>
        </div>

        <div class="ssh-download-tip">单击文件立即下载，单击文件夹进入该目录。</div>

        <div v-if="downloadDraft.loading" class="ssh-download-empty">正在加载服务器文件...</div>
        <div v-else-if="downloadDialogEntries.length === 0" class="ssh-download-empty">当前目录没有可显示的文件。</div>
        <div v-else class="ssh-download-list">
          <button
            v-for="entry in downloadDialogEntries"
            :key="entry.path"
            class="ssh-download-entry"
            :data-kind="entry.isDirectory ? 'directory' : 'file'"
            @click="handleDownloadEntry(entry)"
          >
            <span class="ssh-download-entry-icon">{{ entry.isDirectory ? 'DIR' : 'FILE' }}</span>
            <span class="ssh-download-entry-name" :title="entry.name">{{ entry.name }}</span>
            <span class="ssh-download-entry-size">{{ entry.sizeText }}</span>
            <span class="ssh-download-entry-time">{{ entry.timeText }}</span>
          </button>
        </div>

        <div class="ssh-editor-actions">
          <button class="ssh-btn" @click="closeDownloadDialog">取消</button>
        </div>
      </div>
    </div>

    <div
      v-if="showEditorDialog"
      class="ssh-dialog-overlay"
      @pointerdown.self="armOverlayClose('editor')"
      @pointerup.self="handleOverlayPointerUp('editor', closeConnectionEditor)"
    >
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

        <label class="ssh-field">
          <span>登录密码</span>
          <input
            v-model="editorDraft.password"
            type="password"
            autocomplete="current-password"
            placeholder="可留空；与私钥二选一，同时填写时优先使用私钥"
          />
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
          <button class="ssh-btn" @click="handleSaveAndConnectEmbedded">保存并 SSH2 连接</button>
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
import connectIcon from '../icon/connect.svg'
import { useAppStore } from '../stores/app'
import { generateId } from '../utils/tools'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const connections = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedConnectionId = ref('')
const selectedCmdBookmarkId = ref('')
const draft = ref(createDraft())
const themeMode = ref(localStorage.getItem('ssh-theme-mode') || 'dark')
const groups = ref([])
const connectionGroupMap = ref({})
const connectionOrderMap = ref({})
const collapsedGroups = ref({})
const newGroupName = ref('')
const showGroupCreator = ref(false)
const groupCreateInputRef = ref(null)
const draggingGroupId = ref('')
const draggingItem = ref(null)
const isDeleteDropActive = ref(false)
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
const showDownloadDialog = ref(false)
const downloadDraft = ref({
  currentPath: '',
  parentPath: '',
  loading: false,
  entries: []
})
const overlayCloseArmed = ref({
  saveCmd: false,
  download: false,
  editor: false
})

const sessionTabs = ref([])
const activeSessionId = ref('')
const draggingSessionId = ref('')
const sessionDropTarget = ref({
  sessionId: '',
  position: ''
})
const terminalStageRef = ref(null)
const isTerminalDropActive = ref(false)
const terminalDragDepth = ref(0)
const uploadTasks = ref({})

const terminalControllers = new Map()
const terminalHostRefs = new Map()
const pendingSessionEvents = new Map()
const ignoredSessionIds = new Set()
const uploadCleanupTimers = new Map()
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

const canUploadToActiveSession = computed(() => {
  return activeSession.value?.type === 'ssh' && activeSession.value?.status === 'connected'
})

const deleteDropTitle = computed(() => {
  if (draggingGroupId.value) return isDeleteDropActive.value ? '释放以删除分组' : '拖动到此删除分组'
  if (draggingItem.value?.itemType === 'ssh') return isDeleteDropActive.value ? '释放以删除 SSH 连接' : '拖动到此删除 SSH 连接'
  if (draggingItem.value?.itemType === 'cmd') return isDeleteDropActive.value ? '释放以删除 CMD 收藏' : '拖动到此删除 CMD 收藏'
  return '拖动到此删除'
})

const activeUploadItems = computed(() => {
  return Object.values(uploadTasks.value)
    .filter(item => item.sessionId === activeSessionId.value)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 6)
    .map((item) => {
      const progress = clampNumber(Number(item.progress) || 0, 0, 100)
      const transferredText = item.totalBytes > 0
        ? `${formatByteSize(item.transferredBytes || 0)} / ${formatByteSize(item.totalBytes || 0)}`
        : getUploadStatusLabel(item)
      const direction = item.direction === 'download' ? 'download' : 'upload'
      const isInProgress = item.status === 'queued' || item.status === 'uploading' || item.status === 'downloading'
      const detailText = isInProgress
        ? (item.message || transferredText || item.remotePath || item.localPath || '')
        : (item.message || item.localPath || item.remotePath || transferredText)
      return {
        ...item,
        direction,
        directionLabel: direction === 'download' ? '下载' : '上传',
        progress,
        progressText: item.status === 'completed' ? '100%' : `${progress.toFixed(progress % 1 === 0 ? 0 : 1)}%`,
        detailText
      }
    })
})

const downloadDialogEntries = computed(() => {
  return (Array.isArray(downloadDraft.value.entries) ? downloadDraft.value.entries : []).map((entry) => {
    return {
      ...entry,
      typeLabel: entry.isDirectory ? '文件夹' : '文件',
      sizeText: entry.isDirectory ? '文件夹' : formatByteSize(entry.size || 0),
      timeText: formatTime(entry.mtime) || '--'
    }
  })
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
    password: connection?.password || '',
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
    password: connection.password === undefined || connection.password === null ? '' : String(connection.password),
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

function formatByteSize(bytes) {
  const value = Number(bytes || 0)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const precision = size >= 100 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(precision)} ${units[unitIndex]}`
}

function getUploadStatusLabel(task) {
  if (!task) return ''
  const isDownload = task.direction === 'download'
  if (task.status === 'queued') return isDownload ? '等待下载' : '等待上传'
  if (task.status === 'uploading') {
    if (task.totalBytes > 0) {
      return `${formatByteSize(task.transferredBytes || 0)} / ${formatByteSize(task.totalBytes || 0)}`
    }
    return '上传中'
  }
  if (task.status === 'downloading') {
    if (task.totalBytes > 0) {
      return `${formatByteSize(task.transferredBytes || 0)} / ${formatByteSize(task.totalBytes || 0)}`
    }
    return '下载中'
  }
  if (task.status === 'completed') return task.remotePath || (isDownload ? '下载完成' : '上传完成')
  if (task.status === 'error') return task.message || (isDownload ? '下载失败' : '上传失败')
  return task.message || ''
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

function hasDraggedFiles(event) {
  const types = Array.from(event?.dataTransfer?.types || [])
  return types.includes('Files')
}

function resetTerminalDragState() {
  terminalDragDepth.value = 0
  isTerminalDropActive.value = false
}

function resetDeleteDropState() {
  isDeleteDropActive.value = false
}

function clearDragState() {
  draggingGroupId.value = ''
  draggingItem.value = null
  resetDeleteDropState()
}

function resetOverlayCloseState() {
  overlayCloseArmed.value.saveCmd = false
  overlayCloseArmed.value.download = false
  overlayCloseArmed.value.editor = false
}

function armOverlayClose(key) {
  if (!overlayCloseArmed.value[key]) {
    overlayCloseArmed.value[key] = true
  }
}

function handleOverlayPointerUp(key, closeHandler) {
  const shouldClose = Boolean(overlayCloseArmed.value[key])
  resetOverlayCloseState()
  if (shouldClose) {
    closeHandler()
  }
}

function extractDroppedLocalPaths(event) {
  const fileList = Array.from(event?.dataTransfer?.files || [])
  return Array.from(new Set(fileList
    .map(file => String(file?.path || '').trim())
    .filter(Boolean)))
}

function clearUploadCleanupTimer(uploadId) {
  const timer = uploadCleanupTimers.get(uploadId)
  if (timer) {
    clearTimeout(timer)
    uploadCleanupTimers.delete(uploadId)
  }
}

function removeUploadTask(uploadId) {
  clearUploadCleanupTimer(uploadId)
  const nextTasks = { ...uploadTasks.value }
  delete nextTasks[uploadId]
  uploadTasks.value = nextTasks
}

function scheduleUploadTaskCleanup(uploadId, delay = 5000) {
  clearUploadCleanupTimer(uploadId)
  const timer = setTimeout(() => {
    removeUploadTask(uploadId)
  }, delay)
  uploadCleanupTimers.set(uploadId, timer)
}

function handleTerminalDragEnter(event) {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  terminalDragDepth.value += 1
  isTerminalDropActive.value = true
}

function handleTerminalDragOver(event) {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = canUploadToActiveSession.value ? 'copy' : 'none'
  }
  isTerminalDropActive.value = true
}

function handleTerminalDragLeave(event) {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  terminalDragDepth.value = Math.max(terminalDragDepth.value - 1, 0)
  if (terminalDragDepth.value === 0) {
    isTerminalDropActive.value = false
  }
}

async function handleTerminalFileDrop(event) {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  event.stopPropagation()
  resetTerminalDragState()

  if (!canUploadToActiveSession.value) {
    appStore.toast('请先连接一个 SSH 会话再拖动上传', 'warning')
    return
  }

  const localPaths = extractDroppedLocalPaths(event)
  if (!localPaths.length) {
    appStore.toast('未识别到可上传的本地文件', 'warning')
    return
  }

  if (!electronAPI?.uploadSshSessionFiles) {
    appStore.toast('当前环境不支持拖动上传文件', 'warning')
    return
  }

  const result = await electronAPI.uploadSshSessionFiles(activeSessionId.value, localPaths)
  if (!result?.success) {
    appStore.toast(result?.error || '开始上传失败', 'error')
    return
  }

  appStore.toast(`已开始上传 ${result.acceptedCount || localPaths.length} 个文件`, 'success')
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

function toggleGroupCreator() {
  showGroupCreator.value = !showGroupCreator.value
  if (!showGroupCreator.value) {
    newGroupName.value = ''
    return
  }

  nextTick(() => {
    groupCreateInputRef.value?.focus?.()
  })
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
  if (selectedCmdBookmarkId.value && !cmdBookmarks.value.some(item => item.id === selectedCmdBookmarkId.value)) {
    selectedCmdBookmarkId.value = ''
  }
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
    if (selectedCmdBookmarkId.value && !cmdBookmarks.value.some(item => item.id === selectedCmdBookmarkId.value)) {
      selectedCmdBookmarkId.value = ''
    }
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
  showGroupCreator.value = false
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

async function deleteConnectionById(connectionId) {
  if (!electronAPI?.deleteSshConnection) {
    appStore.toast('当前环境不支持删除 SSH 连接', 'warning')
    return false
  }

  const normalizedId = String(connectionId || '').trim()
  if (!normalizedId) {
    appStore.toast('请先选择要删除的连接', 'warning')
    return false
  }

  const connection = connections.value.find(item => item.id === normalizedId)
  if (!connection) return false

  const confirmed = await appStore.confirm(`确定删除 SSH 连接“${connection.name}”吗？`)
  if (!confirmed) return false

  const result = await electronAPI.deleteSshConnection(connection.id)
  if (!result?.success) {
    appStore.toast(result?.error || '删除失败', 'error')
    return false
  }

  connections.value = connections.value.filter(item => item.id !== connection.id)
  const nextMap = { ...connectionGroupMap.value }
  delete nextMap[connection.id]
  connectionGroupMap.value = nextMap
  await persistGroupSettings()

  if (selectedConnectionId.value === connection.id) {
    const nextConnectionId = connections.value[0]?.id || ''
    if (nextConnectionId) {
      selectConnection(nextConnectionId)
    } else {
      selectedConnectionId.value = ''
      draft.value = createDraft()
    }
  }

  appStore.toast('SSH 连接已删除', 'success')
  return true
}

async function deleteCmdBookmarkById(bookmarkId) {
  const normalizedId = String(bookmarkId || '').trim()
  if (!normalizedId) {
    appStore.toast('请先选择要删除的 CMD 收藏', 'warning')
    return false
  }

  const bookmark = cmdBookmarks.value.find(item => item.id === normalizedId)
  if (!bookmark) {
    if (selectedCmdBookmarkId.value === normalizedId) {
      selectedCmdBookmarkId.value = ''
    }
    return false
  }

  const confirmed = await appStore.confirm(`确定删除 CMD 收藏“${bookmark.name}”吗？`)
  if (!confirmed) return false

  const remainingBookmarks = cmdBookmarks.value
    .filter(item => item.id !== bookmark.id)
    .map((item, index) => ({
      ...item,
      order: index
    }))

  cmdBookmarks.value = remainingBookmarks
  if (selectedCmdBookmarkId.value === bookmark.id) {
    selectedCmdBookmarkId.value = remainingBookmarks[0]?.id || ''
  }
  await persistGroupSettings()
  appStore.toast('CMD 收藏已删除', 'success')
  return true
}

function handleGroupDragStart(groupId) {
  draggingGroupId.value = groupId
  draggingItem.value = null
  isDeleteDropActive.value = false
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
  clearDragState()
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
  draggingGroupId.value = ''
  draggingItem.value = {
    itemType,
    itemId,
    groupKey
  }
  isDeleteDropActive.value = false
}

function handleDragEnd() {
  clearDragState()
}

function handleDeleteDragOver() {
  if (!draggingGroupId.value && !draggingItem.value) return
  isDeleteDropActive.value = true
}

function handleDeleteDragLeave(event) {
  const nextTarget = event?.relatedTarget
  if (nextTarget && event?.currentTarget?.contains?.(nextTarget)) return
  resetDeleteDropState()
}

async function handleDeleteDrop() {
  const draggingGroup = draggingGroupId.value
  const draggingPayload = draggingItem.value ? { ...draggingItem.value } : null
  clearDragState()

  if (draggingGroup) {
    await deleteGroup(draggingGroup)
    return
  }

  if (!draggingPayload) return

  if (draggingPayload.itemType === 'ssh') {
    await deleteConnectionById(draggingPayload.itemId)
    return
  }

  if (draggingPayload.itemType === 'cmd') {
    await deleteCmdBookmarkById(draggingPayload.itemId)
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

  clearDragState()
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

  clearDragState()
  await persistGroupSettings()
}

function openSaveCmdDialog(path = '', bookmark = null) {
  const normalizedPath = String(bookmark?.path || path || '').trim()
  const defaultName = String(bookmark?.name || '').trim() || (normalizedPath ? normalizedPath.split(/[\\/]/).filter(Boolean).pop() || 'CMD' : 'CMD')
  cmdBookmarkDraft.value = {
    id: String(bookmark?.id || ''),
    name: defaultName,
    path: normalizedPath
  }
  showSaveCmdDialog.value = true
}

function openCmdBookmarkEditor(bookmark) {
  if (!bookmark) return
  selectedConnectionId.value = ''
  selectedCmdBookmarkId.value = String(bookmark.id)
  openSaveCmdDialog(bookmark.path, bookmark)
}

function openDownloadDialog() {
  if (!canUploadToActiveSession.value) {
    appStore.toast('请先连接一个 SSH 会话', 'warning')
    return
  }

  downloadDraft.value = {
    currentPath: '',
    parentPath: '',
    loading: true,
    entries: []
  }
  showDownloadDialog.value = true
  void refreshDownloadDirectory()
}

function closeDownloadDialog() {
  resetOverlayCloseState()
  showDownloadDialog.value = false
  downloadDraft.value = {
    currentPath: '',
    parentPath: '',
    loading: false,
    entries: []
  }
}

function closeSaveCmdDialog() {
  resetOverlayCloseState()
  showSaveCmdDialog.value = false
  cmdBookmarkDraft.value = {
    id: '',
    name: '',
    path: ''
  }
}

async function saveCmdBookmark() {
  const bookmarkId = String(cmdBookmarkDraft.value.id || '').trim()
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

  if (bookmarkId) {
    cmdBookmarks.value = cmdBookmarks.value.map((item, index) => {
      if (item.id !== bookmarkId) {
        return {
          ...item,
          order: Number.isFinite(item.order) ? item.order : index
        }
      }
      return {
        ...item,
        id: bookmarkId,
        name,
        path,
        order: Number.isFinite(item.order) ? item.order : index
      }
    })
    selectedCmdBookmarkId.value = bookmarkId
  } else {
    const newBookmarkId = generateId()
    cmdBookmarks.value = [
      ...cmdBookmarks.value,
      {
        id: newBookmarkId,
        name,
        path,
        order: cmdBookmarks.value.length
      }
    ]
    selectedConnectionId.value = ''
    selectedCmdBookmarkId.value = newBookmarkId
  }

  await persistGroupSettings()
  closeSaveCmdDialog()
  appStore.toast(bookmarkId ? 'CMD 收藏已更新' : 'CMD 收藏已保存', 'success')
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

async function refreshDownloadDirectory(targetPath = downloadDraft.value.currentPath || '') {
  if (!canUploadToActiveSession.value) {
    return false
  }

  if (!electronAPI?.listSshSessionFiles) {
    appStore.toast('当前环境不支持读取服务器文件列表', 'warning')
    return false
  }

  downloadDraft.value = {
    ...downloadDraft.value,
    loading: true
  }

  const result = await electronAPI.listSshSessionFiles(activeSessionId.value, targetPath)
  if (!result?.success) {
    downloadDraft.value = {
      ...downloadDraft.value,
      loading: false
    }
    appStore.toast(result?.error || '读取服务器文件列表失败', 'error')
    return false
  }

  downloadDraft.value = {
    currentPath: String(result.currentPath || ''),
    parentPath: String(result.parentPath || ''),
    loading: false,
    entries: Array.isArray(result.entries) ? result.entries : []
  }
  return true
}

async function navigateDownloadParent() {
  if (!downloadDraft.value.parentPath) return
  await refreshDownloadDirectory(downloadDraft.value.parentPath)
}

async function handleDownloadEntry(entry) {
  if (!entry) return
  if (entry.isDirectory) {
    await refreshDownloadDirectory(entry.path)
    return
  }

  if (!electronAPI?.downloadSshSessionFile) {
    appStore.toast('当前环境不支持下载服务器文件', 'warning')
    return
  }

  const result = await electronAPI.downloadSshSessionFile(activeSessionId.value, entry.path)
  if (result?.canceled) return
  if (!result?.success) {
    appStore.toast(result?.error || '启动下载失败', 'error')
    return
  }

  appStore.toast(`已开始下载 ${result.fileName}`, 'success')
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
  selectedCmdBookmarkId.value = ''
  selectedConnectionId.value = connection.id
  draft.value = createDraft(connection)
}

function selectCmdBookmark(bookmarkId) {
  const bookmark = cmdBookmarks.value.find(item => item.id === String(bookmarkId))
  if (!bookmark) return
  selectedConnectionId.value = ''
  selectedCmdBookmarkId.value = bookmark.id
}

function resetSelection() {
  selectedConnectionId.value = ''
  selectedCmdBookmarkId.value = ''
  draft.value = createDraft()
}

function handleCreateConnection() {
  editingConnectionId.value = ''
  editorDraft.value = createDraft()
  showEditorDialog.value = true
}

function openConnectionEditor(connection) {
  if (!connection) return
  selectedCmdBookmarkId.value = ''
  editingConnectionId.value = String(connection.id)
  editorDraft.value = createDraft({
    ...connection,
    groupId: connectionGroupMap.value[connection.id] || ''
  })
  showEditorDialog.value = true
}

function closeConnectionEditor() {
  resetOverlayCloseState()
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

function resetSessionTabDragState() {
  draggingSessionId.value = ''
  sessionDropTarget.value = {
    sessionId: '',
    position: ''
  }
}

function moveSessionTab(sessionId, targetSessionId, position = 'before') {
  const sourceId = String(sessionId || '')
  if (!sourceId) return

  const sourceIndex = sessionTabs.value.findIndex(item => item.sessionId === sourceId)
  if (sourceIndex < 0) return

  const nextTabs = [...sessionTabs.value]
  const [movedTab] = nextTabs.splice(sourceIndex, 1)
  if (!movedTab) return

  const normalizedTargetId = String(targetSessionId || '')
  if (!normalizedTargetId) {
    nextTabs.push(movedTab)
    sessionTabs.value = nextTabs
    return
  }

  let targetIndex = nextTabs.findIndex(item => item.sessionId === normalizedTargetId)
  if (targetIndex < 0) {
    nextTabs.push(movedTab)
    sessionTabs.value = nextTabs
    return
  }

  if (position === 'after') {
    targetIndex += 1
  }

  nextTabs.splice(targetIndex, 0, movedTab)
  sessionTabs.value = nextTabs
}

function handleSessionTabDragStart(sessionId, event) {
  draggingSessionId.value = String(sessionId || '')
  sessionDropTarget.value = {
    sessionId: '',
    position: ''
  }

  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', draggingSessionId.value)
  }
}

function handleSessionTabDragOver(targetSessionId, event) {
  if (!draggingSessionId.value || draggingSessionId.value === targetSessionId) return

  const rect = event?.currentTarget?.getBoundingClientRect?.()
  const position = rect && Number.isFinite(event?.clientX)
    ? (event.clientX >= rect.left + rect.width / 2 ? 'after' : 'before')
    : 'before'

  sessionDropTarget.value = {
    sessionId: String(targetSessionId || ''),
    position
  }
}

function handleSessionTabDrop(targetSessionId) {
  if (!draggingSessionId.value || draggingSessionId.value === targetSessionId) {
    resetSessionTabDragState()
    return
  }

  moveSessionTab(
    draggingSessionId.value,
    targetSessionId,
    sessionDropTarget.value.position || 'before'
  )
  resetSessionTabDragState()
}

function handleSessionTabsDragOver(event) {
  if (!draggingSessionId.value) return

  const targetTab = event?.target?.closest?.('.ssh-tab')
  if (targetTab) return

  sessionDropTarget.value = {
    sessionId: '',
    position: 'append'
  }
}

function handleSessionTabsDrop() {
  if (!draggingSessionId.value) return
  moveSessionTab(draggingSessionId.value, '', 'append')
  resetSessionTabDragState()
}

function handleSessionTabDragEnd() {
  resetSessionTabDragState()
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

async function fitSessionTerminal(sessionId) {
  const controller = terminalControllers.get(String(sessionId || ''))
  if (!controller) return

  controller.fitAddon.fit()
  await resizeSession(sessionId, controller.terminal.cols, controller.terminal.rows)
}

async function fitActiveTerminal() {
  if (!activeSessionId.value) return
  await fitSessionTerminal(activeSessionId.value)
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

function focusActiveTerminal() {
  terminalControllers.get(activeSessionId.value)?.terminal?.focus()
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

  await nextTick()
  await fitActiveTerminal()
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

  if (payload.type === 'upload' || payload.type === 'download') {
    const transferId = String(payload.uploadId || payload.downloadId || '')
    if (!transferId) return

    const direction = payload.type === 'download' ? 'download' : 'upload'
    const previousTask = uploadTasks.value[transferId] || {}
    const nextTask = {
      ...previousTask,
      id: transferId,
      direction,
      sessionId: payload.sessionId,
      fileName: payload.fileName || previousTask.fileName || 'file',
      remotePath: payload.remotePath || previousTask.remotePath || '',
      localPath: payload.localPath || previousTask.localPath || '',
      message: payload.message || previousTask.message || '',
      status: payload.status || previousTask.status || 'queued',
      totalBytes: Number(payload.totalBytes ?? previousTask.totalBytes ?? 0),
      transferredBytes: Number(payload.transferredBytes ?? previousTask.transferredBytes ?? 0),
      progress: clampNumber(Number(payload.progress ?? previousTask.progress ?? 0), 0, 100),
      updatedAt: Date.now()
    }

    uploadTasks.value = {
      ...uploadTasks.value,
      [transferId]: nextTask
    }

    if (nextTask.status === 'uploading' || nextTask.status === 'downloading' || nextTask.status === 'queued') {
      clearUploadCleanupTimer(transferId)
    } else {
      scheduleUploadTaskCleanup(transferId, nextTask.status === 'completed' ? 4500 : 7000)
    }

    if (payload.message && controller?.terminal && (nextTask.status === 'completed' || nextTask.status === 'error')) {
      controller.terminal.writeln(`\r\n[TodoX] ${payload.message}`)
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

    const nextTasks = { ...uploadTasks.value }
    Object.values(nextTasks).forEach((task) => {
      if (task.sessionId !== payload.sessionId) return
      if (task.status !== 'queued' && task.status !== 'uploading' && task.status !== 'downloading') return
      nextTasks[task.id] = {
        ...task,
        status: 'error',
        message: '会话已断开，传输已中止',
        updatedAt: Date.now()
      }
      scheduleUploadTaskCleanup(task.id, 7000)
    })
    uploadTasks.value = nextTasks
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
  await connectNativeSession(savedConnection)
}

async function handleSaveAndConnectEmbedded() {
  const savedConnection = await handleSaveConnection()
  if (!savedConnection) return
  await connectEmbeddedSession(savedConnection)
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

async function connectEmbeddedSession(connection, options = {}) {
  if (!electronAPI?.connectSshSession) {
    appStore.toast('当前环境不支持 SSH2 兼容连接', 'warning')
    return
  }

  const payload = buildSessionPayload(connection)
  if (!payload) return

  if (!payload.privateKeyPath && !payload.password) {
    appStore.toast('SSH2 连接需要先配置密码或私钥', 'warning')
    return
  }

  const result = await electronAPI.connectSshSession(payload)
  if (!result?.success) {
    appStore.toast(result?.error || options.errorMessage || 'SSH2 连接失败', 'error')
    return
  }

  const isProxyConnection = payload.proxyType === 'socks5'
  const tab = {
    sessionId: result.sessionId,
    connectionId: result.connectionId || payload.id || '',
    title: payload.name || payload.host,
    target: formatTarget(payload, true),
    type: 'ssh',
    status: 'connecting',
    statusLabel: getStatusLabel('connecting'),
    message: options.message || (isProxyConnection
      ? `正在通过 SOCKS5 代理连接 ${formatTarget(payload, true)}...`
      : `正在通过 SSH2 兼容模式连接 ${formatTarget(payload, true)}...`)
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

async function connectNativeSession(connection) {
  const payload = buildSessionPayload(connection)
  if (!payload) return

  if (payload.proxyType === 'socks5') {
    await connectEmbeddedSession(payload, {
      message: `正在通过 SOCKS5 代理连接 ${formatTarget(payload, true)}...`,
      errorMessage: '通过 SOCKS5 代理连接失败'
    })
    return
  }

  if (!electronAPI?.connectSshNativeSession) {
    appStore.toast('当前环境不支持原生 SSH', 'warning')
    return
  }

  const result = await electronAPI.connectSshNativeSession(payload)
  if (!result?.success) {
    appStore.toast(result?.error || '原生 SSH 连接失败', 'error')
    return
  }

  const tab = {
    sessionId: result.sessionId,
    connectionId: result.connectionId || payload.id || '',
    title: payload.name || payload.host,
    target: formatTarget(payload, true),
    type: 'ssh-native',
    status: 'connected',
    statusLabel: getStatusLabel('connected'),
    message: `原生 SSH 已启动：${formatTarget(payload, true)}`
  }

  sessionTabs.value.push(tab)
  activeSessionId.value = tab.sessionId

  const existing = connections.value.find(item => item.id === payload.id)
  if (existing) {
    const connectedAt = new Date().toISOString()
    const updated = upsertConnection({
      ...existing,
      ...payload,
      lastConnectedAt: connectedAt,
      updatedAt: connectedAt
    })
    if (selectedConnectionId.value === updated.id) {
      draft.value = createDraft(updated)
    }
  }

  await nextTick()
  ensureTerminalController(tab.sessionId)
  const controller = terminalControllers.get(tab.sessionId)
  if (controller) {
    controller.terminal.writeln(`[TodoX] ${tab.message}`)
  }
  await fitActiveTerminal()
  focusActiveTerminal()
}

async function connectInSystemTerminal(connection) {
  if (!electronAPI?.connectSsh) {
    appStore.toast('当前环境不支持系统终端 SSH', 'warning')
    return false
  }

  const payload = buildSessionPayload(connection)
  if (!payload) return false

  const result = await electronAPI.connectSsh(payload)
  if (!result?.success) {
    appStore.toast(result?.error || '启动系统终端 SSH 失败', 'error')
    return false
  }

  const existing = connections.value.find(item => item.id === payload.id)
  if (existing) {
    const connectedAt = result.lastConnectedAt || new Date().toISOString()
    const updated = upsertConnection({
      ...existing,
      ...payload,
      lastConnectedAt: connectedAt,
      updatedAt: connectedAt
    })
    if (selectedConnectionId.value === updated.id) {
      draft.value = createDraft(updated)
    }
  }

  appStore.toast('SSH 会话已在系统终端中打开，vi/vim 建议使用此方式', 'success')
  return true
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
  window.addEventListener('pointerup', resetOverlayCloseState)
  window.addEventListener('pointercancel', resetOverlayCloseState)
  window.addEventListener('blur', resetOverlayCloseState)

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
  window.removeEventListener('pointerup', resetOverlayCloseState)
  window.removeEventListener('pointercancel', resetOverlayCloseState)
  window.removeEventListener('blur', resetOverlayCloseState)
  try { resizeObserver?.disconnect() } catch (error) {}
  uploadCleanupTimers.forEach((timer) => clearTimeout(timer))
  uploadCleanupTimers.clear()

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
  height: calc(100vh - 150px);
  min-height: calc(100vh - 150px);
  overflow: hidden;
}

.ssh-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.ssh-sidebar-top {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.ssh-sidebar-headline {
  margin-bottom: 10px;
}

.ssh-sidebar-headline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ssh-search-input,
.ssh-group-create-input,
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
.ssh-group-create-input::placeholder,
.ssh-field input::placeholder,
.ssh-field textarea::placeholder,
.ssh-select::placeholder {
  color: var(--ssh-input-placeholder);
}

.ssh-search-input:focus,
.ssh-group-create-input:focus,
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
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 82%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ssh-item-bg) 72%, transparent);
  overflow: hidden;
}

.ssh-group-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 6px;
  overflow-y: auto;
}

.ssh-group-section {
  flex-shrink: 0;
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
  position: relative;
  padding: 8px 10px;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--ssh-border-soft) 70%, transparent);
  border-radius: 0;
  box-shadow: none;
}

.ssh-connection-item.compact:first-child {
  border-top: none;
}

.ssh-connection-item.compact.active {
  background: color-mix(in srgb, var(--ssh-input-focus) 18%, var(--ssh-item-bg));
  border-top-color: color-mix(in srgb, var(--ssh-input-focus) 55%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ssh-input-focus) 42%, transparent);
}

.ssh-connection-item.compact.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 999px 999px 0;
  background: var(--ssh-accent-strong);
}

.ssh-connection-item.compact.active .ssh-connection-name.compact {
  color: var(--ssh-accent-strong);
}

.ssh-connection-line {
  display: grid;
  grid-template-columns: minmax(0, 112px) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.ssh-connection-actions-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.ssh-plain-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ssh-accent-strong);
  cursor: pointer;
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.ssh-plain-icon-btn:hover {
  opacity: 0.82;
  transform: translateY(-1px);
}

.ssh-plain-icon-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ssh-input-focus) 28%, transparent);
  border-radius: 8px;
}

.ssh-inline-action-btn {
  height: 28px;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 88%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ssh-item-bg) 88%, transparent);
  color: var(--ssh-text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.ssh-inline-action-btn:hover {
  color: var(--ssh-accent-strong);
  border-color: color-mix(in srgb, var(--ssh-input-focus) 58%, transparent);
  transform: translateY(-1px);
}

.ssh-inline-action-btn:focus-visible {
  outline: none;
  border-color: var(--ssh-input-focus);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ssh-input-focus) 24%, transparent);
}

.ssh-connect-icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
}

.ssh-connect-icon-btn img {
  display: block;
  width: 18px;
  height: 18px;
}

.group-add-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  font-size: 24px;
  line-height: 1;
  color: var(--ssh-accent);
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

.ssh-download-dialog {
  width: min(900px, 100%);
}

.ssh-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.ssh-download-toolbar {
  display: flex;
  align-items: end;
  gap: 10px;
}

.ssh-download-path-field {
  flex: 1;
  min-width: 0;
}

.ssh-download-toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ssh-download-tip {
  margin-top: 10px;
  color: var(--ssh-text-muted);
  font-size: 12px;
}

.ssh-download-empty {
  padding: 18px 6px;
  color: var(--ssh-text-muted);
  font-size: 13px;
}

.ssh-download-list {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 80%, transparent);
  border-radius: 12px;
  overflow: hidden;
}

.ssh-download-entry {
  width: 100%;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 100px 150px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--ssh-border-soft) 72%, transparent);
  background: var(--ssh-item-bg);
  color: var(--ssh-text-main);
  text-align: left;
  cursor: pointer;
}

.ssh-download-entry:first-child {
  border-top: none;
}

.ssh-download-entry:hover {
  background: color-mix(in srgb, var(--ssh-input-focus) 14%, var(--ssh-item-bg));
}

.ssh-download-entry[data-kind='directory'] {
  background: color-mix(in srgb, var(--ssh-group-header-bg) 65%, var(--ssh-item-bg));
}

.ssh-download-entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  padding: 3px 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 85%, transparent);
  color: var(--ssh-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.ssh-download-entry[data-kind='directory'] .ssh-download-entry-icon {
  color: var(--ssh-accent-strong);
  border-color: color-mix(in srgb, var(--ssh-input-focus) 60%, transparent);
}

.ssh-download-entry-name,
.ssh-download-entry-size,
.ssh-download-entry-time {
  min-width: 0;
  font-size: 12px;
}

.ssh-download-entry-name {
  color: var(--ssh-text-strong);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssh-download-entry-size,
.ssh-download-entry-time {
  color: var(--ssh-text-muted);
  font-family: 'Consolas', 'Courier New', monospace;
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
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.ssh-tabs-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ssh-tabs {
  display: flex;
  align-items: center;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 0;
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
  user-select: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.ssh-tab.active {
  border-color: var(--ssh-input-focus);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ssh-input-focus) 38%, transparent);
}

.ssh-tab[data-dragging='true'] {
  opacity: 0.45;
}

.ssh-tab[data-drop-target='before'] {
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--ssh-accent-strong) 75%, transparent);
}

.ssh-tab[data-drop-target='after'] {
  box-shadow: inset -3px 0 0 color-mix(in srgb, var(--ssh-accent-strong) 75%, transparent);
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

.ssh-terminal-dropzone {
  position: absolute;
  inset: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 2px dashed rgba(126, 220, 255, 0.58);
  border-radius: 16px;
  background: rgba(8, 14, 25, 0.92);
  z-index: 5;
  pointer-events: none;
  text-align: center;
  padding: 24px;
}

.ssh-terminal-dropzone[data-enabled='false'] {
  border-color: rgba(255, 158, 194, 0.45);
}

.ssh-terminal-drop-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ssh-text-strong);
}

.ssh-terminal-drop-text {
  max-width: 420px;
  color: var(--ssh-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.ssh-upload-panel {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: min(340px, calc(100% - 24px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 4;
  pointer-events: none;
}

.ssh-upload-item {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 85%, transparent);
  border-radius: 12px;
  background: rgba(8, 13, 23, 0.96);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}

.ssh-upload-item[data-status='completed'] {
  border-color: color-mix(in srgb, #73f0a2 60%, var(--ssh-border-soft));
}

.ssh-upload-item[data-status='error'] {
  border-color: color-mix(in srgb, var(--ssh-danger) 68%, var(--ssh-border-soft));
}

.ssh-upload-topline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ssh-upload-direction {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 80%, transparent);
  background: color-mix(in srgb, var(--ssh-item-bg) 55%, transparent);
  color: var(--ssh-text-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.ssh-upload-direction[data-direction='download'] {
  color: var(--ssh-accent-strong);
}

.ssh-upload-name {
  min-width: 0;
  flex: 1;
  color: var(--ssh-text-strong);
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssh-upload-percent {
  flex-shrink: 0;
  color: var(--ssh-accent-strong);
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.ssh-upload-track {
  margin-top: 8px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.ssh-upload-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #69c9ff 0%, #87e0ff 100%);
  transition: width 0.18s ease;
}

.ssh-upload-item[data-status='completed'] .ssh-upload-bar {
  background: linear-gradient(90deg, #4ade80 0%, #73f0a2 100%);
}

.ssh-upload-item[data-status='error'] .ssh-upload-bar {
  background: linear-gradient(90deg, #ff7c9d 0%, #ff9ec2 100%);
}

.ssh-upload-meta {
  margin-top: 8px;
  color: var(--ssh-text-muted);
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
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

.top-create-row {
  margin-top: 10px;
}

.group-create-card {
  width: 100%;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--ssh-border-soft) 82%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--ssh-group-header-bg) 42%, var(--ssh-item-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ssh-group-header-border) 22%, transparent);
}

.group-create-card-head {
  margin-bottom: 10px;
}

.group-create-card-title {
  color: var(--ssh-text-strong);
  font-size: 12px;
  font-weight: 700;
}

.group-create-card-desc {
  margin-top: 4px;
  color: var(--ssh-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.group-create-form {
  grid-template-columns: minmax(0, 1fr) auto;
}

.ssh-group-create-input {
  min-height: 38px;
  background: color-mix(in srgb, var(--ssh-input-bg) 92%, var(--ssh-surface));
}

.ssh-delete-dropzone {
  flex-shrink: 0;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px dashed color-mix(in srgb, var(--ssh-danger) 55%, var(--ssh-border-soft));
  border-radius: 12px;
  background: color-mix(in srgb, var(--ssh-item-bg) 82%, transparent);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.ssh-delete-dropzone[data-active='true'] {
  border-color: color-mix(in srgb, var(--ssh-danger) 82%, var(--ssh-border-soft));
  background: color-mix(in srgb, var(--ssh-danger) 12%, var(--ssh-item-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ssh-danger) 32%, transparent);
}

.ssh-delete-drop-title {
  color: var(--ssh-text-strong);
  font-size: 12px;
  font-weight: 700;
}

.ssh-delete-drop-text {
  margin-top: 4px;
  color: var(--ssh-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ssh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 1200px) {
  .ssh-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
    overflow: visible;
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

  .ssh-upload-panel {
    left: 12px;
    right: 12px;
    width: auto;
  }

  .ssh-download-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .ssh-download-entry {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .ssh-download-entry-size,
  .ssh-download-entry-time {
    display: none;
  }
}
</style>
