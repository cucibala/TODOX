import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAppStore } from './app'
import { generateId } from '../utils/tools'

export const usePasswordVaultStore = defineStore('passwordVault', () => {
  const groups = ref([])
  const entries = ref([])
  const currentGroupId = ref(null)
  const searchQuery = ref('')
  const isLoaded = ref(false)

  const electronAPI = window.electronAPI

  function normalizeGroup(group) {
    if (!group) return null
    return {
      ...group,
      id: String(group.id),
      order: group.order ?? 0,
      createdAt: group.createdAt || group.created_at,
      updatedAt: group.updatedAt || group.updated_at
    }
  }

  function normalizeEntry(entry) {
    if (!entry) return null
    return {
      ...entry,
      id: String(entry.id),
      groupId: String(entry.groupId ?? entry.group_id),
      account: entry.account || '',
      password: entry.password || '',
      totpSecret: entry.totpSecret || entry.totp_secret || '',
      website: entry.website || '',
      note: entry.note || '',
      order: entry.order ?? 0,
      createdAt: entry.createdAt || entry.created_at,
      updatedAt: entry.updatedAt || entry.updated_at
    }
  }

  const sortedGroups = computed(() => {
    return [...groups.value].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0)
      if (orderDiff !== 0) return orderDiff
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
    })
  })

  const selectedGroup = computed(() => {
    return groups.value.find(group => String(group.id) === String(currentGroupId.value)) || null
  })

  const groupEntryCountMap = computed(() => {
    const countMap = {}
    for (const entry of entries.value) {
      const groupId = String(entry.groupId || '')
      countMap[groupId] = (countMap[groupId] || 0) + 1
    }
    return countMap
  })

  const filteredEntries = computed(() => {
    if (!currentGroupId.value) return []

    const query = searchQuery.value.trim().toLowerCase()
    return entries.value
      .filter(entry => String(entry.groupId) === String(currentGroupId.value))
      .filter((entry) => {
        if (!query) return true
        return [entry.account, entry.website, entry.note]
          .filter(Boolean)
          .some(field => String(field).toLowerCase().includes(query))
      })
      .sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  })

  function getNextGroupOrder() {
    return groups.value.reduce((max, group) => Math.max(max, group.order ?? 0), -1) + 1
  }

  function getNextEntryOrder(groupId) {
    return entries.value
      .filter(entry => String(entry.groupId) === String(groupId))
      .reduce((max, entry) => Math.max(max, entry.order ?? 0), -1) + 1
  }

  function getGroupEntryCount(groupId) {
    return groupEntryCountMap.value[String(groupId)] || 0
  }

  async function loadPasswordVault() {
    try {
      const data = await electronAPI.loadPasswordVault()
      groups.value = (data.groups || []).map(normalizeGroup).filter(Boolean)
      entries.value = (data.entries || []).map(normalizeEntry).filter(Boolean)

      const hasCurrentGroup = groups.value.some(group => String(group.id) === String(currentGroupId.value))
      currentGroupId.value = hasCurrentGroup ? currentGroupId.value : (groups.value[0]?.id || null)
      isLoaded.value = true
    } catch (error) {
      console.error('加载密码本失败:', error)
      groups.value = []
      entries.value = []
      currentGroupId.value = null
      isLoaded.value = true
    }
  }

  function selectGroup(groupId) {
    currentGroupId.value = groupId ? String(groupId) : null
  }

  async function addPasswordGroup(name) {
    const appStore = useAppStore()
    const trimmedName = (name || '').trim()
    if (!trimmedName) {
      appStore.toast('分组名称不能为空', 'warning')
      return null
    }

    const exists = groups.value.some(group => group.name.trim().toLowerCase() === trimmedName.toLowerCase())
    if (exists) {
      appStore.toast('分组名称已存在', 'warning')
      return null
    }

    const group = {
      id: generateId(),
      name: trimmedName,
      order: getNextGroupOrder(),
      createdAt: new Date().toISOString()
    }

    const result = await electronAPI.addPasswordVaultGroup(JSON.parse(JSON.stringify(group)))
    if (!result?.success) {
      throw new Error(result?.error || '创建分组失败')
    }

    groups.value.push(normalizeGroup(group))
    currentGroupId.value = group.id
    appStore.toast(`分组"${trimmedName}"创建成功`, 'success')
    return group
  }

  async function updatePasswordGroup(groupId, updates) {
    const appStore = useAppStore()
    const group = groups.value.find(item => String(item.id) === String(groupId))
    if (!group) return false

    const nextUpdates = { ...updates }
    if (nextUpdates.name !== undefined) {
      const trimmedName = String(nextUpdates.name || '').trim()
      if (!trimmedName) {
        appStore.toast('分组名称不能为空', 'warning')
        return false
      }
      const exists = groups.value.some(item => String(item.id) !== String(groupId) && item.name.trim().toLowerCase() === trimmedName.toLowerCase())
      if (exists) {
        appStore.toast('分组名称已存在', 'warning')
        return false
      }
      nextUpdates.name = trimmedName
    }

    const result = await electronAPI.updatePasswordVaultGroup(groupId, JSON.parse(JSON.stringify(nextUpdates)))
    if (!result?.success) {
      throw new Error(result?.error || '更新分组失败')
    }

    Object.assign(group, nextUpdates, { updatedAt: new Date().toISOString() })
    appStore.toast('分组已更新', 'success')
    return true
  }

  async function deletePasswordGroup(groupId) {
    const appStore = useAppStore()
    const group = groups.value.find(item => String(item.id) === String(groupId))
    if (!group) return

    const count = getGroupEntryCount(groupId)
    const message = count > 0
      ? `确定删除分组"${group.name}"吗？该分组下 ${count} 条记录会一起删除。`
      : `确定删除分组"${group.name}"吗？`
    const confirmed = await appStore.confirm(message)
    if (!confirmed) return

    const result = await electronAPI.deletePasswordVaultGroup(groupId)
    if (!result?.success) {
      throw new Error(result?.error || '删除分组失败')
    }

    groups.value = groups.value.filter(item => String(item.id) !== String(groupId))
    entries.value = entries.value.filter(entry => String(entry.groupId) !== String(groupId))
    if (String(currentGroupId.value) === String(groupId)) {
      currentGroupId.value = groups.value[0]?.id || null
    }
    appStore.toast(`分组"${group.name}"已删除`, 'success')
  }

  async function addPasswordEntry(payload) {
    const appStore = useAppStore()
    const groupId = payload.groupId ? String(payload.groupId) : String(currentGroupId.value || '')
    const account = String(payload.account || '').trim()
    const password = String(payload.password || '').trim()
    const totpSecret = String(payload.totpSecret || '').trim()
    const website = String(payload.website || '').trim()
    const note = String(payload.note || '').trim()

    if (!groupId) {
      appStore.toast('请先创建并选择分组', 'warning')
      return null
    }
    if (!password) {
      appStore.toast('请填写密码', 'warning')
      return null
    }

    const entry = {
      id: generateId(),
      groupId,
      account,
      password,
      totpSecret,
      website,
      note,
      order: getNextEntryOrder(groupId),
      createdAt: new Date().toISOString()
    }

    const result = await electronAPI.addPasswordVaultEntry(JSON.parse(JSON.stringify(entry)))
    if (!result?.success) {
      throw new Error(result?.error || '添加记录失败')
    }

    entries.value.push(normalizeEntry(entry))
    currentGroupId.value = groupId
    appStore.toast('记录已添加', 'success')
    return entry
  }

  async function updatePasswordEntry(entryId, updates) {
    const appStore = useAppStore()
    const entry = entries.value.find(item => String(item.id) === String(entryId))
    if (!entry) return false

    const nextUpdates = { ...updates }
    if (nextUpdates.groupId !== undefined) {
      nextUpdates.groupId = String(nextUpdates.groupId)
    }
    if (nextUpdates.account !== undefined) {
      nextUpdates.account = String(nextUpdates.account || '').trim()
    }
    if (nextUpdates.password !== undefined) {
      nextUpdates.password = String(nextUpdates.password || '').trim()
      if (!nextUpdates.password) {
        appStore.toast('密码不能为空', 'warning')
        return false
      }
    }
    if (nextUpdates.totpSecret !== undefined) {
      nextUpdates.totpSecret = String(nextUpdates.totpSecret || '').trim()
    }
    if (nextUpdates.website !== undefined) {
      nextUpdates.website = String(nextUpdates.website || '').trim()
    }
    if (nextUpdates.note !== undefined) {
      nextUpdates.note = String(nextUpdates.note || '').trim()
    }

    const result = await electronAPI.updatePasswordVaultEntry(entryId, JSON.parse(JSON.stringify(nextUpdates)))
    if (!result?.success) {
      throw new Error(result?.error || '更新记录失败')
    }

    Object.assign(entry, nextUpdates, { updatedAt: new Date().toISOString() })
    appStore.toast('记录已更新', 'success')
    return true
  }

  async function deletePasswordEntry(entryId) {
    const appStore = useAppStore()
    const entry = entries.value.find(item => String(item.id) === String(entryId))
    if (!entry) return

    const confirmed = await appStore.confirm(`确定删除账号"${entry.account}"吗？`)
    if (!confirmed) return

    const result = await electronAPI.deletePasswordVaultEntry(entryId)
    if (!result?.success) {
      throw new Error(result?.error || '删除记录失败')
    }

    entries.value = entries.value.filter(item => String(item.id) !== String(entryId))
    appStore.toast('记录已删除', 'success')
  }

  return {
    groups,
    entries,
    currentGroupId,
    searchQuery,
    isLoaded,
    sortedGroups,
    selectedGroup,
    groupEntryCountMap,
    filteredEntries,
    getGroupEntryCount,
    loadPasswordVault,
    selectGroup,
    addPasswordGroup,
    updatePasswordGroup,
    deletePasswordGroup,
    addPasswordEntry,
    updatePasswordEntry,
    deletePasswordEntry
  }
})
