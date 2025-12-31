// AI 工具类 - 封装所有 AI 可调用的工具函数
import { generateId, generateSubId } from './tools'
import { parseJsonArrayFromText, parseJsonObjectFromText } from './llm_utils.js'

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

function mapTaskForTool(task) {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed === true,
    priority: task.priority || 'medium',
    projectId: task.projectId ?? null,
    dueDate: task.dueDate || null,
    pinned: task.pinned === true,
    status: task.status || null,
    subtasks: (task.subtasks || []).map(st => ({
      id: st.id,
      text: st.text,
      completed: st.completed === true,
      weight: st.weight || 3,
      requiresInput: st.requiresInput === true,
      inputValue: st.inputValue || ''
    }))
  }
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
    
    const prompt = `你正在为项目"${project.name}"生成渐进式任务计划。

【项目上下文】
- 项目名称：${project.name}
- 项目描述：${description}
- 当前任务：第 ${dayNumber} 天 / 共 ${totalDays} 天
- 任务日期：${taskDateStr}
- 整体进度：${overallProgress}%

【任务要求】
1. 任务标题格式：第${dayNumber}天 - [具体内容描述]
2. 子任务要求：3-6个，具体可执行，循序渐进
3. 难度设置：权重分布合理(简单1-2，中等3，困难4-5)
4. 记录节点：关键成果需要记录的子任务设置r=1(如：记录学习笔记、保存配置信息)

【返回格式】严格JSON，无其他文字：
{"tx": "第${dayNumber}天 - 标题", "pr": "m", "dd": "${taskDateStr}", "s": [{"tx": "具体可执行的子任务", "w": 3, "r": 0}]}

字段说明：tx=任务文本, pr=优先级(h/m/l), dd=截止日期, s=子任务数组, w=权重(1-5), r=需要记录(0/1)`

    try {
      const content = await context.client.chatCompletionsText([
        { role: 'system', content: '你是一个专业的项目管理助手。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 1500, signal: context.signal })
      
      const taskData = parseJsonObjectFromText(content)
      if (!taskData) {
        console.error('AI返回内容:', content)
        console.error(`第${dayNumber}天任务生成失败，跳过`)
        currentDay++
        continue
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

【项目上下文】
- 项目名称：${project.name}
- 现有任务示例：${projectContext}

【新任务信息】
- 任务描述：${taskDescription}
- 截止日期：${dueDateStr}
- 插入位置：${position === 'beginning' ? '项目开头（优先级较高）' : position === 'after' ? '指定任务之后（衔接前置任务）' : '项目结尾（后续任务）'}

【任务生成要求】
1. **标题设计**：简洁明确，体现任务核心价值，10-20字为宜
2. **子任务拆解**：3-6个具体可执行的步骤，遵循SMART原则（具体、可衡量、可实现）
3. **风格一致性**：参考现有任务的描述方式和粒度，保持项目整体统一
4. **权重分配**：合理分布难度
   - 1-2：简单操作，5-15分钟
   - 3：标准任务，15-30分钟
   - 4-5：复杂任务，30分钟以上
5. **记录节点**：关键步骤需设置 requiresInput: true（如：配置结果、测试数据、学习总结）
6. **优先级判断**：
   - high: 紧急/阻塞性任务
   - medium: 常规任务
   - low: 优化/非核心任务

【返回格式】严格JSON，无其他文字：
{
  "text": "任务标题",
  "priority": "medium",
  "dueDate": "${dueDateStr}",
  "subtasks": [
    {"text": "具体子任务描述", "weight": 3, "requiresInput": false}
  ]
}`

    const content = await this.client.chatCompletionsText([
      { role: 'system', content: '你是一个专业的项目管理助手。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 2000, signal: this.signal })
    
    if (onProgress) onProgress('📋 正在添加新任务...')
    
    const taskData = parseJsonObjectFromText(content)
    if (!taskData) throw new Error('AI 返回的任务格式不正确')
    
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
    
    const prompt = `你正在帮助用户修改任务的子任务列表，需要准确理解用户意图并执行相应操作。

【任务上下文】
- 所属项目：${projectName}
- 任务标题：${task.text}
- 当前子任务数量：${currentSubtasks.length} 个
- 已完成子任务：${currentSubtasks.filter(st => st.completed).length} 个

【当前子任务详情】
${currentSubtasks.map((st, idx) =>
  `${idx + 1}. ${st.text} ${st.completed ? '✅' : '⭕'} [权重:${st.weight}] ${st.requiresInput ? '[需记录]' : ''}`
).join('\n')}

【操作信息】
- 操作类型：${operationDesc[operation]}
- 用户要求：${feedback}

【操作指南】
${operation === 'add'
  ? '➕ 添加模式：在现有子任务基础上添加新子任务，保持原有子任务不变，新增子任务应与现有任务衔接自然'
  : operation === 'delete'
  ? '🗑️ 删除模式：精确识别并删除用户指定的子任务（通过序号/描述/关键词匹配），保留其他子任务'
  : operation === 'update'
  ? '✏️ 更新模式：精确修改用户指定的子任务，其他子任务保持原样，已完成状态必须保留'
  : '🔄 替换模式：完全重新设计子任务列表，无需保留原有内容，可以优化结构和顺序'}

【子任务设计标准】
1. **具体性**：每个子任务都是明确的、单一的行动步骤
2. **可执行性**：描述清晰，执行者能立即理解并开始操作
3. **合理性**：逻辑顺序正确，前置依赖明确
4. **完整性**：覆盖任务的所有关键环节
5. **权重准确**：
   - 1-2：简单快速（5-15分钟），如：查阅文档、创建文件
   - 3：标准任务（15-30分钟），如：编写代码、配置环境
   - 4-5：复杂耗时（30分钟+），如：系统调试、综合测试
6. **记录设置**：需要保存结果、填写数据、记录笔记的步骤设置 requiresInput: true

【返回格式】严格JSON数组，无其他文字：
[
  {"text": "具体可执行的子任务描述", "weight": 3, "requiresInput": false, "completed": false}
]

${operation !== 'replace' ? '⚠️ 重要：必须保留已完成子任务的 completed: true 状态！' : ''}`

    const content = await this.client.chatCompletionsText([
      { role: 'system', content: '你是一个专业的项目管理助手，擅长将任务细化为具体可执行的子任务。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 3000, signal: this.signal })
    
    if (onProgress) onProgress('📋 正在应用子任务修改...')
    
    const newSubtasks = parseJsonArrayFromText(content)
    if (!Array.isArray(newSubtasks) || newSubtasks.length === 0) {
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
      days: {
        type: 'number',
        description: '要生成的任务天数/条数（可选，默认从描述中解析或 7，建议 1-30）'
      },
      detailLevel: {
        type: 'string',
        enum: ['brief', 'normal', 'detailed'],
        description: '计划细化程度：brief=更快更简洁，normal=默认，detailed=更细更慢（可选）'
      },
      startDay: {
        type: 'number',
        description: '从第几天开始添加（可选，默认为项目现有任务数+1）'
      }
    },
    ['projectId', 'description']
  ),
  async function(args, onProgress = null) {
    const { projectId, description, startDay, days, detailLevel = 'normal' } = args
    
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
    
    if (onProgress) onProgress('正在分析要添加的任务...')
    
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
    const parsedDays = daysMatch ? parseInt(daysMatch[1]) : null
    const requestedDays = Math.min(Math.max(Number(days || parsedDays || 7), 1), 30)

    const sortedByDueDate = projectTasks
      .filter(t => t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    const recentExamples = sortedByDueDate.slice(-3).map(t => t.text).filter(Boolean)

    const subtaskCountHint =
      detailLevel === 'brief' ? '2-4' : detailLevel === 'detailed' ? '5-8' : '3-6'

    const prompt = `为项目添加后续任务计划（要求更快、更稳、更具体）。

项目：${project.name}
现有任务数：${currentTaskCount}
起始：第${actualStartDay}天，日期从${startDateStr}开始
需要生成：${requestedDays}个任务（严格等于${requestedDays}个）
子任务数量：每个${subtaskCountHint}个
${recentExamples.length ? `现有任务示例：\n- ${recentExamples.join('\n- ')}` : ''}

新增需求：${description}

输出要求：
1) 任务标题：第N天 - 具体内容（10-20字），N从${actualStartDay}递增
2) dueDate：从${startDateStr}起逐日递增（每天+1）
3) subtasks：可执行步骤，weight=1-5，需记录成果的步骤 requiresInput=true
4) 只输出 JSON 数组（不要解释、不要Markdown、不要代码块）

返回示例：
[
  {"text":"第${actualStartDay}天 - ...","priority":"medium","dueDate":"${startDateStr}","subtasks":[{"text":"...","weight":3,"requiresInput":false}]}
]`

    const maxTokens = Math.min(1200 + requestedDays * 220, 3500)
    const content = await this.client.chatCompletionsText([
      { role: 'system', content: '你是一个专业的项目管理助手。' },
      { role: 'user', content: prompt }
    ], { maxTokens, signal: this.signal })
    
    if (onProgress) onProgress('正在解析新任务...')
    
    let newTasks = parseJsonArrayFromText(content)
    if (!Array.isArray(newTasks) || newTasks.length === 0) throw new Error('任务列表结构不正确')
    if (newTasks.length > requestedDays) newTasks = newTasks.slice(0, requestedDays)
    if (newTasks.length < requestedDays) {
      if (onProgress) onProgress(`仅生成了 ${newTasks.length}/${requestedDays} 个任务，将按现有结果导入`)
    }
    
    const addedTasks = []
    
    for (let i = 0; i < newTasks.length; i++) {
      const taskData = newTasks[i]
      
      if (onProgress) {
        onProgress(`正在添加第 ${actualStartDay + i} 天的任务... (${Math.round(((i + 1) / newTasks.length) * 100)}%)`)
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
      
      addedTasks.push(task)
    }
    
    if (onProgress) onProgress(`正在保存 ${addedTasks.length} 个任务到数据库...`)
    
    // 优先使用批量 IPC 以提升计划生成/导入速度
    if (window.electronAPI.addTodosBatch) {
      const result = await window.electronAPI.addTodosBatch(JSON.parse(JSON.stringify(addedTasks)))
      if (!result?.success) throw new Error(result?.error || '批量保存任务失败')
    } else {
      for (const task of addedTasks) {
        await window.electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
      }
    }
    
    // 写入本地 store（与数据库保持一致）
    this.todoStore.todos.push(...addedTasks)
    
    if (onProgress) onProgress(`成功为项目"${project.name}"添加 ${addedTasks.length} 个新任务！`)
    
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

/**
 * 查看所有任务
 * 查看指定项目下的任务
 * 添加项目下的任务
 * 删除项目下的任务
 * 更新项目下的任务
 * 搜索任务
 * 创建项目
 * 删除项目
 * 更新项目
 * 创建任务
 * 删除任务
 * 更新任务
 */
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
    }).map(mapTaskForTool)
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
    const result = includeCompleted ? todos : todos.filter(t => !t.completed)
    return result.map(mapTaskForTool)
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
      : String(projectId)
    
    let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
    return todos
      .filter(t => String(t.projectId ?? '') === String(targetProjectId ?? ''))
      .map(mapTaskForTool)
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
    const safeKeyword = String(keyword || '').trim()
    if (!safeKeyword) return []
    const keywordLower = safeKeyword.toLowerCase()
    let todos = getFilteredTodos(this.todoStore, this.selectedProjectIds)
    
    return todos.filter(t => 
      t.text.toLowerCase().includes(keywordLower) ||
      (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(keywordLower)))
    ).map(mapTaskForTool)
  }
  ),

  // 6. 创建项目并生成任务
  new AIFunction(
    createTool(
      'createProjectWithTasks',
      '创建项目名称',
      {
        projectName: {
          type: 'string',
          description: '项目名称，如果用户未明确指定，可以从描述中提取'
        }
      },
      ['projectName']
    ),
    async function(args, onProgress = null) {
      return "创建成功,下一步创建, 调用createTask工具创建具体任务";
//       const { description, projectName } = args
      
//       if (!this.client) {
//         throw new Error('AI 客户端未初始化')
//       }
      
//       // 检测是否是多天计划（用于渐进式创建）
//       const daysMatch = description.match(/(\d+)\s*[天日]/)
//       const totalDays = daysMatch ? parseInt(daysMatch[1]) : 0
//       const isProgressiveMode = totalDays > 1
      
//       // 检测任务类型
//       const isDailyPlan = /[天日]/.test(description) && totalDays > 0
//       const isTechProject = /开发|接入|实现|集成|部署|配置|SDK|API|demo|项目/.test(description)
//       const isLearningPlan = /学习|掌握|了解|课程/.test(description)
      
//       if (onProgress) onProgress('🤔 正在分析需求，生成项目计划...')
      
//       // 获取今天的日期
//       const today = new Date()
//       const todayStr = today.toISOString().split('T')[0]
      
//       // 调用 AI 生成项目信息和初始任务
//       const batchSize = 1
//       const promptDays = isProgressiveMode ? Math.min(batchSize, totalDays) : totalDays
      
//       const taskTypeHint = isDailyPlan ? '这是一个每日计划，需要按天分解任务。' 
//         : isTechProject ? '这是一个技术项目，需要按开发阶段/功能模块分解任务。'
//         : isLearningPlan ? '这是一个学习计划，需要按知识点/章节分解任务。'
//         : '根据项目性质合理分解任务。'
      
//       const prompt = `根据描述生成项目计划。${isProgressiveMode ? `${totalDays}天计划，现生成前${promptDays}天。` : ''}

// 日期：${todayStr}(今天) | 描述：${description} | 名称：${projectName} | 类型：${taskTypeHint}${isProgressiveMode ? ` | 总${totalDays}天，本批${promptDays}天` : ''}

// 返回格式（简写字段节省token）：
// {
//   "p": {"n": "项目名", "c": "#8A9DFB"},
//   "t": [
//     {
//       "tx": "任务标题",
//       "pr": "h/m/l",
//       "dd": "${todayStr}",
//       "s": [
//         {"tx": "子任务", "w": 3, "r": 0}
//       ]
//     }
//   ]
// }

// 字段说明：p=project, n=name, c=color, t=tasks, tx=text, pr=priority(h/m/l), dd=dueDate, s=subtasks, w=weight(1-5), r=requiresInput(0/1)

// 要求：
// 1. ${isDailyPlan ? `每日计划：任务命名"第N天 - 描述"，${isProgressiveMode ? `生成${promptDays}天` : `生成${totalDays}天`}，日期从${todayStr}连续递增，子任务具体可执行` : isTechProject ? '技术项目：按阶段划分(环境→开发→测试→部署)，任务具体，子任务细化到可执行步骤' : isLearningPlan ? '学习计划：按知识点/章节划分，含理论+实践+总结' : '合理分解任务'}
// 2. 任务数${isDailyPlan ? (isProgressiveMode ? promptDays : totalDays) : '5-15'}个，每个3-8个子任务
// 3. 优先级：前期m，中期h，后期m
// 4. 需记录结果的子任务设r=1（如：测体重、记录配置）
// 5. 颜色可选：#8A9DFB/#FF6B6B/#4ECDC4/#95E1D3
// 6. 只返回JSON，无其他文字`

//       const messages = [
//         {
//           role: 'system',
//           content: '你是一个专业的项目管理助手，擅长将用户的想法转化为结构化、可执行的项目计划。你特别擅长制定每日计划，能够将长期目标拆解为具体的每日任务清单，类似于打卡系统。'
//         },
//         {
//           role: 'user',
//           content: prompt
//         }
//       ]
      
//       const content = await this.client.chatCompletions(messages, { maxTokens: 8000 })
      
//       if (onProgress) onProgress('📋 项目计划已生成，正在解析...')
      
//       // 解析 JSON
//       let projectPlan
//       try {
//         projectPlan = JSON.parse(content.trim())
//       } catch (e) {
//         const jsonMatch = content.match(/\{[\s\S]*\}/)
//         if (jsonMatch) {
//           projectPlan = JSON.parse(jsonMatch[0])
//       } else {
//           console.error('AI 返回内容:', content)
//           throw new Error('AI 返回的项目计划格式不正确')
//         }
//       }
      
//       // 验证项目计划结构
//       const projectData = projectPlan.p || projectPlan.project
//       const tasksData = projectPlan.t || projectPlan.tasks
      
//       if (!projectData || !tasksData || !Array.isArray(tasksData)) {
//         console.error('项目计划结构不完整:', projectPlan)
//         throw new Error('项目计划结构不完整，缺少必要字段')
//       }
      
//       const finalProjectName = projectData.n || projectData.name || projectName
//       if (onProgress) onProgress(`📁 正在创建项目"${finalProjectName}"...`)
      
//       // 创建项目
//       const projectColor = projectData.c || projectData.color || '#8A9DFB'
//       const project = {
//         id: generateId(),
//         name: finalProjectName,
//         color: projectColor,
//         createdAt: new Date().toISOString()
//       }
      
//       this.projectStore.projects.push(project)
//       this.projectStore.currentProjectId = project.id
//       await window.electronAPI.addProject(JSON.parse(JSON.stringify(project)))
//       await window.electronAPI.setCurrentProject(project.id)
      
//       // 创建第一批任务
//       const createdTasks = []
//       const firstBatchTasks = tasksData
      
//       for (let i = 0; i < firstBatchTasks.length; i++) {
//         const taskData = firstBatchTasks[i]
        
//         const dayNumber = i + 1
//         const overallProgress = isProgressiveMode 
//           ? Math.round((dayNumber / totalDays) * 100)
//           : Math.round((dayNumber / firstBatchTasks.length) * 100)
        
//         if (onProgress) {
//           onProgress(`✅ 正在创建第 ${dayNumber} 天的任务... ${isProgressiveMode ? `(${overallProgress}%)` : ''}`)
//         }
        
//         const taskText = taskData.tx || taskData.text
//         const taskPriority = taskData.pr || taskData.priority
//         const taskDueDate = taskData.dd || taskData.dueDate
//         const taskSubtasks = taskData.s || taskData.subtasks || []
        
//         let finalDueDate = taskDueDate
//         if (!finalDueDate) {
//           const dueDate = new Date()
//           dueDate.setDate(dueDate.getDate() + i)
//           finalDueDate = dueDate.toISOString().split('T')[0]
//         }
        
//         let priority = 'medium'
//         if (taskPriority === 'h' || taskPriority === 'high') priority = 'high'
//         else if (taskPriority === 'l' || taskPriority === 'low') priority = 'low'
//         else if (taskPriority === 'm' || taskPriority === 'medium') priority = 'medium'
//         else if (taskPriority) priority = taskPriority
        
//         const taskId = generateId()
//         const task = {
//           id: taskId,
//           text: taskText,
//       completed: false,
//           priority,
//       projectId: project.id,
//       createdAt: new Date().toISOString(),
//       completedAt: null,
//           dueDate: finalDueDate,
//       images: [],
//       pinned: false,
//           subtasks: taskSubtasks.map((st, idx) => {
//             const subtaskText = st.tx || st.text
//             const subtaskWeight = st.w || st.weight || 3
//             const subtaskRequiresInput = st.r === 1 || st.r === true || st.requiresInput === true
            
//             return {
//               id: generateSubId(taskId, idx),
//               text: subtaskText,
//         completed: false,
//               weight: subtaskWeight,
//               requiresInput: subtaskRequiresInput,
//               inputValue: ''
//             }
//           }),
//       progressRecords: []
//     }
    
//         this.todoStore.todos.push(task)
//         createdTasks.push(task)
//         await window.electronAPI.addTodo(JSON.parse(JSON.stringify(task)))
        
//         if (i < firstBatchTasks.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 10))
//         }
//       }
      
//       // 如果是渐进模式且还有剩余天数，继续创建
//       if (isProgressiveMode && firstBatchTasks.length < totalDays) {
//         const baseDate = new Date(today)
//         await createRemainingDays(this, project, totalDays, firstBatchTasks.length, description, onProgress, baseDate)
//       }
      
//       if (onProgress) onProgress(`🎉 项目"${finalProjectName}"创建成功！共创建 ${this.todoStore.todos.filter(t => t.projectId === project.id).length} 个任务 (100%)`)
    
//     return {
//       success: true,
//       projectId: project.id,
//         projectName: finalProjectName,
//         tasksCreated: createdTasks.length
//       }
  }),
  new AIFunction(
    createTool('createTask',
      '用于为项目添加具体任务, 任务名称, 任务描述, 任务优先级, 任务截止日期, 任务子任务',
      {
        taskName: {
          type: 'string',
          description: '任务名称'
        },
        taskDescription: {
          type: 'string',
          description: '任务描述'
        },
      },
      ['taskName', 'taskDescription', 'taskPriority', 'taskDueDate', 'taskSubtasks']),
      async function(args) {
        const { taskName, taskDescription, taskPriority, taskDueDate, taskSubtasks } = args
        return "创建成功,请在任务列表中查看";
      }
   ),
  // 7.1 更新任务字段
  new AIFunction(
    createTool(
      'updateTask',
      '更新指定任务的字段（标题、完成状态、优先级、截止日期等）。用于编辑任务内容或状态',
      {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        updates: {
          type: 'object',
          description: '要更新的字段（text/completed/priority/dueDate/pinned/status）',
          properties: {
            text: { type: 'string', description: '任务标题' },
            completed: { type: 'boolean', description: '完成状态' },
            priority: { type: 'string', description: '优先级 high/medium/low' },
            dueDate: { type: 'string', description: '截止日期 YYYY-MM-DD 或 null' },
            pinned: { type: 'boolean', description: '是否置顶' },
            status: { type: 'string', description: '状态 todo/doing/done' }
          }
        }
      },
      ['taskId', 'updates']
    ),
    async function(args, onProgress = null) {
      const { taskId, updates = {} } = args
      const task = this.todoStore.todos.find(t => t.id === taskId)
      if (!task) {
        throw new Error(`找不到ID为${taskId}的任务`)
      }
      if (onProgress) onProgress(`正在更新任务"${task.text}"...`)
      await this.todoStore.updateTask(taskId, updates)
      if (onProgress) onProgress('任务已更新')
      return {
        success: true,
        taskId,
        updates
      }
    }
  ),
  // 7.2 添加子任务（直接添加）
  new AIFunction(
    createTool(
      'addSubtask',
      '为指定任务添加子任务（直接添加，不重写原有子任务）',
      {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        text: {
          type: 'string',
          description: '子任务内容'
        },
        weight: {
          type: 'number',
          description: '权重（1-5），默认 3'
        },
        requiresInput: {
          type: 'boolean',
          description: '是否需要输入记录'
        }
      },
      ['taskId', 'text']
    ),
    async function(args, onProgress = null) {
      const { taskId, text, weight = 3, requiresInput = false } = args
      const task = this.todoStore.todos.find(t => t.id === taskId)
      if (!task) {
        throw new Error(`找不到ID为${taskId}的任务`)
      }
      if (onProgress) onProgress(`正在给任务"${task.text}"添加子任务...`)
      await this.todoStore.addSubtask(taskId, text, weight, requiresInput)
      if (onProgress) onProgress('子任务已添加')
      return {
        success: true,
        taskId,
        text
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

/**
 * AI 工具类
 * 使用方式：
 *   const aiTool = new AITool(stores, client, selectedProjectIds)
 *   if (aiTool[functionName]) {
 *     const result = await aiTool.execute(functionName, args, onProgress)
 *   }
 */
export class AITool {
  constructor(stores, client = null, selectedProjectIds = [], options = {}) {
    this.todoStore = stores.todoStore
    this.projectStore = stores.projectStore
    this.client = client
    this.selectedProjectIds = selectedProjectIds
    this.signal = options.signal
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
