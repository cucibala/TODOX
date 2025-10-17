// 工具函数定义和执行

// 定义可用的工具函数列表
export const availableTools = [
  {
    type: 'function',
    function: {
      name: 'getTodayTasks',
      description: '获取今天添加的任务列表，包括任务内容、优先级、完成状态、子任务等信息',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAllTasks',
      description: '获取所有任务列表，包括已完成和未完成的任务',
      parameters: {
        type: 'object',
        properties: {
          includeCompleted: {
            type: 'boolean',
            description: '是否包括已完成的任务，默认为 true'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTasksByProject',
      description: '获取指定项目下的任务',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: '项目 ID，如果为 null 则获取未分类的任务'
          }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProjects',
      description: '获取所有项目列表，包括项目名称、颜色、统计信息等',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchTasks',
      description: '搜索包含关键词的任务',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键词'
          }
        },
        required: ['keyword']
      }
    }
  }
]

/**
 * 执行工具函数
 * @param {string} functionName - 函数名
 * @param {object} args - 参数
 * @param {object} stores - { todoStore, projectStore }
 * @returns {any} 执行结果
 */
export function executeToolFunction(functionName, args, stores) {
  const { todoStore, projectStore } = stores
  
  const todos = todoStore.todos || []
  const projects = projectStore.projects || []
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  console.log(functionName, "->>>>>", todos, args);
  try {
    switch (functionName) {
      case 'getTodayTasks':
        return todos.filter(task => {
          const taskDate = new Date(task.createdAt)
          taskDate.setHours(0, 0, 0, 0)
          return taskDate.getTime() === today.getTime()
        })
      
      case 'getAllTasks':
        const includeCompleted = args.includeCompleted !== false
        return includeCompleted ? todos : todos.filter(t => !t.completed)
      
      case 'getTasksByProject':
        // 处理类型转换：args.projectId 可能是字符串，需要转换为数字或 null
        const targetProjectId = args.projectId === 'null' || args.projectId === null 
          ? null 
          : Number(args.projectId)
        return todos.filter(t => t.projectId === targetProjectId)
      
      case 'getProjects':
        return projects.map(p => {
          const projectTasks = todos.filter(t => t.projectId === p.id)
          const completed = projectTasks.filter(t => t.completed).length
          return {
            ...p,
            stats: {
              total: projectTasks.length,
              completed: completed,
              pending: projectTasks.length - completed
            }
          }
        })
      
      case 'searchTasks':
        const keyword = args.keyword.toLowerCase()
        return todos.filter(t => 
          t.text.toLowerCase().includes(keyword) ||
          (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(keyword)))
        )
      
      default:
        throw new Error(`未知的函数: ${functionName}`)
    }
  } catch (error) {
    throw new Error(`执行工具函数失败: ${error.message}`)
  }
}

