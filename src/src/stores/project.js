import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import { useTodoStore } from './todo'
import { encrypt, decrypt } from '../utils/crypto'

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref([])
  const currentProjectId = ref(null)
  
  // 获取 electronAPI
  const electronAPI = window.electronAPI
  
  // 计算属性
  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })
  
  const hasProjects = computed(() => projects.value.length > 0)
  
  // 加载项目
  async function loadProjects() {
    try {
      const data = await electronAPI.loadProjects()
      projects.value = data.projects || []
      currentProjectId.value = data.currentProjectId || null
    } catch (error) {
      console.error('加载项目数据失败:', error)
      projects.value = []
      currentProjectId.value = null
    }
  }
  
  // 添加项目
  async function addProject(name, color) {
    if (!name) return
    
    const appStore = useAppStore()
    const project = {
      id: Date.now(),
      name,
      color,
      createdAt: new Date().toISOString()
    }
    
    // 先添加到本地状态
    projects.value.push(project)
    
    // 如果是第一个项目，自动选中
    if (projects.value.length === 1) {
      currentProjectId.value = project.id
      await electronAPI.setCurrentProject(project.id)
    }
    
    // 单条插入数据库
    await electronAPI.addProject(JSON.parse(JSON.stringify(project)))
    appStore.toast(`项目"${name}"创建成功`)
  }
  
  // 选择项目
  async function selectProject(projectId) {
    currentProjectId.value = projectId
    await electronAPI.setCurrentProject(projectId)
    
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      const appStore = useAppStore()
      appStore.toast(`已切换到项目"${project.name}"`)
    }
  }
  
  // 删除项目
  async function deleteProject(projectId) {
    const appStore = useAppStore()
    const todoStore = useTodoStore()
    
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return
    
    // 检查项目下是否有任务
    const projectTodos = todoStore.todos.filter(t => t.projectId === projectId)
    let message = `确定要删除项目"${project.name}"吗？`
    if (projectTodos.length > 0) {
      message = `项目"${project.name}"包含 ${projectTodos.length} 个任务，删除后任务也会被删除。确定要删除吗？`
    }
    
    const confirmed = await appStore.confirm(message)
    if (!confirmed) return
    
    // 删除项目下的所有任务及其图片（逐条删除）
    for (const task of projectTodos) {
      await todoStore.deleteTask(task.id)
    }
    
    // 从本地状态删除项目
    projects.value = projects.value.filter(p => p.id !== projectId)
    
    // 如果删除的是当前项目，切换到第一个项目
    if (currentProjectId.value === projectId) {
      currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
      if (currentProjectId.value) {
        await electronAPI.setCurrentProject(currentProjectId.value)
      }
    }
    
    // 单条删除数据库中的项目（会级联删除任务）
    await electronAPI.deleteProject(projectId)
    
    appStore.toast(`项目"${project.name}"已删除`)
  }
  
  // 获取项目任务统计
  function getProjectStats(projectId) {
    const todoStore = useTodoStore()
    const projectTodos = todoStore.todos.filter(t => t.projectId === projectId)
    const completedCount = projectTodos.filter(t => t.completed).length
    const totalCount = projectTodos.length
    return { completed: completedCount, total: totalCount }
  }
  
  // 导出项目（包含任务数据）
  async function exportProject(projectId, password = null) {
    const appStore = useAppStore()
    const todoStore = useTodoStore()
    
    const project = projects.value.find(p => p.id === projectId)
    if (!project) {
      throw new Error('项目不存在')
    }
    
    try {
      // 获取项目的所有任务
      const projectTodos = todoStore.todos.filter(t => t.projectId === projectId)
      
      // 构建导出数据
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        project: {
          ...project,
          // 不导出 ID，导入时重新生成
          originalId: project.id
        },
        tasks: projectTodos.map(task => ({
          ...task,
          // 不导出 ID 和 projectId，导入时重新生成
          originalId: task.id,
          originalProjectId: task.projectId
        })),
        stats: {
          totalTasks: projectTodos.length,
          completedTasks: projectTodos.filter(t => t.completed).length
        }
      }
      
      // 转换为 JSON
      const jsonData = JSON.stringify(exportData, null, 2)
      
      // 加密数据
      const encryptedData = encrypt(jsonData, password)
      
      // 生成文件名
      const fileName = `${project.name}_${new Date().toISOString().split('T')[0]}.todox`
      
      // 调用 Electron API 保存文件
      const result = await electronAPI.exportProject(fileName, encryptedData)
      
      if (result.success) {
        appStore.toast(`项目"${project.name}"导出成功`)
        return { success: true, filePath: result.filePath }
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      appStore.toast(`导出失败: ${error.message}`)
      throw error
    }
  }
  
  // 导入项目（从加密文件）
  async function importProject(password = null) {
    const appStore = useAppStore()
    const todoStore = useTodoStore()
    
    try {
      // 调用 Electron API 选择并读取文件
      const result = await electronAPI.importProject()
      
      if (!result.success) {
        throw new Error(result.error || '读取文件失败')
      }
      
      // 解密数据
      let decryptedData
      try {
        decryptedData = decrypt(result.data, password)
      } catch (error) {
        throw new Error('解密失败，密码可能不正确')
      }
      
      // 解析 JSON
      const importData = JSON.parse(decryptedData)
      
      // 验证数据格式
      if (!importData.version || !importData.project || !importData.tasks) {
        throw new Error('无效的项目文件格式')
      }
      
      // 检查项目名称是否重复
      let projectName = importData.project.name
      const existingNames = projects.value.map(p => p.name)
      if (existingNames.includes(projectName)) {
        // 添加后缀避免重复
        let counter = 1
        while (existingNames.includes(`${projectName} (${counter})`)) {
          counter++
        }
        projectName = `${projectName} (${counter})`
      }
      
      // 创建新项目
      const newProjectId = Date.now()
      const newProject = {
        id: newProjectId,
        name: projectName,
        color: importData.project.color,
        createdAt: new Date().toISOString()
      }
      
      projects.value.push(newProject)
      await saveProjects()
      
      // 导入任务
      const oldIdToNewId = {}
      for (const taskData of importData.tasks) {
        // 使用整数避免浮点数ID，添加随机数避免冲突
        const newTaskId = Date.now() + Math.floor(Math.random() * 10000)
        oldIdToNewId[taskData.originalId] = newTaskId
        
        const newTask = {
          ...taskData,
          id: newTaskId,
          projectId: newProjectId,
          createdAt: new Date().toISOString(),
          // 清除完成状态的时间戳（让用户重新完成）
          completedAt: null
        }
        
        // 移除临时字段
        delete newTask.originalId
        delete newTask.originalProjectId
        
        todoStore.todos.push(newTask)
      }
      
      await todoStore.saveTodos()
      
      // 切换到新导入的项目
      currentProjectId.value = newProjectId
      await saveProjects()
      
      appStore.toast(`项目"${projectName}"导入成功，包含 ${importData.tasks.length} 个任务`)
      return { success: true, projectId: newProjectId }
    } catch (error) {
      appStore.toast(`导入失败: ${error.message}`)
      throw error
    }
  }
  
  return {
    // 状态
    projects,
    currentProjectId,
    currentProject,
    hasProjects,
    
    // 方法
    loadProjects,
    addProject,
    selectProject,
    deleteProject,
    getProjectStats,
    exportProject,
    importProject
  }
})

