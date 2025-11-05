import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'

export const useDocumentStore = defineStore('document', () => {
  const appStore = useAppStore()
  const electronAPI = window.electronAPI

  // 状态
  const documents = ref([])
  const currentDocumentId = ref(null)
  const isLoading = ref(false)
  
  // 文档名称对话框引用
  let documentNameDialogRef = null

  // 计算属性
  const currentDocument = computed(() => {
    return documents.value.find(doc => doc.id === currentDocumentId.value) || null
  })

  // 加载所有文档
  async function loadDocuments() {
    try {
      isLoading.value = true
      const result = await electronAPI.getDocuments()
      
      if (result.success) {
        documents.value = result.documents || []
        
        // 如果有保存的当前文档ID，恢复它
        const savedId = await electronAPI.getCurrentDocumentId()
        if (savedId.success && savedId.documentId) {
          const exists = documents.value.find(d => d.id === savedId.documentId)
          if (exists) {
            currentDocumentId.value = savedId.documentId
          } else if (documents.value.length > 0) {
            currentDocumentId.value = documents.value[0].id
          }
        } else if (documents.value.length > 0) {
          currentDocumentId.value = documents.value[0].id
        }
        
        console.log('文档加载成功:', documents.value.length)
      } else {
        console.error('加载文档失败:', result.error)
        appStore.toast('加载文档失败')
      }
    } catch (error) {
      console.error('加载文档异常:', error)
      appStore.toast('加载文档异常')
    } finally {
      isLoading.value = false
    }
  }

  // 创建新文档（带名称输入）
  async function createDocument(title = null) {
    try {
      let documentTitle = title
      
      // 如果没有提供标题且有对话框引用，显示对话框
      if (!documentTitle && documentNameDialogRef) {
        appStore.showDocumentNameDialog = true
        const result = await documentNameDialogRef.init('', false)
        
        if (!result.confirmed) {
          return null // 用户取消
        }
        
        documentTitle = result.name
      }
      
      // 如果还是没有标题，使用默认值
      if (!documentTitle) {
        documentTitle = `文档 ${new Date().toLocaleDateString()}`
      }
      
      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: documentTitle,
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await electronAPI.addDocument(newDoc)
      
      if (result.success) {
        documents.value.unshift(newDoc)
        currentDocumentId.value = newDoc.id
        await electronAPI.setCurrentDocumentId(newDoc.id)
        appStore.toast('文档创建成功')
        return newDoc
      } else {
        appStore.toast('创建文档失败')
        return null
      }
    } catch (error) {
      console.error('创建文档异常:', error)
      appStore.toast('创建文档异常')
      return null
    }
  }

  // 更新文档
  async function updateDocument(documentId, updates) {
    try {
      const doc = documents.value.find(d => d.id === documentId)
      if (!doc) return false

      // 更新本地数据
      Object.assign(doc, updates, {
        updatedAt: new Date().toISOString()
      })

      // 保存到数据库
      const result = await electronAPI.updateDocument(documentId, {
        ...updates,
        updatedAt: doc.updatedAt
      })

      if (result.success) {
        return true
      } else {
        appStore.toast('更新文档失败')
        return false
      }
    } catch (error) {
      console.error('更新文档异常:', error)
      appStore.toast('更新文档异常')
      return false
    }
  }

  // 删除文档
  async function deleteDocument(documentId) {
    try {
      const confirmed = await appStore.confirm('确定要删除这个文档吗？')
      if (!confirmed) return false

      const result = await electronAPI.deleteDocument(documentId)
      
      if (result.success) {
        const index = documents.value.findIndex(d => d.id === documentId)
        if (index > -1) {
          documents.value.splice(index, 1)
        }

        // 如果删除的是当前文档，切换到其他文档
        if (currentDocumentId.value === documentId) {
          if (documents.value.length > 0) {
            currentDocumentId.value = documents.value[0].id
            await electronAPI.setCurrentDocumentId(documents.value[0].id)
          } else {
            currentDocumentId.value = null
            await electronAPI.setCurrentDocumentId(null)
          }
        }

        appStore.toast('文档已删除')
        return true
      } else {
        appStore.toast('删除文档失败')
        return false
      }
    } catch (error) {
      console.error('删除文档异常:', error)
      appStore.toast('删除文档异常')
      return false
    }
  }

  // 选择文档
  async function selectDocument(documentId) {
    if (currentDocumentId.value === documentId) return
    
    currentDocumentId.value = documentId
    await electronAPI.setCurrentDocumentId(documentId)
  }

  // 保存文档内容（防抖）
  let saveTimer = null
  function saveDocumentContent(documentId, content) {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    // 立即更新本地内容
    const doc = documents.value.find(d => d.id === documentId)
    if (doc) {
      doc.content = content
      doc.updatedAt = new Date().toISOString()
    }

    // 延迟保存到数据库
    saveTimer = setTimeout(() => {
      updateDocument(documentId, { content })
    }, 500)
  }
  
  // 设置文档名称对话框引用
  function setDocumentNameDialog(dialogRef) {
    documentNameDialogRef = dialogRef
  }
  
  // 重命名文档（显示对话框）
  async function renameDocument(documentId) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc || !documentNameDialogRef) return false
    
    appStore.showDocumentNameDialog = true
    const result = await documentNameDialogRef.init(doc.title, true)
    
    if (result.confirmed && result.name !== doc.title) {
      return await updateDocument(documentId, { title: result.name })
    }
    
    return false
  }

  return {
    // 状态
    documents,
    currentDocumentId,
    isLoading,

    // 计算属性
    currentDocument,

    // 方法
    loadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    saveDocumentContent,
    setDocumentNameDialog,
    renameDocument
  }
})

