import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { joinOrganization, listOrgMembers, updateMemberPassword } from '../utils/server_api'

const STORAGE_KEY = 'todox_org_session'
const DEFAULT_BASE_URL = 'http://localhost:8081'

export const useOrgStore = defineStore('org', () => {
  const dataMode = ref('local')
  const serverBaseUrl = ref(DEFAULT_BASE_URL)
  const orgId = ref(null)
  const memberId = ref(null)
  const memberName = ref('')
  const memberRole = ref('')
  const orgAccount = ref('')
  const members = ref([])

  const isServerMode = computed(() => dataMode.value === 'server')
  const isAdmin = computed(() => memberRole.value === 'ADMIN')
  const hasSession = computed(() => Boolean(orgId.value && memberId.value))

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const data = JSON.parse(saved)
      dataMode.value = data.dataMode || 'local'
      serverBaseUrl.value = data.serverBaseUrl || DEFAULT_BASE_URL
      orgId.value = data.orgId || null
      memberId.value = data.memberId || null
      memberName.value = data.memberName || ''
      memberRole.value = data.memberRole || ''
      orgAccount.value = data.orgAccount || ''
    } catch (error) {
      console.error('读取组织会话失败:', error)
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dataMode: dataMode.value,
      serverBaseUrl: serverBaseUrl.value,
      orgId: orgId.value,
      memberId: memberId.value,
      memberName: memberName.value,
      memberRole: memberRole.value,
      orgAccount: orgAccount.value
    }))
  }

  function setMode(mode) {
    dataMode.value = mode === 'server' ? 'server' : 'local'
    persist()
  }

  function setServerBaseUrl(url) {
    serverBaseUrl.value = url || DEFAULT_BASE_URL
    persist()
  }

  async function joinOrg({ baseUrl, account, memberId: memberIdInput, password }) {
    if (baseUrl) {
      serverBaseUrl.value = baseUrl
    }
    const response = await joinOrganization(serverBaseUrl.value, {
      orgAccount: account,
      memberId: memberIdInput,
      memberPassword: password
    })
    orgId.value = response.orgId
    memberId.value = response.memberId
    memberName.value = response.memberName
    memberRole.value = response.role
    orgAccount.value = account
    persist()
    return response
  }

  async function loadMembers() {
    if (!isServerMode.value || !hasSession.value) {
      members.value = []
      return []
    }
    const data = await listOrgMembers(serverBaseUrl.value, orgId.value, memberId.value)
    members.value = Array.isArray(data) ? data : []
    return members.value
  }

  function clearSession() {
    orgId.value = null
    memberId.value = null
    memberName.value = ''
    memberRole.value = ''
    orgAccount.value = ''
    members.value = []
    persist()
  }

  async function changePassword({ oldPassword, newPassword }) {
    if (!hasSession.value) {
      throw new Error('未登录成员')
    }
    await updateMemberPassword(serverBaseUrl.value, orgId.value, memberId.value, {
      oldPassword,
      newPassword
    })
  }

  return {
    dataMode,
    serverBaseUrl,
    orgId,
    memberId,
    memberName,
    memberRole,
    orgAccount,
    members,
    isServerMode,
    isAdmin,
    hasSession,
    loadFromStorage,
    setMode,
    setServerBaseUrl,
    joinOrg,
    loadMembers,
    clearSession,
    changePassword
  }
})
