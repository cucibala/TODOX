// AI 工具类 - 封装所有 AI 可调用的工具函数
import { generateId, generateSubId } from './tools'
/**
 * AI 函数封装类
 * 将函数定义和实现封装在一起
 */
class AIFunction {
  constructor(functionDef, functionImpl) {
    this.functionDef = functionDef
    this.functionImpl = functionImpl
  }

  async execute(context, args, onProgress) {
    return await this.functionImpl.call(context, args, onProgress)
  }
}

/**
 * 工具定义辅助函数 - 简化工具定义的构造
 * @param {string} name - 函数名
 * @param {string} description - 函数描述
 * @param {object} properties - 参数属性定义
 * @param {string[]} required - 必需参数列表
 * @returns {object} 标准的工具定义对象
 */
const createTool = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: {
    name,
    description,
    parameters: {
      type: 'object',
      properties,
      required
    }
  }
})

/**
 * 获取过滤后的任务列表（根据选中的项目）
 * 供所有函数实现使用的辅助函数
 */
function getFilteredTodos(todoStore, selectedProjectIds) {
  let todos = todoStore.todos || []
  if (selectedProjectIds && selectedProjectIds.length > 0) {
    todos = todos.filter(t => selectedProjectIds.includes(t.projectId))
  }
  return todos
}

/**
 * 创建剩余的每日任务（渐进式创建）
 * 供 createProjectWithTasks 使用的辅助函数
 */
async function createRemainingDays(context, project, totalDays, currentDay, description, onProgress, baseDate) {
  while (currentDay < totalDays) {
    const dayNumber = currentDay + 1
    const overallProgress = Math.round((dayNumber / totalDays) * 100)
    
    if (onProgress) onProgress(`📅 正在生成第 ${dayNumber} 天的任务... (${overallProgress}%)`)
    
    const taskDate = new Date(baseDate)
    taskDate.setDate(baseDate.getDate() + currentDay)
    const taskDateStr = taskDate.toISOString().split('T')[0]
    
    const prompt = `为"${project.name}"生成第${dayNumber}天任务(共${totalDays}天)。描述：${description}

返回格式（简写）：
{"tx": "第${dayNumber}天 - 标题", "pr": "m", "dd": "${taskDateStr}", "s": [{"tx": "子任务", "w": 3, "r": 0}]}

要求：标题"第${dayNumber}天 - XX"，dd=${taskDateStr}，子任务具体可执行，需记录结果的设r=1，只返回JSON`

    try {
      const content = await context.client.chatCompletions([
        { role: 'system', content: '你是一个专业的项目管理助手。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 1500 })
      
      let taskData
      try {
        taskData = JSON.parse(content.trim())
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
          taskData = JSON.parse(jsonMatch[0])
      } else {
          console.error('AI返回内容:', content)
          console.error(`第${dayNumber}天任务生成失败，跳过`)
          currentDay++
          continue
        }
      }
      
      const taskText = taskData.tx || taskData.text
      const taskPriority = taskData.pr || taskData.priority
      const taskDueDate = taskData.dd || taskData.dueDate
      const taskSubtasks = taskData.s || taskData.subtasks || []
      
      let finalDueDate = taskDueDate
      if (!finalDueDate || finalDueDate !== taskDateStr) {
        finalDueDate = taskDateStr
      }
      
      let priority = 'medium'
      if (taskPriority === 'h' || taskPriority === 'high') priority = 'high'
      else if (taskPriority === 'l' || taskPriority === 'low') priority = 'low'
      else if (taskPriority === 'm' || taskPriority === 'medium') priority = 'medium'
      else if (taskPriority) priority = taskPriority
      
      const taskId = generateId()
      const task = {
        id: taskId,
        text: taskText,
        completed: false,
        priority,
        projectId: project.id,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: finalDueDate,
        images: [],
        pinned: false,
        subtasks: taskSubtasks.map((st, idx) => {
          const subtaskText = st.tx || st.text
          const subtaskWeight = st.w || st.weight || 3
          const subtaskRequiresInput = st.r === 1 || st.r === true || st.requiresInput === true
          
          return {
            id: generateSubId(taskId, idx),
            text: subtaskText,
            completed: false,
            weight: subtaskWeight,
            requiresInput: subtaskRequiresInput,
            inputValue: ''
          }
        }),
        progressRecords: []
      }
      
      context.todoStore.todos.push(task)
      await window.electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
      
      currentDay++
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`创建第${dayNumber}天任务失败:`, error)
      currentDay++
    }
  }
}

// ==================== 所有工具函数定义和实现 ====================

/**
 * 任务抽离出来，因为任务太长了
 */
// 12. 添加单个新任务
let addTask = new AIFunction(
  createTool(
    'addTask',
    '为项目添加一个新任务。用于补充单个任务，如"添加一个部署任务"、"增加代码审查任务"等',
    {
      projectId: {
        type: 'string',
        description: '要添加任务的项目ID'
      },
      taskDescription: {
        type: 'string',
        description: '新任务的描述，包括任务内容、要求等'
      },
      position: {
        type: 'string',
        enum: ['beginning', 'end', 'after'],
        description: '插入位置：beginning=开头, end=结尾, after=指定任务之后'
      },
      afterTaskId: {
        type: 'string',
        description: '如果position为after，指定在哪个任务之后插入'
      }
    },
    ['projectId', 'taskDescription', 'position']
  ),
  async function(args, onProgress = null) {
    const { projectId, taskDescription, position, afterTaskId } = args
    
    if (!this.client) {
      throw new Error('AI 客户端未初始化')
    }
    
    const project = this.projectStore.projects.find(p => p.id === projectId)
    if (!project) {
      throw new Error(`找不到ID为${projectId}的项目`)
    }
    
    const projectTasks = this.todoStore.todos.filter(t => t.projectId === projectId)
    
    if (onProgress) onProgress(`🤔 正在为项目"${project.name}"生成新任务...`)
    
    let dueDate
    if (position === 'beginning' && projectTasks.length > 0) {
      const firstTask = projectTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
      dueDate = new Date(firstTask.dueDate)
      dueDate.setDate(dueDate.getDate() - 1)
    } else if (position === 'after' && afterTaskId) {
      const afterTask = projectTasks.find(t => t.id === afterTaskId)
      if (afterTask) {
        dueDate = new Date(afterTask.dueDate)
        dueDate.setDate(dueDate.getDate() + 1)
      } else {
        dueDate = new Date()
      }
    } else {
      if (projectTasks.length > 0) {
        const lastTask = projectTasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0]
        dueDate = new Date(lastTask.dueDate)
        dueDate.setDate(dueDate.getDate() + 1)
      } else {
        dueDate = new Date()
      }
    }
    const dueDateStr = dueDate.toISOString().split('T')[0]
    
    const projectContext = projectTasks.length > 0 
      ? `\n【项目现有任务示例】：\n${projectTasks.slice(0, 3).map(t => `- ${t.text}\n  子任务数：${t.subtasks?.length || 0}`).join('\n')}`
      : ''
    
    const prompt = `你正在为项目"${project.name}"添加一个新任务。
${projectContext}

【新任务要求】：${taskDescription}
【截止日期】：${dueDateStr}
【插入位置】：${position === 'beginning' ? '项目开头' : position === 'after' ? '指定任务之后' : '项目结尾'}

请生成这个新任务。返回 JSON 对象格式：
{
"text": "任务标题（要简洁明确）",
      "priority": "high/medium/low",
"dueDate": "${dueDateStr}",
      "subtasks": [
  {
    "text": "子任务描述（要具体可执行）",
    "weight": 1-5,
    "requiresInput": false
    }
  ]
}

**重要要求**：
1. 任务标题要简洁明确，体现任务的核心内容
2. 子任务要具体可执行，数量建议 3-6 个
3. 子任务风格要与项目现有任务保持一致
4. 对于需要记录结果的关键步骤，设置 requiresInput: true
5. 权重（weight）：1=很简单，2=简单，3=中等，4=困难，5=很困难
6. 只返回 JSON 对象，不要其他内容`

    const content = await this.client.chatCompletions([
      { role: 'system', content: '你是一个专业的项目管理助手。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 2000 })
    
    if (onProgress) onProgress('📋 正在添加新任务...')
    
    let taskData
    try {
      taskData = JSON.parse(content.trim())
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        taskData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI 返回的任务格式不正确')
      }
    }
    
    const newTaskId = generateId()
    const newTask = {
      id: newTaskId,
      text: taskData.text,
      completed: false,
      priority: taskData.priority || 'medium',
      projectId: project.id,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: taskData.dueDate || dueDateStr,
      images: [],
      pinned: false,
      subtasks: (taskData.subtasks || []).map((st, idx) => ({
        id: generateSubId(newTaskId, idx),
        text: st.text,
        completed: false,
        weight: st.weight || 3,
        requiresInput: st.requiresInput || false,
        inputValue: '',
        createdAt: new Date().toISOString()
      })),
      progressRecords: []
    }
    
    if (position === 'beginning') {
      this.todoStore.todos.unshift(newTask)
    } else if (position === 'after' && afterTaskId) {
      const afterIndex = this.todoStore.todos.findIndex(t => t.id === afterTaskId)
      if (afterIndex !== -1) {
        this.todoStore.todos.splice(afterIndex + 1, 0, newTask)
      } else {
        this.todoStore.todos.push(newTask)
      }
    } else {
      this.todoStore.todos.push(newTask)
    }
    
    await window.electronAPI.addTodo(JSON.parse(JSON.stringify(newTask)))
    
    if (onProgress) onProgress(`🎉 成功为项目"${project.name}"添加新任务！`)
    
    return {
      success: true,
      taskId: newTask.id,
      taskText: newTask.text,
      projectId: project.id,
      projectName: project.name,
      subtasksCount: newTask.subtasks.length
    }
  }
)

// 8. 修改任务的子任务
let updateTaskSubtasks = new AIFunction(
  createTool(
    'updateTaskSubtasks',
    '修改指定任务的子任务列表。用于增加、删除或修改子任务，如"给第一个任务增加权限申请的子任务"、"删除第二个任务的第3个子任务"、"修改环境准备任务的子任务"等',
    {
      taskId: {
        type: 'string',
        description: '要修改的任务ID'
      },
      taskText: {
        type: 'string',
        description: '任务标题（用于AI确认是否是正确的任务）'
      },
      operation: {
        type: 'string',
        enum: ['add', 'delete', 'update', 'replace'],
        description: '操作类型：add=添加新子任务, delete=删除指定子任务, update=修改特定子任务, replace=完全替换所有子任务'
      },
      feedback: {
        type: 'string',
        description: '用户的具体要求，如"增加权限申请相关的子任务"、"删除第3个子任务"、"把子任务改得更详细一些"'
      }
    },
    ['taskId', 'operation', 'feedback']
  ),
  async function(args, onProgress = null) {
    const { taskId, taskText, operation, feedback } = args
    
    if (!this.client) {
      throw new Error('AI 客户端未初始化')
    }
    
    const task = this.todoStore.todos.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`找不到ID为${taskId}的任务`)
    }
    
    const project = this.projectStore.projects.find(p => p.id === task.projectId)
    const projectName = project ? project.name : '未分类'
    
    if (onProgress) onProgress(`🤔 正在分析对任务"${task.text}"的子任务修改要求...`)
    
    const currentSubtasks = (task.subtasks || []).map((st, idx) => ({
      index: idx + 1,
      text: st.text,
      weight: st.weight,
      completed: st.completed,
      requiresInput: st.requiresInput
    }))
    
    const operationDesc = {
      add: '添加新的子任务',
      delete: '删除指定的子任务',
      update: '修改现有子任务',
      replace: '完全替换所有子任务'
    }
    
    const prompt = `你正在帮助用户修改任务的子任务列表。

【任务信息】：
- 所属项目：${projectName}
- 任务标题：${task.text}
- 当前子任务数量：${currentSubtasks.length}个

【当前子任务列表】：
${JSON.stringify(currentSubtasks, null, 2)}

【操作类型】：${operationDesc[operation]}
【用户要求】：${feedback}

请根据用户的要求，生成修改后的子任务列表。返回 JSON 数组格式：
[
{
  "text": "子任务描述（要具体可执行）",
  "weight": 1-5,
  "requiresInput": false,
  "completed": false
}
]

**重要要求**：
1. **${operation === 'add' ? '在现有子任务基础上添加新子任务' : operation === 'delete' ? '删除用户指定的子任务，保留其他' : operation === 'update' ? '根据要求修改特定子任务，其他保持不变' : '完全重新生成所有子任务'}**
2. ${operation === 'replace' ? '不需要' : '需要'}保留已完成子任务的完成状态（completed: true）
3. 子任务要具体可执行，避免含糊描述
4. 对于需要记录结果的关键步骤，设置 requiresInput: true（如：记录配置信息、填写测试结果等）
5. 权重（weight）：1=很简单，2=简单，3=中等，4=困难，5=很困难
6. 只返回 JSON 数组，不要其他内容`

    const content = await this.client.chatCompletions([
      { role: 'system', content: '你是一个专业的项目管理助手，擅长将任务细化为具体可执行的子任务。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 3000 })
    
    if (onProgress) onProgress('📋 正在应用子任务修改...')
    
    let newSubtasks
    try {
      newSubtasks = JSON.parse(content.trim())
    } catch (e) {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        newSubtasks = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI 返回的子任务列表格式不正确')
      }
    }
    
    if (!Array.isArray(newSubtasks)) {
      throw new Error('子任务列表结构不正确')
    }
    
    const oldSubtasksCount = task.subtasks ? task.subtasks.length : 0
    
    task.subtasks = newSubtasks.map((st, idx) => {
      const originalSubtask = task.subtasks?.[idx]
      
      return {
        id: originalSubtask?.id || generateSubId(task.id, idx),
        text: st.text,
        completed: st.completed || false,
        weight: st.weight || 3,
        requiresInput: st.requiresInput || false,
        inputValue: originalSubtask?.inputValue || '',
        completedAt: st.completed && originalSubtask?.completedAt ? originalSubtask.completedAt : null,
        createdAt: originalSubtask?.createdAt || new Date().toISOString()
      }
    })
    
    // 批量替换子任务到数据库（遵循 Electron IPC 传参规则）
    await window.electronAPI.replaceSubtasks(task.id, JSON.parse(JSON.stringify(task.subtasks)))
    
    const changeDesc = operation === 'add' ? `新增 ${newSubtasks.length - oldSubtasksCount} 个子任务`
      : operation === 'delete' ? `删除 ${oldSubtasksCount - newSubtasks.length} 个子任务`
      : operation === 'update' ? '已更新子任务'
      : `已替换为 ${newSubtasks.length} 个新子任务`
    
    if (onProgress) onProgress(`🎉 任务"${task.text}"的子任务已更新！${changeDesc}`)
    
    return {
      success: true,
      taskId: task.id,
      taskText: task.text,
      operation,
      oldSubtasksCount,
      newSubtasksCount: newSubtasks.length,
      changeDesc
    }
  }
)

// 7. 为项目添加新任务
let addProjectTasks = new AIFunction(
  createTool(
    'addProjectTasks',
    '为现有项目添加新任务。用于扩展项目、增加新的每日任务或补充内容，如"再添加7天任务"、"增加第31-40天的内容"等',
    {
      projectId: {
        type: 'string',
        description: '要添加任务的项目ID'
      },
      description: {
        type: 'string',
        description: '新任务的描述，包括要添加的内容、天数、具体要求等'
      },
      startDay: {
        type: 'number',
        description: '从第几天开始添加（可选，默认为项目现有任务数+1）'
      }
    },
    ['projectId', 'description']
  ),
  async function(args, onProgress = null) {
    const { projectId, description, startDay } = args
    
    if (!this.client) {
      throw new Error('AI 客户端未初始化')
    }
    
    const project = this.projectStore.projects.find(p => p.id === projectId)
    if (!project) {
      throw new Error(`找不到ID为${projectId}的项目`)
    }
    
    const projectTasks = this.todoStore.todos.filter(t => t.projectId === projectId)
    const currentTaskCount = projectTasks.length
    const actualStartDay = startDay || (currentTaskCount + 1)
    
    if (onProgress) onProgress(`🤔 正在分析要添加的任务...`)
    
    let startDate
    if (projectTasks.length > 0) {
      const lastTask = projectTasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0]
      startDate = new Date(lastTask.dueDate)
      startDate.setDate(startDate.getDate() + 1)
    } else {
      startDate = new Date()
    }
    const startDateStr = startDate.toISOString().split('T')[0]
    
    const daysMatch = description.match(/(\d+)\s*[天日]/)
    const daysToAdd = daysMatch ? parseInt(daysMatch[1]) : 7
    
    const prompt = `你正在为项目"${project.name}"添加新的任务。

【项目信息】：
- 项目名称：${project.name}
- 现有任务数：${currentTaskCount}个
- 新任务起始编号：第${actualStartDay}天
- 新任务起始日期：${startDateStr}

【添加要求】：${description}

请生成要添加的任务列表。返回 JSON 数组格式：
[
  {
    "text": "第${actualStartDay}天 - 任务标题",
    "priority": "medium",
    "dueDate": "${startDateStr}",
    "subtasks": [
      {"text": "子任务描述", "weight": 3, "requiresInput": false}
    ]
  }
]

**重要要求**：
1. 任务编号从第${actualStartDay}天开始
2. 日期从 ${startDateStr} 开始，每天递增
3. 任务风格和难度要与项目现有任务保持一致
4. 子任务要具体可执行
5. 对需要记录结果的子任务设置 requiresInput: true
6. 只返回 JSON 数组，不要其他内容`

    const content = await this.client.chatCompletions([
      { role: 'system', content: '你是一个专业的项目管理助手。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 8000 })
    
    if (onProgress) onProgress('📋 正在解析新任务...')
    
    let newTasks
    try {
      newTasks = JSON.parse(content.trim())
    } catch (e) {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        newTasks = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI 返回的任务列表格式不正确')
      }
    }
    
    if (!Array.isArray(newTasks)) {
      throw new Error('任务列表结构不正确')
    }
    
    const addedTasks = []
    
    for (let i = 0; i < newTasks.length; i++) {
      const taskData = newTasks[i]
      
      if (onProgress) {
        onProgress(`✅ 正在添加第 ${actualStartDay + i} 天的任务... (${Math.round(((i + 1) / newTasks.length) * 100)}%)`)
      }
      
      let taskDate = taskData.dueDate
      if (!taskDate) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        taskDate = date.toISOString().split('T')[0]
      }
      
      const taskId = generateId()
      const task = {
        id: taskId,
        text: taskData.text,
        completed: false,
        priority: taskData.priority || 'medium',
        projectId: project.id,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: taskDate,
        images: [],
        pinned: false,
        subtasks: (taskData.subtasks || []).map((st, idx) => ({
          id: generateSubId(taskId, idx),
          text: st.text,
          completed: false,
          weight: st.weight || 3,
          requiresInput: st.requiresInput || false,
          inputValue: ''
        })),
        progressRecords: []
      }
      
      this.todoStore.todos.push(task)
      addedTasks.push(task)
      await window.electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
      
      if (i < newTasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    if (onProgress) onProgress(`🎉 成功为项目"${project.name}"添加 ${addedTasks.length} 个新任务！`)
    
    return {
      success: true,
      projectId: project.id,
      projectName: project.name,
      tasksAdded: addedTasks.length,
      startDay: actualStartDay,
      endDay: actualStartDay + addedTasks.length - 1
    }
  }
)

const allFunctions = [
  // 1. 获取今天添加的任务列表
  new AIFunction(
    createTool(
      'getTodayTasks',
      '获取今天添加的任务列表，包括任务内容、优先级、完成状态、子任务等信息'
    ),
    async function(args) {
      let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return todos.filter(task => {
        const taskDate = new Date(task.createdAt)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === today.getTime()
      })
    }
  ),

  // 2. 获取所有任务列表
  new AIFunction(
    createTool(
      'getAllTasks',
      '获取所有任务列表，包括已完成和未完成的任务',
      {
        includeCompleted: {
          type: 'boolean',
          description: '是否包括已完成的任务，默认为 true'
        }
      }
    ),
    async function(args) {
      const { includeCompleted = true } = args
      let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
      return includeCompleted ? todos : todos.filter(t => !t.completed)
    }
  ),

  // 3. 获取指定项目下的任务
  new AIFunction(
    createTool(
      'getTasksByProject',
      '获取指定项目下的任务',
      {
        projectId: {
          type: 'string',
          description: '项目 ID，如果为 null 则获取未分类的任务'
        }
      },
      ['projectId']
    ),
    async function(args) {
      const { projectId } = args
      const targetProjectId = projectId === 'null' || projectId === null 
        ? null 
        : Number(projectId)
      
      let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
      return todos.filter(t => t.projectId === targetProjectId)
    }
  ),

  // 4. 获取所有项目列表
  new AIFunction(
    createTool(
      'getProjects',
      '获取所有项目列表，包括项目名称、颜色、统计信息等'
    ),
    async function() {
      const projects = this.projectStore.projects || []
      const todos = this.todoStore.todos || []
      
      return projects.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        taskCount: todos.filter(t => t.projectId === p.id).length,
        completedCount: todos.filter(t => t.projectId === p.id && t.completed).length
      }))
    }
  ),

  // 5. 搜索包含关键词的任务
  new AIFunction(
    createTool(
      'searchTasks',
      '搜索包含关键词的任务',
      {
        keyword: {
          type: 'string',
          description: '搜索关键词'
        }
      },
      ['keyword']
    ),
    async function(args) {
      const { keyword } = args
      const keywordLower = keyword.toLowerCase()
      let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
      
      return todos.filter(t => 
        t.text.toLowerCase().includes(keywordLower) ||
        (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(keywordLower)))
      )
    }
  ),

  // 6. 创建项目并生成任务
  new AIFunction(
    createTool(
      'createProjectWithTasks',
      '根据用户描述智能创建项目并生成任务和子任务。适用于制定计划、项目管理等场景，如"减肥计划30天"、"学习Python课程"等',
      {
        description: {
          type: 'string',
          description: '项目描述，包括项目目标、时间范围、具体要求等信息'
        },
        projectName: {
          type: 'string',
          description: '项目名称，如果用户未明确指定，可以从描述中提取'
        }
      },
      ['description', 'projectName']
    ),
    async function(args, onProgress = null) {
      const { description, projectName } = args
      
      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }
      
      // 检测是否是多天计划（用于渐进式创建）
      const daysMatch = description.match(/(\d+)\s*[天日]/)
      const totalDays = daysMatch ? parseInt(daysMatch[1]) : 0
      const isProgressiveMode = totalDays > 1
      
      // 检测任务类型
      const isDailyPlan = /[天日]/.test(description) && totalDays > 0
      const isTechProject = /开发|接入|实现|集成|部署|配置|SDK|API|demo|项目/.test(description)
      const isLearningPlan = /学习|掌握|了解|课程/.test(description)
      
      if (onProgress) onProgress('🤔 正在分析需求，生成项目计划...')
      
      // 获取今天的日期
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      // 调用 AI 生成项目信息和初始任务
      const batchSize = 1
      const promptDays = isProgressiveMode ? Math.min(batchSize, totalDays) : totalDays
      
      const taskTypeHint = isDailyPlan ? '这是一个每日计划，需要按天分解任务。' 
        : isTechProject ? '这是一个技术项目，需要按开发阶段/功能模块分解任务。'
        : isLearningPlan ? '这是一个学习计划，需要按知识点/章节分解任务。'
        : '根据项目性质合理分解任务。'
      
      const prompt = `根据描述生成项目计划。${isProgressiveMode ? `${totalDays}天计划，现生成前${promptDays}天。` : ''}

日期：${todayStr}(今天) | 描述：${description} | 名称：${projectName} | 类型：${taskTypeHint}${isProgressiveMode ? ` | 总${totalDays}天，本批${promptDays}天` : ''}

返回格式（简写字段节省token）：
{
  "p": {"n": "项目名", "c": "#8A9DFB"},
  "t": [
    {
      "tx": "任务标题",
      "pr": "h/m/l",
      "dd": "${todayStr}",
      "s": [
        {"tx": "子任务", "w": 3, "r": 0}
      ]
    }
  ]
}

字段说明：p=project, n=name, c=color, t=tasks, tx=text, pr=priority(h/m/l), dd=dueDate, s=subtasks, w=weight(1-5), r=requiresInput(0/1)

要求：
1. ${isDailyPlan ? `每日计划：任务命名"第N天 - 描述"，${isProgressiveMode ? `生成${promptDays}天` : `生成${totalDays}天`}，日期从${todayStr}连续递增，子任务具体可执行` : isTechProject ? '技术项目：按阶段划分(环境→开发→测试→部署)，任务具体，子任务细化到可执行步骤' : isLearningPlan ? '学习计划：按知识点/章节划分，含理论+实践+总结' : '合理分解任务'}
2. 任务数${isDailyPlan ? (isProgressiveMode ? promptDays : totalDays) : '5-15'}个，每个3-8个子任务
3. 优先级：前期m，中期h，后期m
4. 需记录结果的子任务设r=1（如：测体重、记录配置）
5. 颜色可选：#8A9DFB/#FF6B6B/#4ECDC4/#95E1D3
6. 只返回JSON，无其他文字`

      const messages = [
        {
          role: 'system',
          content: '你是一个专业的项目管理助手，擅长将用户的想法转化为结构化、可执行的项目计划。你特别擅长制定每日计划，能够将长期目标拆解为具体的每日任务清单，类似于打卡系统。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
      
      const content = await this.client.chatCompletions(messages, { maxTokens: 8000 })
      
      if (onProgress) onProgress('📋 项目计划已生成，正在解析...')
      
      // 解析 JSON
      let projectPlan
      try {
        projectPlan = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          projectPlan = JSON.parse(jsonMatch[0])
      } else {
          console.error('AI 返回内容:', content)
          throw new Error('AI 返回的项目计划格式不正确')
        }
      }
      
      // 验证项目计划结构
      const projectData = projectPlan.p || projectPlan.project
      const tasksData = projectPlan.t || projectPlan.tasks
      
      if (!projectData || !tasksData || !Array.isArray(tasksData)) {
        console.error('项目计划结构不完整:', projectPlan)
        throw new Error('项目计划结构不完整，缺少必要字段')
      }
      
      const finalProjectName = projectData.n || projectData.name || projectName
      if (onProgress) onProgress(`📁 正在创建项目"${finalProjectName}"...`)
      
      // 创建项目
      const projectColor = projectData.c || projectData.color || '#8A9DFB'
      const project = {
        id: generateId(),
        name: finalProjectName,
        color: projectColor,
        createdAt: new Date().toISOString()
      }
      
      this.projectStore.projects.push(project)
      this.projectStore.currentProjectId = project.id
      await window.electronAPI.addProject(JSON.parse(JSON.stringify(project)))
      await window.electronAPI.setCurrentProject(project.id)
      
      // 创建第一批任务
      const createdTasks = []
      const firstBatchTasks = tasksData
      
      for (let i = 0; i < firstBatchTasks.length; i++) {
        const taskData = firstBatchTasks[i]
        
        const dayNumber = i + 1
        const overallProgress = isProgressiveMode 
          ? Math.round((dayNumber / totalDays) * 100)
          : Math.round((dayNumber / firstBatchTasks.length) * 100)
        
        if (onProgress) {
          onProgress(`✅ 正在创建第 ${dayNumber} 天的任务... ${isProgressiveMode ? `(${overallProgress}%)` : ''}`)
        }
        
        const taskText = taskData.tx || taskData.text
        const taskPriority = taskData.pr || taskData.priority
        const taskDueDate = taskData.dd || taskData.dueDate
        const taskSubtasks = taskData.s || taskData.subtasks || []
        
        let finalDueDate = taskDueDate
        if (!finalDueDate) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + i)
          finalDueDate = dueDate.toISOString().split('T')[0]
        }
        
        let priority = 'medium'
        if (taskPriority === 'h' || taskPriority === 'high') priority = 'high'
        else if (taskPriority === 'l' || taskPriority === 'low') priority = 'low'
        else if (taskPriority === 'm' || taskPriority === 'medium') priority = 'medium'
        else if (taskPriority) priority = taskPriority
        
        const taskId = generateId()
        const task = {
          id: taskId,
          text: taskText,
      completed: false,
          priority,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      completedAt: null,
          dueDate: finalDueDate,
      images: [],
      pinned: false,
          subtasks: taskSubtasks.map((st, idx) => {
            const subtaskText = st.tx || st.text
            const subtaskWeight = st.w || st.weight || 3
            const subtaskRequiresInput = st.r === 1 || st.r === true || st.requiresInput === true
            
            return {
              id: generateSubId(taskId, idx),
              text: subtaskText,
        completed: false,
              weight: subtaskWeight,
              requiresInput: subtaskRequiresInput,
              inputValue: ''
            }
          }),
      progressRecords: []
    }
    
        this.todoStore.todos.push(task)
        createdTasks.push(task)
        await window.electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
        
        if (i < firstBatchTasks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      // 如果是渐进模式且还有剩余天数，继续创建
      if (isProgressiveMode && firstBatchTasks.length < totalDays) {
        const baseDate = new Date(today)
        await createRemainingDays(this, project, totalDays, firstBatchTasks.length, description, onProgress, baseDate)
      }
      
      if (onProgress) onProgress(`🎉 项目"${finalProjectName}"创建成功！共创建 ${this.todoStore.todos.filter(t => t.projectId === project.id).length} 个任务 (100%)`)
    
    return {
      success: true,
      projectId: project.id,
        projectName: finalProjectName,
        tasksCreated: createdTasks.length
      }
    }
  ),
  // 9. 直接编辑子任务
  new AIFunction(
    createTool(
      'editSubtask',
      '直接编辑指定子任务的属性（文本、权重、是否需要输入等）。用于精确修改单个子任务，如"把第一个任务的第2个子任务的权重改为5"、"修改子任务的描述为XX"等',
      {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        subtaskId: {
          type: 'string',
          description: '子任务ID'
        },
        updates: {
          type: 'object',
          description: '要更新的字段，可包含：text（文本）、weight（权重1-5）、requiresInput（是否需要输入）',
          properties: {
            text: {
              type: 'string',
              description: '新的子任务文本'
            },
            weight: {
              type: 'number',
              description: '权重（1-5）'
            },
            requiresInput: {
              type: 'boolean',
              description: '是否需要输入'
            }
          }
        }
      },
      ['taskId', 'subtaskId', 'updates']
    ),
    async function(args, onProgress = null) {
    const { taskId, subtaskId, updates } = args
    
    const task = this.todoStore.todos.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`找不到ID为${taskId}的任务`)
    }
    
    const subtaskIndex = task.subtasks?.findIndex(st => st.id === subtaskId)
    if (subtaskIndex === undefined || subtaskIndex === -1) {
      throw new Error(`在任务"${task.text}"中找不到ID为${subtaskId}的子任务`)
    }
    
    const subtask = task.subtasks[subtaskIndex]
    const oldText = subtask.text
    
    if (onProgress) onProgress(`✏️ 正在编辑子任务"${oldText}"...`)
    
    if (updates.text !== undefined) {
      subtask.text = updates.text
    }
    if (updates.weight !== undefined) {
      subtask.weight = Math.max(1, Math.min(5, updates.weight))
    }
    if (updates.requiresInput !== undefined) {
      subtask.requiresInput = updates.requiresInput
    }
    
    // 更新单个子任务到数据库（遵循 Electron IPC 传参规则）
    await window.electronAPI.updateSubtask(subtask.id, JSON.parse(JSON.stringify({
      text: subtask.text,
      weight: subtask.weight,
      requiresInput: subtask.requiresInput
    })))
    
    const changes = []
    if (updates.text !== undefined) changes.push(`文本: "${oldText}" → "${updates.text}"`)
    if (updates.weight !== undefined) changes.push(`权重: ${updates.weight}`)
    if (updates.requiresInput !== undefined) changes.push(`需要输入: ${updates.requiresInput ? '是' : '否'}`)
    
    if (onProgress) onProgress(`✅ 子任务已更新！${changes.join(', ')}`)
    
    return {
      success: true,
      taskId: task.id,
      taskText: task.text,
      subtaskId: subtask.id,
      subtaskText: subtask.text,
      changes: changes.join(', ')
    }
  }
  ),

  // 10. 删除子任务（支持单个或批量）
  new AIFunction(
    createTool(
      'deleteSubtasks',
      '删除指定任务的一个或多个子任务。用于移除不需要的子任务，如"删除第一个任务的第2个子任务"、"删除第一个任务的第2、3、5个子任务"、"把环境准备的前3个子任务删掉"等',
      {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        subtaskIds: {
          type: 'array',
          description: '要删除的子任务ID数组，如 [123, 456] 或单个ID [123]',
          items: {
            type: 'string'
          }
        }
      },
      ['taskId', 'subtaskIds']
    ),
    async function(args, onProgress = null) {
      const { taskId, subtaskIds } = args
      
      const task = this.todoStore.todos.find(t => t.id === taskId)
      if (!task) {
        throw new Error(`找不到ID为${taskId}的任务`)
      }
      
      // 确保 subtaskIds 是数组
      const idsToDelete = Array.isArray(subtaskIds) ? subtaskIds : [subtaskIds]
      
      if (idsToDelete.length === 0) {
        throw new Error('未指定要删除的子任务')
      }
      
      // 查找要删除的子任务（在删除前收集信息用于显示）
      const subtasksToDelete = []
      const notFoundIds = []
      
      for (const id of idsToDelete) {
        const subtask = task.subtasks?.find(st => st.id === id)
        if (subtask) {
          subtasksToDelete.push(subtask)
        } else {
          notFoundIds.push(id)
        }
      }
      
      if (notFoundIds.length > 0) {
        throw new Error(`在任务"${task.text}"中找不到以下子任务ID: ${notFoundIds.join(', ')}`)
      }
      
      if (subtasksToDelete.length === 0) {
        throw new Error(`未找到要删除的子任务`)
      }
      
      // 显示进度
      const deleteCount = subtasksToDelete.length
      const subtaskNames = subtasksToDelete.map(st => st.text).join('、')
      
      if (onProgress) {
        if (deleteCount === 1) {
          onProgress(`🗑️ 正在删除子任务"${subtaskNames}"...`)
        } else {
          onProgress(`🗑️ 正在删除 ${deleteCount} 个子任务...`)
        }
      }
      
      // 执行删除（批量调用 todoStore.deleteSubtask）
      await Promise.all(idsToDelete.map(id => this.todoStore.deleteSubtask(taskId, id)))
      
      if (onProgress) {
        if (deleteCount === 1) {
          onProgress(`✅ 子任务"${subtaskNames}"已删除！`)
        } else {
          onProgress(`✅ 已删除 ${deleteCount} 个子任务！`)
        }
      }
    
      return {
        success: true,
        taskId: task.id,
        taskText: task.text,
        deletedCount: deleteCount,
        deletedSubtasks: subtasksToDelete.map(st => ({
          id: st.id,
          text: st.text
        })),
        remainingSubtasks: task.subtasks.length
      }
    }
  ),

  // 11. 删除任务（支持单个或批量）
  new AIFunction(
    createTool(
      'deleteTasks',
      '删除一个或多个指定的任务。用于移除不需要的任务，如"删除第3个任务"、"删除第2、3、5个任务"、"删除环境准备和测试部署这两个任务"等',
      {
        taskIds: {
          type: 'array',
          description: '要删除的任务ID数组，如 ["123", "456"] 或单个ID ["123"]',
          items: {
            type: 'string'
          }
        },
        taskTexts: {
          type: 'array',
          description: '任务标题数组（用于确认，可选）',
          items: {
            type: 'string'
          }
        }
      },
      ['taskIds']
    ),
    async function(args, onProgress = null) {
      const { taskIds, taskTexts } = args
      
      // 确保 taskIds 是数组
      const idsToDelete = Array.isArray(taskIds) ? taskIds : [taskIds]
      
      if (idsToDelete.length === 0) {
        throw new Error('未指定要删除的任务')
      }
      
      // 查找要删除的任务
      const tasksToDelete = []
      const notFoundIds = []
      
      for (const id of idsToDelete) {
        const task = this.todoStore.todos.find(t => t.id === id)
        if (task) {
          tasksToDelete.push(task)
        } else {
          notFoundIds.push(id)
        }
      }
      
      if (notFoundIds.length > 0) {
        throw new Error(`找不到以下任务ID: ${notFoundIds.join(', ')}`)
      }
      
      if (tasksToDelete.length === 0) {
        throw new Error('未找到要删除的任务')
      }
      
      // 显示进度
      const deleteCount = tasksToDelete.length
      const taskNames = tasksToDelete.map(t => t.text).join('、')
      
      if (onProgress) {
        if (deleteCount === 1) {
          onProgress(`🗑️ 正在删除任务"${taskNames}"...`)
          } else {
          onProgress(`🗑️ 正在删除 ${deleteCount} 个任务...`)
        }
      }
      
      // 批量删除（异步并发执行，deleteTask 内部会处理 todos 数组的更新）
      await Promise.all(idsToDelete.map(id => this.todoStore.deleteTask(id)))
      
      if (onProgress) {
        if (deleteCount === 1) {
          onProgress(`✅ 任务"${taskNames}"已删除！`)
        } else {
          onProgress(`✅ 已删除 ${deleteCount} 个任务！`)
        }
      }
            
            return {
        success: true,
        deletedCount: deleteCount,
        deletedTasks: tasksToDelete.map(t => ({
          id: t.id,
          text: t.text,
          projectId: t.projectId
        }))
      }
    }
  ),
  addProjectTasks,
  updateTaskSubtasks,
  addTask
]

// 导出工具定义列表供 AI 使用
export const availableTools = allFunctions.map(func => func.functionDef)
console.log(availableTools, 'availableTools')

/**
 * AI 工具类
 * 使用方式：
 *   const aiTool = new AITool(stores, client, selectedProjectIds)
 *   if (aiTool[functionName]) {
 *     const result = await aiTool.execute(functionName, args, onProgress)
 *   }
 */
export class AITool {
  constructor(stores, client = null, selectedProjectIds = []) {
    this.todoStore = stores.todoStore
    this.projectStore = stores.projectStore
    this.client = client
    this.selectedProjectIds = selectedProjectIds
  }

  /**
   * 统一执行入口
   * @param {string} functionName - 函数名
   * @param {object} args - 参数
   * @param {function} onProgress - 进度回调（可选）
   * @returns {Promise<any>} 执行结果
   */
  async execute(functionName, args = {}, onProgress = null) {
    const func = allFunctions.find(f => f.functionDef.function.name === functionName)
    if (!func) {
      throw new Error(`未知的工具函数: ${functionName}`)
    }
    return await func.execute(this, args, onProgress)
  }
}
