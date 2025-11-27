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
  const expandedFolders = ref(new Set()) // 展开的文件夹ID集合

  // 计算属性 - 当前选中的文档
  const currentDocument = computed(() => {
    return documents.value.find(doc => doc.id === currentDocumentId.value) || null
  })

  // 计算属性 - 构建树形结构
  const documentTree = computed(() => {
    return buildTree(null)
  })

  // 构建树形结构
  function buildTree(parentId) {
    return documents.value
      .filter(doc => doc.parentId === parentId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .map(doc => ({
        ...doc,
        children: doc.type === 'folder' ? buildTree(doc.id) : []
      }))
  }

  // 获取指定父目录下的项（用于计算 orderIndex）
  function getChildrenByParentId(parentId) {
    return documents.value
      .filter(doc => doc.parentId === parentId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }

  // 检查是否是某个文件夹的子孙
  function isDescendantOf(docId, ancestorId) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return false
    if (!doc.parentId) return false
    if (doc.parentId === ancestorId) return true
    return isDescendantOf(doc.parentId, ancestorId)
  }

  // 切换文件夹展开状态
  function toggleFolder(folderId) {
    if (expandedFolders.value.has(folderId)) {
      expandedFolders.value.delete(folderId)
    } else {
      expandedFolders.value.add(folderId)
    }
  }

  // 展开文件夹
  function expandFolder(folderId) {
    expandedFolders.value.add(folderId)
  }

  // 折叠文件夹
  function collapseFolder(folderId) {
    expandedFolders.value.delete(folderId)
  }

  // 检查文件夹是否展开
  function isFolderExpanded(folderId) {
    return expandedFolders.value.has(folderId)
  }

  // 展开到指定文档（展开其所有祖先文件夹）
  function expandToDocument(docId) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc || !doc.parentId) return

    let parentId = doc.parentId
    while (parentId) {
      expandedFolders.value.add(parentId)
      const parent = documents.value.find(d => d.id === parentId)
      parentId = parent?.parentId
    }
  }

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
            // 展开到当前文档
            expandToDocument(savedId.documentId)
          } else {
            // 选择第一个文档类型的项
            const firstDoc = documents.value.find(d => d.type === 'document')
            if (firstDoc) {
              currentDocumentId.value = firstDoc.id
            }
          }
        } else {
          const firstDoc = documents.value.find(d => d.type === 'document')
          if (firstDoc) {
            currentDocumentId.value = firstDoc.id
          }
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

  // 创建新文档
  async function createDocument(title = null, parentId = null) {
    try {
      const documentTitle = title || `新文档 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: documentTitle,
        content: '',
        parentId: parentId,
        type: 'document',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await electronAPI.addDocument(newDoc)

      if (result.success) {
        // 重新加载以获取正确的 orderIndex
        await loadDocuments()
        currentDocumentId.value = newDoc.id
        await electronAPI.setCurrentDocumentId(newDoc.id)

        // 如果在文件夹中创建，展开该文件夹
        if (parentId) {
          expandFolder(parentId)
        }

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

  // 创建新文件夹
  async function createFolder(title = null, parentId = null) {
    try {
      const folderTitle = title || '新建文件夹'

      const newFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: folderTitle,
        content: '',
        parentId: parentId,
        type: 'folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await electronAPI.addDocument(newFolder)

      if (result.success) {
        // 重新加载以获取正确的 orderIndex
        await loadDocuments()

        // 如果在文件夹中创建，展开该文件夹
        if (parentId) {
          expandFolder(parentId)
        }

        appStore.toast('文件夹创建成功')
        return newFolder
      } else {
        appStore.toast('创建文件夹失败')
        return null
      }
    } catch (error) {
      console.error('创建文件夹异常:', error)
      appStore.toast('创建文件夹异常')
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

  // 删除文档或文件夹
  async function deleteDocument(documentId) {
    try {
      const doc = documents.value.find(d => d.id === documentId)
      if (!doc) return false

      const isFolder = doc.type === 'folder'
      const message = isFolder
        ? '确定要删除这个文件夹吗？文件夹内的所有内容也会被删除。'
        : '确定要删除这个文档吗？'

      const confirmed = await appStore.confirm(message)
      if (!confirmed) return false

      const result = await electronAPI.deleteDocument(documentId)

      if (result.success) {
        // 重新加载文档列表
        await loadDocuments()

        // 如果删除的是当前文档，切换到其他文档
        if (currentDocumentId.value === documentId) {
          const firstDoc = documents.value.find(d => d.type === 'document')
          if (firstDoc) {
            currentDocumentId.value = firstDoc.id
            await electronAPI.setCurrentDocumentId(firstDoc.id)
          } else {
            currentDocumentId.value = null
            await electronAPI.setCurrentDocumentId(null)
          }
        }

        appStore.toast(isFolder ? '文件夹已删除' : '文档已删除')
        return true
      } else {
        appStore.toast('删除失败')
        return false
      }
    } catch (error) {
      console.error('删除异常:', error)
      appStore.toast('删除异常')
      return false
    }
  }

  // 选择文档
  async function selectDocument(documentId) {
    const doc = documents.value.find(d => d.id === documentId)
    if (!doc) return

    // 如果是文件夹，切换展开状态
    if (doc.type === 'folder') {
      toggleFolder(documentId)
      return
    }

    // 如果是文档，选中它
    if (currentDocumentId.value === documentId) return

    currentDocumentId.value = documentId
    await electronAPI.setCurrentDocumentId(documentId)
  }

  // 移动文档或文件夹
  async function moveDocument(documentId, newParentId, newOrderIndex) {
    try {
      const doc = documents.value.find(d => d.id === documentId)
      if (!doc) return false

      // 检查是否要移动到自己的子文件夹中（循环引用）
      if (newParentId && doc.type === 'folder') {
        if (documentId === newParentId || isDescendantOf(newParentId, documentId)) {
          appStore.toast('不能移动到自己的子文件夹中')
          return false
        }
      }

      const result = await electronAPI.moveDocument(documentId, newParentId, newOrderIndex)

      if (result.success) {
        // 重新加载文档列表以获取正确的顺序
        await loadDocuments()

        // 如果移动到了新的父文件夹，展开它
        if (newParentId) {
          expandFolder(newParentId)
        }

        return true
      } else {
        appStore.toast('移动失败')
        return false
      }
    } catch (error) {
      console.error('移动异常:', error)
      appStore.toast('移动异常')
      return false
    }
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

  return {
    // 状态
    documents,
    currentDocumentId,
    isLoading,
    expandedFolders,

    // 计算属性
    currentDocument,
    documentTree,

    // 方法
    loadDocuments,
    createDocument,
    createFolder,
    updateDocument,
    deleteDocument,
    selectDocument,
    moveDocument,
    saveDocumentContent,
    toggleFolder,
    expandFolder,
    collapseFolder,
    isFolderExpanded,
    expandToDocument,
    getChildrenByParentId,
    isDescendantOf
  }
})
