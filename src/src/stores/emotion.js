import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '../utils/tools'

export const useEmotionStore = defineStore('emotion', () => {
  // 状态
  const persons = ref([])
  const currentPersonId = ref(null)
  const chatRecords = ref([])
  const diaries = ref([])

  // 获取 electronAPI
  const electronAPI = window.electronAPI

  // 计算属性
  const currentPerson = computed(() => {
    if (!currentPersonId.value) return null
    return persons.value.find(p => p.id === currentPersonId.value)
  })

  const currentChatRecords = computed(() => {
    if (!currentPersonId.value) return []
    return chatRecords.value.filter(r => r.personId === currentPersonId.value)
  })

  const currentDiaries = computed(() => {
    if (!currentPersonId.value) return []
    return diaries.value.filter(d => d.personId === currentPersonId.value)
  })

  // ==================== 人物操作 ====================

  /**
   * 加载所有人物
   */
  async function loadPersons() {
    try {
      const result = await electronAPI.getPersons()
      persons.value = result.persons || []
      return persons.value
    } catch (error) {
      console.error('加载人物列表失败:', error)
      return []
    }
  }

  /**
   * 创建新人物
   */
  async function createPerson(personData) {
    const person = {
      id: generateId(),
      name: personData.name,
      avatar: personData.avatar || null,
      profile: personData.profile || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    persons.value.push(person)
    await electronAPI.addPerson(person)
    return person
  }

  /**
   * 更新人物
   */
  async function updatePerson(personId, updates) {
    const personIndex = persons.value.findIndex(p => p.id === personId)
    if (personIndex !== -1) {
      persons.value[personIndex] = {
        ...persons.value[personIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      await electronAPI.updatePerson(personId, updates)
    }
  }

  /**
   * 删除人物
   */
  async function deletePerson(personId) {
    persons.value = persons.value.filter(p => p.id !== personId)
    chatRecords.value = chatRecords.value.filter(r => r.personId !== personId)
    diaries.value = diaries.value.filter(d => d.personId !== personId)

    if (currentPersonId.value === personId) {
      currentPersonId.value = null
    }

    await electronAPI.deletePerson(personId)
  }

  /**
   * 设置当前人物
   */
  function setCurrentPerson(personId) {
    currentPersonId.value = personId
  }

  // ==================== 聊天记录操作 ====================

  /**
   * 加载聊天记录
   */
  async function loadChatRecords(personId) {
    try {
      const result = await electronAPI.getChatRecords(personId)
      chatRecords.value = result.records || []
      return chatRecords.value
    } catch (error) {
      console.error('加载聊天记录失败:', error)
      return []
    }
  }

  /**
   * 添加单条聊天记录
   */
  async function addChatRecord(recordData) {
    const record = {
      id: generateId(),
      personId: recordData.personId,
      sender: recordData.sender, // 'me' 或 'them'
      content: recordData.content,
      emotion: recordData.emotion || null,
      timestamp: recordData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    chatRecords.value.push(record)
    await electronAPI.addChatRecord(record)
    return record
  }

  /**
   * 批量添加聊天记录
   */
  async function addChatRecords(records) {
    const formattedRecords = records.map(r => ({
      id: r.id || generateId(),
      personId: r.personId,
      sender: r.sender,
      content: r.content,
      emotion: r.emotion || null,
      timestamp: r.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    }))

    chatRecords.value.push(...formattedRecords)
    await electronAPI.addChatRecords(formattedRecords)
    return formattedRecords
  }

  /**
   * 删除聊天记录
   */
  async function deleteChatRecord(recordId) {
    chatRecords.value = chatRecords.value.filter(r => r.id !== recordId)
    await electronAPI.deleteChatRecord(recordId)
  }

  /**
   * 清空聊天记录
   */
  async function clearChatRecords(personId) {
    chatRecords.value = chatRecords.value.filter(r => r.personId !== personId)
    await electronAPI.clearChatRecords(personId)
  }

  // ==================== 日记操作 ====================

  /**
   * 加载日记
   */
  async function loadDiaries(personId = null) {
    try {
      const result = await electronAPI.getDiaries(personId)
      diaries.value = result.diaries || []
      return diaries.value
    } catch (error) {
      console.error('加载日记失败:', error)
      return []
    }
  }

  /**
   * 创建日记
   */
  async function createDiary(diaryData) {
    const diary = {
      id: generateId(),
      personId: diaryData.personId || null,
      title: diaryData.title || '',
      content: diaryData.content,
      emotion: diaryData.emotion || null,
      tags: diaryData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    diaries.value.unshift(diary)
    await electronAPI.addDiary(diary)
    return diary
  }

  /**
   * 更新日记
   */
  async function updateDiary(diaryId, updates) {
    const diaryIndex = diaries.value.findIndex(d => d.id === diaryId)
    if (diaryIndex !== -1) {
      diaries.value[diaryIndex] = {
        ...diaries.value[diaryIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      await electronAPI.updateDiary(diaryId, updates)
    }
  }

  /**
   * 删除日记
   */
  async function deleteDiary(diaryId) {
    diaries.value = diaries.value.filter(d => d.id !== diaryId)
    await electronAPI.deleteDiary(diaryId)
  }

  // 初始化
  async function init() {
    await loadPersons()
    await loadDiaries()
  }

  return {
    // 状态
    persons,
    currentPersonId,
    chatRecords,
    diaries,

    // 计算属性
    currentPerson,
    currentChatRecords,
    currentDiaries,

    // 人物方法
    loadPersons,
    createPerson,
    updatePerson,
    deletePerson,
    setCurrentPerson,

    // 聊天记录方法
    loadChatRecords,
    addChatRecord,
    addChatRecords,
    deleteChatRecord,
    clearChatRecords,

    // 日记方法
    loadDiaries,
    createDiary,
    updateDiary,
    deleteDiary,

    // 初始化
    init
  }
})
