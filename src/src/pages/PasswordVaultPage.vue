<template>
  <div class="vault-page">
    <section class="vault-group-panel">
      <div class="vault-panel-header">
        <div class="vault-panel-title">密码本分组</div>
        <button class="vault-primary-btn" @click="createGroup">添加分组</button>
      </div>

      <div v-if="!isLoaded" class="vault-empty-panel compact">
        正在加载密码本...
      </div>

      <template v-else>
        <div class="vault-chip-list">
          <template v-for="group in sortedGroups" :key="group.id">
            <div
              v-if="editingGroupId === String(group.id)"
              class="vault-chip vault-chip-editing"
            >
              <input
                v-model="editingGroupName"
                class="vault-chip-input"
                type="text"
                maxlength="30"
                @keyup.enter="saveEditingGroup"
                @keyup.esc="cancelEditingGroup"
              />
              <button class="vault-chip-action save" @click="saveEditingGroup">保存</button>
              <button class="vault-chip-action" @click="cancelEditingGroup">取消</button>
            </div>

            <button
              v-else
              class="vault-chip"
              :class="{ active: String(group.id) === String(currentGroupId) }"
              @click="passwordVaultStore.selectGroup(group.id)"
            >
              <span class="vault-chip-name">{{ group.name }}</span>
              <span class="vault-chip-count">{{ getGroupEntryCount(group.id) }}</span>
              <span class="vault-chip-tools">
                <span class="vault-chip-tool" @click.stop="startEditingGroup(group)">重命名</span>
                <span class="vault-chip-tool danger" @click.stop="passwordVaultStore.deletePasswordGroup(group.id)">删除</span>
              </span>
            </button>
          </template>
        </div>

        <div class="vault-group-creator">
          <input
            v-model="newGroupName"
            class="vault-inline-input"
            type="text"
            maxlength="30"
            placeholder="新建分组，例如 Google"
            @keyup.enter="createGroup"
          />
        </div>

        <div v-if="sortedGroups.length === 0" class="vault-empty-panel compact">
          还没有分组，先创建一个就可以开始录入。
        </div>
      </template>
    </section>

    <template v-if="selectedGroup">
      <section class="vault-table-panel">
        <div class="vault-table-topbar">
          <div class="vault-panel-title">{{ selectedGroup.name }}</div>
          <input
            v-model="searchQuery"
            class="vault-search-input"
            placeholder="搜索账号、网址或备注..."
          />
        </div>

        <div class="vault-table-shell">
          <table class="vault-table">
            <thead>
              <tr>
                <th>账号</th>
                <th>密码</th>
                <th>2FA</th>
                <th>网址</th>
                <th>备注</th>
                <th>更新于</th>
                <th class="actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr class="vault-new-row">
                <td>
                  <input
                    v-model="newEntry.account"
                    class="vault-cell-input"
                    type="text"
                    maxlength="100"
                    placeholder="账号，可留空"
                    @keyup.enter="createEntry"
                  />
                </td>
                <td>
                  <div class="vault-cell-stack">
                    <input
                      v-model="newEntry.password"
                      class="vault-cell-input"
                      type="text"
                      maxlength="200"
                      placeholder="输入密码"
                      @keyup.enter="createEntry"
                    />
                    <button class="vault-secondary-btn small" @click="fillRandomPassword(newEntry)">随机</button>
                  </div>
                </td>
                <td>
                  <div class="vault-cell-stack">
                    <input
                      v-model="newEntry.totpSecret"
                      class="vault-cell-input"
                      type="text"
                      maxlength="2000"
                      placeholder="2FA 密钥、otpauth 链接或 JSON 备份"
                      @keyup.enter="createEntry"
                    />
                    <div class="vault-action-row">
                      <button class="vault-secondary-btn small ghost" @click="previewNewEntryTotp">验证码</button>
                      <button class="vault-secondary-btn small ghost" @click="importNewEntryTotp">导入</button>
                    </div>
                  </div>
                </td>
                <td>
                  <input
                    v-model="newEntry.website"
                    class="vault-cell-input"
                    type="text"
                    maxlength="300"
                    placeholder="https://example.com"
                    @keyup.enter="createEntry"
                  />
                </td>
                <td>
                  <textarea
                    v-model="newEntry.note"
                    class="vault-cell-input vault-note-input"
                    maxlength="1000"
                    placeholder="备注"
                  ></textarea>
                </td>
                <td class="muted">新增中</td>
                <td class="actions">
                  <button class="vault-primary-btn small" @click="createEntry">添加</button>
                </td>
              </tr>

              <tr v-if="filteredEntries.length === 0">
                <td colspan="7" class="vault-table-empty">
                  {{ searchQuery ? '没有匹配记录' : '当前分组还没有记录，直接在上面一行开始录入。' }}
                </td>
              </tr>

              <tr v-for="entry in filteredEntries" :key="entry.id">
                <template v-if="editingEntryId === String(entry.id)">
                  <td>
                    <input
                      v-model="editingEntry.account"
                      class="vault-cell-input"
                      type="text"
                      maxlength="100"
                      @keyup.enter="saveEditingEntry"
                      @keyup.esc="cancelEditingEntry"
                    />
                  </td>
                  <td>
                    <div class="vault-cell-stack">
                      <input
                        v-model="editingEntry.password"
                        class="vault-cell-input"
                        type="text"
                        maxlength="200"
                        @keyup.enter="saveEditingEntry"
                        @keyup.esc="cancelEditingEntry"
                      />
                      <button class="vault-secondary-btn small" @click="fillRandomPassword(editingEntry)">随机</button>
                    </div>
                  </td>
                  <td>
                    <div class="vault-cell-stack">
                      <input
                        v-model="editingEntry.totpSecret"
                        class="vault-cell-input"
                        type="text"
                        maxlength="2000"
                        placeholder="2FA 密钥、otpauth 链接或 JSON 备份"
                        @keyup.enter="saveEditingEntry"
                        @keyup.esc="cancelEditingEntry"
                      />
                      <div class="vault-action-row">
                        <button class="vault-secondary-btn small ghost" @click="previewEditingEntryTotp">验证码</button>
                        <button class="vault-secondary-btn small ghost" @click="importEditingEntryTotp">导入</button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      v-model="editingEntry.website"
                      class="vault-cell-input"
                      type="text"
                      maxlength="300"
                      @keyup.enter="saveEditingEntry"
                      @keyup.esc="cancelEditingEntry"
                    />
                  </td>
                  <td>
                    <textarea
                      v-model="editingEntry.note"
                      class="vault-cell-input vault-note-input"
                      maxlength="1000"
                      @keyup.esc="cancelEditingEntry"
                    ></textarea>
                  </td>
                  <td class="muted">{{ formatDateTime(entry.updatedAt || entry.createdAt) }}</td>
                  <td class="actions">
                    <div class="vault-action-row">
                      <select
                        v-model="editingEntry.groupId"
                        class="vault-move-select"
                        title="重新分组"
                      >
                        <option v-for="group in sortedGroups" :key="group.id" :value="String(group.id)">
                          移动到：{{ group.name }}
                        </option>
                      </select>
                      <button class="vault-secondary-btn small" @click="saveEditingEntry">保存</button>
                      <button class="vault-secondary-btn small ghost" @click="cancelEditingEntry">取消</button>
                    </div>
                  </td>
                </template>

                <template v-else>
                  <td class="vault-account-cell" :class="{ muted: !entry.account }">
                    {{ entry.account || '未填写账号' }}
                  </td>
                  <td>
                    <div class="vault-password-cell">
                      <code>{{ isPasswordVisible(entry.id) ? entry.password : maskPassword(entry.password) }}</code>
                      <button class="vault-inline-link" @click="togglePasswordVisibility(entry.id)">
                        {{ isPasswordVisible(entry.id) ? '隐藏' : '显示' }}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div v-if="entry.totpSecret" class="vault-2fa-cell">
                      <span class="vault-2fa-badge">已配置</span>
                      <button class="vault-inline-link" @click="openEntryTotp(entry)">查看验证码</button>
                    </div>
                    <span v-else class="muted">-</span>
                  </td>
                  <td>
                    <button
                      v-if="entry.website"
                      class="vault-link-btn"
                      @click="openWebsite(entry.website)"
                    >
                      {{ entry.website }}
                    </button>
                    <span v-else class="muted">-</span>
                  </td>
                  <td class="vault-note-cell">
                    <template v-if="entry.note">
                      <div
                        class="vault-note-text"
                        :class="{ expanded: isNoteExpanded(entry.id) }"
                      >
                        {{ entry.note }}
                      </div>
                      <button class="vault-inline-link" @click="toggleNoteExpanded(entry.id)">
                        {{ isNoteExpanded(entry.id) ? '收起备注' : '展开备注' }}
                      </button>
                    </template>
                    <span v-else class="muted">-</span>
                  </td>
                  <td class="muted">{{ formatDateTime(entry.updatedAt || entry.createdAt) }}</td>
                  <td class="actions">
                    <div class="vault-action-row">
                      <button class="vault-inline-link" @click="copyText(entry.account, '账号已复制')">复制账号</button>
                      <button class="vault-inline-link" @click="copyText(entry.password, '密码已复制')">复制密码</button>
                      <button class="vault-inline-link" @click="startEditingEntry(entry)">编辑</button>
                      <button class="vault-inline-link danger" @click="passwordVaultStore.deletePasswordEntry(entry.id)">删除</button>
                    </div>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-else-if="isLoaded" class="vault-empty-panel large">
      先创建一个分组，然后就可以在下方表格持续录入，切换页面回来也不会清空当前输入。
    </div>

    <div v-if="totpDialog.visible" class="vault-modal-overlay" @click.self="closeTotpDialog">
      <div class="vault-modal">
        <div class="vault-modal-header">
          <div>
            <div class="vault-modal-title">动态验证码</div>
            <div class="vault-modal-subtitle">{{ totpDialog.label || totpDialog.title }}</div>
          </div>
          <button class="vault-inline-link" @click="closeTotpDialog">关闭</button>
        </div>

        <div v-if="totpDialog.issuer" class="vault-modal-meta">
          服务商：{{ totpDialog.issuer }}
        </div>

        <div v-if="totpDialog.error" class="vault-totp-error">
          {{ totpDialog.error }}
        </div>

        <template v-else>
          <div class="vault-totp-code">{{ totpDialog.code }}</div>
          <div class="vault-totp-hint">
            {{ totpDialog.remainingSeconds }} 秒后刷新
          </div>
          <div class="vault-totp-progress">
            <div class="vault-totp-progress-bar" :style="totpProgressStyle"></div>
          </div>
          <div class="vault-action-row">
            <button class="vault-primary-btn small" @click="copyText(totpDialog.code, '验证码已复制')">复制验证码</button>
            <button class="vault-secondary-btn small ghost" @click="refreshTotpDialog">立即刷新</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { usePasswordVaultStore } from '../stores/passwordVault'
import { generateRandomPassword, generateTotpToken, normalizeTotpInput, parseTotpInput } from '../utils/password_tools'

const RANDOM_PASSWORD_LENGTH = 18

const appStore = useAppStore()
const passwordVaultStore = usePasswordVaultStore()
const { sortedGroups, selectedGroup, filteredEntries, currentGroupId, searchQuery, isLoaded } = storeToRefs(passwordVaultStore)

const visiblePasswordIds = ref(new Set())
const expandedNoteIds = ref(new Set())
const newGroupName = ref('')
const editingGroupId = ref('')
const editingGroupName = ref('')
const editingEntryId = ref('')

const newEntry = reactive({
  account: '',
  password: '',
  totpSecret: '',
  website: '',
  note: ''
})

const editingEntry = reactive({
  groupId: '',
  account: '',
  password: '',
  totpSecret: '',
  website: '',
  note: ''
})

const totpDialog = reactive({
  visible: false,
  title: '2FA 验证码',
  secret: '',
  code: '',
  issuer: '',
  label: '',
  period: 30,
  remainingSeconds: 30,
  error: ''
})

let totpTimer = null
let totpRequestId = 0

const totpProgressStyle = computed(() => {
  const period = Math.max(Number(totpDialog.period) || 30, 1)
  const remaining = Math.max(Number(totpDialog.remainingSeconds) || 0, 0)
  return {
    width: `${Math.min((remaining / period) * 100, 100)}%`
  }
})

onMounted(async () => {
  if (!isLoaded.value) {
    await passwordVaultStore.loadPasswordVault()
  }
})

onBeforeUnmount(() => {
  stopTotpDialogTimer()
})

function getGroupEntryCount(groupId) {
  return passwordVaultStore.getGroupEntryCount(groupId)
}

async function createGroup() {
  try {
    const result = await passwordVaultStore.addPasswordGroup(newGroupName.value)
    if (result) {
      newGroupName.value = ''
    }
  } catch (error) {
    appStore.toast(error.message || '创建分组失败', 'error')
  }
}

function startEditingGroup(group) {
  editingGroupId.value = String(group.id)
  editingGroupName.value = group.name || ''
}

function cancelEditingGroup() {
  editingGroupId.value = ''
  editingGroupName.value = ''
}

async function saveEditingGroup() {
  if (!editingGroupId.value) return
  try {
    const success = await passwordVaultStore.updatePasswordGroup(editingGroupId.value, { name: editingGroupName.value })
    if (success) {
      cancelEditingGroup()
    }
  } catch (error) {
    appStore.toast(error.message || '保存分组失败', 'error')
  }
}

function resetNewEntry() {
  newEntry.account = ''
  newEntry.password = ''
  newEntry.totpSecret = ''
  newEntry.website = ''
  newEntry.note = ''
}

async function createEntry() {
  try {
    const result = await passwordVaultStore.addPasswordEntry({
      groupId: currentGroupId.value,
      account: newEntry.account,
      password: newEntry.password,
      totpSecret: newEntry.totpSecret,
      website: newEntry.website,
      note: newEntry.note
    })
    if (result) {
      resetNewEntry()
    }
  } catch (error) {
    appStore.toast(error.message || '添加记录失败', 'error')
  }
}

function startEditingEntry(entry) {
  editingEntryId.value = String(entry.id)
  editingEntry.groupId = String(entry.groupId || currentGroupId.value || '')
  editingEntry.account = entry.account || ''
  editingEntry.password = entry.password || ''
  editingEntry.totpSecret = entry.totpSecret || ''
  editingEntry.website = entry.website || ''
  editingEntry.note = entry.note || ''
}

function cancelEditingEntry() {
  editingEntryId.value = ''
  editingEntry.groupId = ''
  editingEntry.account = ''
  editingEntry.password = ''
  editingEntry.totpSecret = ''
  editingEntry.website = ''
  editingEntry.note = ''
}

async function saveEditingEntry() {
  if (!editingEntryId.value) return
  try {
    const success = await passwordVaultStore.updatePasswordEntry(editingEntryId.value, {
      groupId: editingEntry.groupId,
      account: editingEntry.account,
      password: editingEntry.password,
      totpSecret: editingEntry.totpSecret,
      website: editingEntry.website,
      note: editingEntry.note
    })
    if (success) {
      cancelEditingEntry()
    }
  } catch (error) {
    appStore.toast(error.message || '保存记录失败', 'error')
  }
}

function fillRandomPassword(target) {
  try {
    target.password = generateRandomPassword({ length: RANDOM_PASSWORD_LENGTH })
    appStore.toast('已生成随机密码', 'success')
  } catch (error) {
    appStore.toast(error.message || '生成随机密码失败', 'error')
  }
}

function getTotpTitle(entryOrLabel) {
  if (typeof entryOrLabel === 'string') {
    return String(entryOrLabel || '').trim() || '2FA 验证码'
  }
  return entryOrLabel?.account || entryOrLabel?.website || selectedGroup.value?.name || '2FA 验证码'
}

function resetTotpDialog() {
  totpDialog.visible = false
  totpDialog.title = '2FA 验证码'
  totpDialog.secret = ''
  totpDialog.code = ''
  totpDialog.issuer = ''
  totpDialog.label = ''
  totpDialog.period = 30
  totpDialog.remainingSeconds = 30
  totpDialog.error = ''
}

function stopTotpDialogTimer() {
  if (totpTimer) {
    clearInterval(totpTimer)
    totpTimer = null
  }
}

function closeTotpDialog() {
  totpRequestId += 1
  stopTotpDialogTimer()
  resetTotpDialog()
}

async function refreshTotpDialog() {
  if (!totpDialog.visible || !totpDialog.secret) return

  const requestId = ++totpRequestId
  try {
    const token = await generateTotpToken(totpDialog.secret)
    if (requestId !== totpRequestId || !totpDialog.visible) {
      return
    }

    totpDialog.code = token.code
    totpDialog.issuer = token.issuer || ''
    totpDialog.label = token.label || ''
    totpDialog.period = token.period || 30
    totpDialog.remainingSeconds = token.remainingSeconds || token.period || 30
    totpDialog.error = ''
  } catch (error) {
    if (requestId !== totpRequestId || !totpDialog.visible) {
      return
    }

    totpDialog.code = ''
    totpDialog.issuer = ''
    totpDialog.label = ''
    totpDialog.error = error.message || '2FA 密钥格式无效'
    stopTotpDialogTimer()
  }
}

function startTotpDialogTimer() {
  stopTotpDialogTimer()
  totpTimer = setInterval(() => {
    void refreshTotpDialog()
  }, 1000)
}

async function previewTotp(secret, title) {
  if (!String(secret || '').trim()) {
    appStore.toast('请先填写 2FA 密钥', 'warning')
    return
  }

  totpRequestId += 1
  stopTotpDialogTimer()
  totpDialog.visible = true
  totpDialog.title = getTotpTitle(title)
  totpDialog.secret = String(secret || '').trim()
  totpDialog.code = ''
  totpDialog.issuer = ''
  totpDialog.label = ''
  totpDialog.period = 30
  totpDialog.remainingSeconds = 30
  totpDialog.error = ''

  await refreshTotpDialog()
  if (!totpDialog.error) {
    startTotpDialogTimer()
  }
}

async function previewNewEntryTotp() {
  await previewTotp(newEntry.totpSecret, newEntry.account || '新记录')
}

async function previewEditingEntryTotp() {
  await previewTotp(editingEntry.totpSecret, editingEntry.account || '编辑记录')
}

function applyImportedTotp(target, rawInput) {
  const normalized = normalizeTotpInput(rawInput)
  const parsed = parseTotpInput(normalized)
  target.totpSecret = normalized

  if (!String(target.account || '').trim() && String(parsed.label || '').trim()) {
    target.account = parsed.label.trim()
  }

  return parsed
}

async function importTotpFile(target, fallbackTitle) {
  try {
    const result = await window.electronAPI.importPasswordVaultTotp()
    if (!result?.success) {
      if (result?.error && result.error !== '用户取消操作') {
        appStore.toast(result.error || '导入 2FA 文件失败', 'error')
      }
      return
    }

    const content = String(result.data || '').trim()
    if (!content) {
      appStore.toast('导入文件内容为空', 'warning')
      return
    }

    const parsed = applyImportedTotp(target, content)
    appStore.toast(`已导入 ${parsed.label || parsed.issuer || fallbackTitle} 的 2FA 数据`, 'success')
  } catch (error) {
    appStore.toast(error.message || '导入 2FA 文件失败', 'error')
  }
}

async function importNewEntryTotp() {
  await importTotpFile(newEntry, '新记录')
}

async function importEditingEntryTotp() {
  await importTotpFile(editingEntry, '编辑记录')
}

async function openEntryTotp(entry) {
  await previewTotp(entry.totpSecret, getTotpTitle(entry))
}

function isPasswordVisible(entryId) {
  return visiblePasswordIds.value.has(String(entryId))
}

function togglePasswordVisibility(entryId) {
  const next = new Set(visiblePasswordIds.value)
  const id = String(entryId)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  visiblePasswordIds.value = next
}

function isNoteExpanded(entryId) {
  return expandedNoteIds.value.has(String(entryId))
}

function toggleNoteExpanded(entryId) {
  const next = new Set(expandedNoteIds.value)
  const id = String(entryId)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedNoteIds.value = next
}

function maskPassword(password) {
  const length = Math.max(String(password || '').length, 8)
  return '•'.repeat(length)
}

async function copyText(text, message) {
  if (!text) {
    appStore.toast('没有可复制的内容', 'warning')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    appStore.toast(message, 'success')
  } catch (error) {
    appStore.toast('复制失败', 'error')
  }
}

function normalizeWebsite(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

async function openWebsite(url) {
  const target = normalizeWebsite(url)
  if (!target) return
  try {
    await window.electronAPI.openExternal(target)
  } catch (error) {
    appStore.toast('打开网址失败', 'error')
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.vault-page {
  height: 100%;
  overflow: auto;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f5f7fb 0%, #edf2f9 100%);
}

.vault-group-panel,
.vault-table-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
}

.vault-group-panel,
.vault-table-panel {
  padding: 18px 20px 20px;
  margin-bottom: 18px;
}

.vault-panel-header,
.vault-table-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.vault-panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.vault-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.vault-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, #f9fbff 0%, #f4f8fd 100%);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.vault-chip:hover,
.vault-chip.active {
  border-color: rgba(37, 99, 235, 0.26);
  background: linear-gradient(180deg, #edf5ff 0%, #eaf3ff 100%);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.vault-chip-editing {
  padding-right: 12px;
}

.vault-chip-name {
  font-weight: 700;
}

.vault-chip-count {
  min-width: 26px;
  padding: 3px 8px;
  border-radius: 999px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.12);
}

.vault-chip-tools {
  display: inline-flex;
  gap: 8px;
  margin-left: 2px;
}

.vault-chip-tool,
.vault-inline-link {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.vault-chip-tool:hover,
.vault-inline-link:hover {
  color: #1d4ed8;
}

.vault-chip-tool.danger,
.vault-inline-link.danger {
  color: #dc2626;
}

.vault-chip-input,
.vault-inline-input,
.vault-search-input,
.vault-cell-input {
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  background: #ffffff;
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.vault-cell-input {
  resize: vertical;
}

.vault-chip-input:focus,
.vault-inline-input:focus,
.vault-search-input:focus,
.vault-cell-input:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.vault-chip-action {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.vault-chip-action.save {
  color: #1d4ed8;
  font-weight: 700;
}

.vault-group-creator {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.vault-inline-input {
  flex: 1;
}

.vault-primary-btn,
.vault-secondary-btn {
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  white-space: nowrap;
}

.vault-primary-btn {
  padding: 11px 16px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.vault-primary-btn.small,
.vault-secondary-btn.small {
  padding: 8px 12px;
  font-size: 13px;
}

.vault-secondary-btn {
  padding: 11px 16px;
  background: #eef2ff;
  color: #274690;
}

.vault-secondary-btn.ghost {
  background: #f8fafc;
  color: var(--text-secondary);
}

.vault-search-input {
  width: 300px;
  background: #f8fafc;
}

.vault-table-shell {
  margin-top: 16px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  background: #ffffff;
}

.vault-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
}

.vault-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  background: #f8fbff;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.vault-table td {
  padding: 12px 16px;
  vertical-align: middle;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  color: var(--text-primary);
}

.vault-table tbody tr:hover td {
  background: rgba(248, 250, 252, 0.78);
}

.vault-table .actions {
  width: 340px;
}

.vault-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.vault-cell-stack {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 210px;
}

.vault-cell-stack .vault-cell-input {
  flex: 1;
  min-width: 0;
}

.vault-new-row td {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05), rgba(16, 185, 129, 0.04));
}

.vault-account-cell {
  font-weight: 700;
}

.vault-password-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vault-password-cell code {
  display: inline-block;
  min-width: 130px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 10px;
  background: #0f172a;
  color: #e2e8f0;
}

.vault-2fa-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.vault-2fa-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
}

.vault-link-btn {
  border: none;
  padding: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
  word-break: break-all;
}

.vault-move-select {
  max-width: 150px;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #ffffff;
  color: var(--text-primary);
  padding: 8px 10px;
  font-size: 13px;
}

.vault-note-cell {
  max-width: 320px;
}

.vault-note-input {
  min-height: 72px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.vault-note-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 4px;
}

.vault-note-text.expanded {
  display: block;
  -webkit-line-clamp: unset;
}

.vault-empty-panel {
  min-height: 180px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  border-radius: 20px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  padding: 24px;
  box-sizing: border-box;
}

.vault-empty-panel.compact {
  min-height: 110px;
  margin-top: 14px;
}

.vault-empty-panel.large {
  margin-top: 18px;
}

.vault-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.vault-modal {
  width: min(100%, 420px);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
  padding: 22px;
  box-sizing: border-box;
}

.vault-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.vault-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.vault-modal-subtitle,
.vault-modal-meta,
.vault-totp-hint {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.vault-totp-code {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 18px;
  background: #0f172a;
  color: #f8fafc;
  text-align: center;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 6px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}

.vault-totp-progress {
  margin-top: 12px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.vault-totp-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #16a34a 0%, #2563eb 100%);
  transition: width 0.25s linear;
}

.vault-totp-error {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(220, 38, 38, 0.16);
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.6;
}

.vault-modal .vault-action-row {
  margin-top: 16px;
}

.vault-table-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.muted {
  color: var(--text-muted);
}

@media (max-width: 920px) {
  .vault-page {
    padding: 16px;
  }

  .vault-panel-header,
  .vault-table-topbar {
    flex-direction: column;
  }

  .vault-group-creator {
    width: 100%;
    justify-content: flex-start;
  }

  .vault-search-input {
    width: 100%;
  }

  .vault-modal-overlay {
    padding: 16px;
  }

  .vault-modal {
    width: 100%;
    padding: 18px;
  }

  .vault-totp-code {
    font-size: 28px;
    letter-spacing: 4px;
  }
}
</style>
