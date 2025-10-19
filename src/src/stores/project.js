import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import { useTodoStore } from './todo'

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
  
  // 保存项目
  async function saveProjects() {
    try {
      // 将响应式对象转换为普通对象，避免 IPC 传递错误
      await electronAPI.saveProjects({
        projects: JSON.parse(JSON.stringify(projects.value)),
        currentProjectId: currentProjectId.value
      })
    } catch (error) {
      console.error('保存项目数据失败:', error)
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
    
    projects.value.push(project)
    
    // 如果是第一个项目，自动选中
    if (projects.value.length === 1) {
      currentProjectId.value = project.id
    }
    
    await saveProjects()
    appStore.toast(`项目"${name}"创建成功`)
  }
  
  // 选择项目
  async function selectProject(projectId) {
    currentProjectId.value = projectId
    await saveProjects()
    
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
    
    // 删除项目下的所有任务及其图片
    for (const task of projectTodos) {
      await todoStore.deleteTaskWithImages(task.id)
    }
    // 持久化保存任务删除结果，避免仅内存删除
    await todoStore.saveTodos()
    
    // 删除项目
    projects.value = projects.value.filter(p => p.id !== projectId)
    
    // 如果删除的是当前项目，切换到第一个项目
    if (currentProjectId.value === projectId) {
      currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
    }
    
    await saveProjects()
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
  
  return {
    // 状态
    projects,
    currentProjectId,
    currentProject,
    hasProjects,
    
    // 方法
    loadProjects,
    saveProjects,
    addProject,
    selectProject,
    deleteProject,
    getProjectStats
  }
})

