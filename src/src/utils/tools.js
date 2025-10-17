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
  },
  {
    type: 'function',
    function: {
      name: 'createProjectWithTasks',
      description: '根据用户描述智能创建项目并生成任务和子任务。适用于制定计划、项目管理等场景，如"减肥计划30天"、"学习Python课程"等',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: '项目描述，包括项目目标、时间范围、具体要求等信息'
          },
          projectName: {
            type: 'string',
            description: '项目名称，如果用户未明确指定，可以从描述中提取'
          }
        },
        required: ['description', 'projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateProjectTasks',
      description: '根据用户反馈调整现有项目的任务。用于修改、优化或重新规划项目任务，如"第3天太难了，简化一下"、"增加一些饮食控制的任务"等',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'number',
            description: '要更新的项目ID'
          },
          feedback: {
            type: 'string',
            description: '用户的反馈和调整要求'
          }
        },
        required: ['projectId', 'feedback']
      }
    }
  }
]

/**
 * 执行工具函数
 * @param {string} functionName - 函数名
 * @param {object} args - 参数
 * @param {object} stores - { todoStore, projectStore }
 * @param {object} deepseekClient - DeepSeek 客户端（用于异步工具）
 * @param {Array} selectedProjectIds - 选中的项目ID列表
 * @returns {any} 执行结果
 */
export function executeToolFunction(functionName, args, stores, deepseekClient = null, selectedProjectIds = []) {
  const { todoStore, projectStore } = stores
  
  let todos = todoStore.todos || []
  const projects = projectStore.projects || []
  
  // 如果有选中的项目，只返回这些项目的任务
  if (selectedProjectIds && selectedProjectIds.length > 0) {
    todos = todos.filter(t => selectedProjectIds.includes(t.projectId))
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
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
        const targetProjectId = args.projectId === 'null' || args.projectId === null 
          ? null 
          : Number(args.projectId)
        return todos.filter(t => t.projectId === targetProjectId)
      
      case 'getProjects':
        return projects.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          taskCount: todos.filter(t => t.projectId === p.id).length,
          completedCount: todos.filter(t => t.projectId === p.id && t.completed).length
        }))
      
      case 'searchTasks':
        const keyword = args.keyword.toLowerCase()
        return todos.filter(t => 
          t.text.toLowerCase().includes(keyword) ||
          (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(keyword)))
        )
      
      case 'createProjectWithTasks':
        // 异步工具，返回一个标记，让调用者知道需要异步处理
        return {
          _async: true,
          functionName: 'createProjectWithTasks',
          args
        }
      
      case 'updateProjectTasks':
        // 异步工具，用于调整现有项目的任务
        return {
          _async: true,
          functionName: 'updateProjectTasks',
          args
        }
      
      default:
        throw new Error(`未知的函数: ${functionName}`)
    }
  } catch (error) {
    throw new Error(`执行工具函数失败: ${error.message}`)
  }
}

/**
 * 执行异步工具函数 - 创建项目并生成任务
 * @param {object} args - { description, projectName }
 * @param {object} stores - { todoStore, projectStore }
 * @param {object} deepseekClient - DeepSeek 客户端
 * @param {function} onProgress - 进度更新回调
 * @returns {Promise<object>} 创建结果
 */
export async function executeCreateProjectWithTasks(args, stores, deepseekClient, onProgress = null) {
  const { todoStore, projectStore } = stores
  const { description, projectName } = args
  
  if (!deepseekClient) {
    throw new Error('DeepSeek 客户端未初始化')
  }
  
  // 检测是否是多天计划（用于渐进式创建）
  const daysMatch = description.match(/(\d+)\s*[天日]/)
  const totalDays = daysMatch ? parseInt(daysMatch[1]) : 0
  const isProgressiveMode = totalDays > 10 // 超过10天采用渐进式创建
  
  // 更新进度：开始生成计划
  if (onProgress) onProgress('🤔 正在分析需求，生成项目计划...')
  
  // 获取今天的日期
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  
  // 调用 DeepSeek API 生成项目信息和初始任务
  const batchSize = isProgressiveMode ? 7 : 999 // 渐进模式每批7天
  const promptDays = isProgressiveMode ? batchSize : totalDays
  
  const prompt = `请根据以下描述，生成一个项目计划。${isProgressiveMode ? `这是一个${totalDays}天的计划，现在先生成前${promptDays}天的内容。` : ''}返回 JSON 格式，包含项目信息和任务列表。

【当前日期】：${todayStr}（今天）
【项目描述】：${description}
【项目名称】：${projectName}
${isProgressiveMode ? `【总天数】：${totalDays}天\n【本批天数】：前${promptDays}天` : ''}

返回格式要求：
{
  "project": {
    "name": "项目名称",
    "color": "颜色代码（如 #8A9DFB、#FF6B6B、#4ECDC4、#95E1D3）"
  },
  "tasks": [
    {
      "text": "任务标题",
      "priority": "high/medium/low",
      "dueDate": "YYYY-MM-DD（可选，如果有明确时间要求）",
      "subtasks": [
        {
          "text": "子任务描述（要具体可执行）",
          "weight": 1-5,
          "requiresInput": false
        }
      ]
    }
  ]
}

重要要求：
1. **如果是每日计划，为每一天创建一个独立的任务**
   - 任务命名：第1天、第2天、第3天...（或Day 1、Day 2...）
   - 每天的任务要有具体的日期（从 ${todayStr} 开始，依次递增）
   - 每天的子任务要具体可执行，类似每日打卡清单
   - **截止日期格式：YYYY-MM-DD，从今天（${todayStr}）开始计算**
   
2. **每日任务的子任务要非常具体**，例如：
   - ✅ 好的：晨跑30分钟（6:30-7:00）、喝水2000ml、晚餐控制在500卡以内
   - ❌ 不好的：运动、注意饮食、保持健康
   - 对于需要记录结果的子任务（如：测量体重、记录卡路里、检查数据等），设置 requiresInput: true。用户完成这类子任务时必须输入结果
   
3. **如果是阶段性计划（没有明确每天），可以按阶段/模块划分**
   - 任务数量：5-15个
   - 每个阶段/模块包含3-5个子任务
   
4. 优先级分配：
   - 早期任务（前1/3）：建立习惯，优先级 medium
   - 中期任务（中间1/3）：强化训练，优先级 high
   - 后期任务（后1/3）：巩固成果，优先级 medium

5. 截止日期：如果有明确的时间范围，为每个任务设置具体的截止日期

6. 只返回 JSON，不要其他解释文字

示例（假设今天是 ${todayStr}，减肥计划）：
{
  "project": {
    "name": "30天减肥挑战",
    "color": "#FF6B6B"
  },
  "tasks": [
    {
      "text": "第1天 - 启动计划",
      "priority": "high",
      "dueDate": "${todayStr}",
      "subtasks": [
        {"text": "晨跑30分钟（6:30-7:00）", "weight": 4},
        {"text": "记录早晨体重", "weight": 5, "requiresInput": true},
        {"text": "喝水2000ml（分8次）", "weight": 3}
      ]
    },
    {
      "text": "第2天 - 保持节奏",
      "priority": "medium",
      "dueDate": "2025-10-18",
      "subtasks": [
        {"text": "继续晨跑30分钟", "weight": 4},
        {"text": "记录体重变化", "weight": 5, "requiresInput": true}
      ]
    }
  ]
}

注意：
- 第1天的 dueDate 是今天（${todayStr}）
- 第2天的 dueDate 是明天（${todayStr} + 1天）
- 第3天的 dueDate 是后天（${todayStr} + 2天）
- 以此类推，第N天的 dueDate 是今天 + (N-1) 天`

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
  
  const content = await deepseekClient.chatCompletions(messages, { maxTokens: 8000 })
  
  // 更新进度：解析计划
  if (onProgress) onProgress('📋 项目计划已生成，正在解析...')
  
  // 解析 JSON
  let projectPlan
  try {
    projectPlan = JSON.parse(content.trim())
  } catch (e) {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      projectPlan = JSON.parse(jsonMatch[0])
    } else {
      console.error('AI 返回内容:', content)
      throw new Error('AI 返回的项目计划格式不正确')
    }
  }
  
  // 验证项目计划结构
  if (!projectPlan.project || !projectPlan.tasks || !Array.isArray(projectPlan.tasks)) {
    console.error('项目计划结构不完整:', projectPlan)
    throw new Error('项目计划结构不完整，缺少必要字段')
  }
  
  // 更新进度：创建项目
  const finalProjectName = projectPlan.project.name || projectName
  if (onProgress) onProgress(`📁 正在创建项目"${finalProjectName}"...`)
  
  // 创建项目
  const projectColor = projectPlan.project.color || '#8A9DFB'
  
  const project = {
    id: Date.now(),
    name: finalProjectName,
    color: projectColor,
    createdAt: new Date().toISOString()
  }
  
  projectStore.projects.push(project)
  projectStore.currentProjectId = project.id
  await projectStore.saveProjects()
  
  // 创建第一批任务
  const createdTasks = []
  const firstBatchTasks = projectPlan.tasks
  
  for (let i = 0; i < firstBatchTasks.length; i++) {
    const taskData = firstBatchTasks[i]
    
    // 更新进度：创建任务
    if (onProgress) {
      onProgress(`✅ 正在创建任务 ${i + 1}/${firstBatchTasks.length}: ${taskData.text.substring(0, 20)}...`)
    }
    
    // 如果 AI 没有指定截止日期，默认设置为从今天开始递增
    let finalDueDate = taskData.dueDate
    if (!finalDueDate) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + i) // 第 i 个任务的截止日期为今天 + i 天
      finalDueDate = dueDate.toISOString().split('T')[0]
    }
    
    const task = {
      id: Date.now() + i,
      text: taskData.text,
      completed: false,
      priority: taskData.priority || 'medium',
      projectId: project.id,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: finalDueDate,
      images: [],
      pinned: false,
      subtasks: (taskData.subtasks || []).map((st, idx) => ({
        id: Date.now() + i * 1000 + idx,
        text: st.text,
        completed: false,
        weight: st.weight || 3,
        requiresInput: st.requiresInput || false,
        inputValue: ''
      })),
      progressRecords: []
    }
    
    todoStore.todos.push(task)
    createdTasks.push(task)
    
    // 避免 ID 冲突，添加小延迟
    if (i < firstBatchTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  await todoStore.saveTodos()
  
  // 如果是渐进模式且还有剩余天数，继续创建
  if (isProgressiveMode && firstBatchTasks.length < totalDays) {
    await createRemainingDays(project, totalDays, firstBatchTasks.length, description, stores, deepseekClient, onProgress)
  }
  
  if (onProgress) onProgress(`🎉 项目"${finalProjectName}"创建成功！共创建 ${createdTasks.length} 个任务`)
  
  return {
    success: true,
    projectId: project.id,
    projectName: finalProjectName,
    tasksCreated: createdTasks.length
  }
}

/**
 * 创建剩余的每日任务（渐进式创建的后续批次）
 */
async function createRemainingDays(project, totalDays, currentDay, description, stores, deepseekClient, onProgress) {
  const { todoStore } = stores
  const batchSize = 7
  
  while (currentDay < totalDays) {
    const startDay = currentDay + 1
    const endDay = Math.min(currentDay + batchSize, totalDays)
    const daysToCreate = endDay - currentDay
    
    if (onProgress) onProgress(`📅 正在生成第 ${startDay}-${endDay} 天的任务...`)
    
    // 计算这批任务的起始日期
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + currentDay)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    const prompt = `继续为"${project.name}"项目生成任务。这是一个${totalDays}天的计划，现在生成第${startDay}-${endDay}天的任务。

【项目描述】：${description}
【起始日期】：${startDateStr}（第${startDay}天）
【结束日期】：第${endDay}天

请生成第${startDay}天到第${endDay}天的任务，每天一个任务。返回 JSON 数组格式：
[
  {
    "text": "第${startDay}天 - 任务标题",
    "priority": "medium",
    "dueDate": "${startDateStr}",
    "subtasks": [
      {"text": "具体可执行的子任务", "weight": 3, "requiresInput": false}
    ]
  }
]

要求：
1. 每天的任务要循序渐进，符合整体计划的节奏
2. 子任务要具体可执行
3. 对需要记录结果的子任务设置 requiresInput: true
4. 只返回 JSON 数组，不要其他内容`

    try {
      const content = await deepseekClient.chatCompletions([
        { role: 'system', content: '你是一个专业的项目管理助手。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 3000 })
      
      let tasks
      try {
        tasks = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[0])
        } else {
          console.error('AI返回内容:', content)
          tasks = [] // 失败时跳过这批
        }
      }
      
      // 创建这批任务
      for (let i = 0; i < tasks.length; i++) {
        const taskData = tasks[i]
        
        if (onProgress) {
          onProgress(`✅ 正在创建第 ${startDay + i} 天的任务...`)
        }
        
        const task = {
          id: Date.now() + (currentDay + i),
          text: taskData.text,
          completed: false,
          priority: taskData.priority || 'medium',
          projectId: project.id,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate: taskData.dueDate,
          images: [],
          pinned: false,
          subtasks: (taskData.subtasks || []).map((st, idx) => ({
            id: Date.now() + (currentDay + i) * 1000 + idx,
            text: st.text,
            completed: false,
            weight: st.weight || 3,
            requiresInput: st.requiresInput || false,
            inputValue: ''
          })),
          progressRecords: []
        }
        
        todoStore.todos.push(task)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      await todoStore.saveTodos()
      currentDay = endDay
      
    } catch (error) {
      console.error(`创建第${startDay}-${endDay}天任务失败:`, error)
      // 失败时跳过这批，继续下一批
      currentDay = endDay
    }
  }
}

/**
 * 执行异步工具函数 - 更新项目任务
 * @param {object} args - { projectId, feedback }
 * @param {object} stores - { todoStore, projectStore }
 * @param {object} deepseekClient - DeepSeek 客户端
 * @param {function} onProgress - 进度更新回调
 * @returns {Promise<object>} 更新结果
 */
export async function executeUpdateProjectTasks(args, stores, deepseekClient, onProgress = null) {
  const { todoStore, projectStore } = stores
  const { projectId, feedback } = args
  
  if (!deepseekClient) {
    throw new Error('DeepSeek 客户端未初始化')
  }
  
  // 查找项目
  const project = projectStore.projects.find(p => p.id === projectId)
  if (!project) {
    throw new Error(`找不到ID为${projectId}的项目`)
  }
  
  // 获取项目的所有任务
  const projectTasks = todoStore.todos.filter(t => t.projectId === projectId)
  if (projectTasks.length === 0) {
    throw new Error(`项目"${project.name}"还没有任务`)
  }
  
  if (onProgress) onProgress(`🤔 正在分析您对"${project.name}"的反馈...`)
  
  // 准备当前任务信息
  const tasksInfo = projectTasks.map((t, i) => ({
    index: i + 1,
    text: t.text,
    dueDate: t.dueDate,
    subtasks: t.subtasks.map(st => st.text)
  }))
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const prompt = `你正在帮助用户调整项目"${project.name}"的任务计划。

【当前任务列表】：
${JSON.stringify(tasksInfo, null, 2)}

【用户反馈】：${feedback}

请根据用户的反馈，生成调整后的完整任务列表。返回 JSON 格式：
{
  "tasks": [
    {
      "text": "任务标题",
      "priority": "high/medium/low",
      "dueDate": "YYYY-MM-DD",
      "subtasks": [
        {"text": "子任务", "weight": 3, "requiresInput": false}
      ]
    }
  ]
}

要求：
1. 保持原有任务的合理部分
2. 根据反馈进行调整（简化、增加、修改等）
3. 确保任务仍然循序渐进
4. 日期从今天（${todayStr}）开始
5. 只返回 JSON，不要其他内容`

  const content = await deepseekClient.chatCompletions([
    { role: 'system', content: '你是一个专业的项目管理助手，擅长根据用户反馈优化项目计划。' },
    { role: 'user', content: prompt }
  ], { maxTokens: 8000 })
  
  if (onProgress) onProgress('📋 正在应用调整方案...')
  
  // 解析 JSON
  let updatedPlan
  try {
    updatedPlan = JSON.parse(content.trim())
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      updatedPlan = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('AI 返回的调整方案格式不正确')
    }
  }
  
  if (!updatedPlan.tasks || !Array.isArray(updatedPlan.tasks)) {
    throw new Error('调整方案结构不完整')
  }
  
  // 删除原有任务
  todoStore.todos = todoStore.todos.filter(t => t.projectId !== projectId)
  
  // 创建新任务
  const createdTasks = []
  
  for (let i = 0; i < updatedPlan.tasks.length; i++) {
    const taskData = updatedPlan.tasks[i]
    
    if (onProgress) {
      onProgress(`✅ 正在更新任务 ${i + 1}/${updatedPlan.tasks.length}...`)
    }
    
    let finalDueDate = taskData.dueDate
    if (!finalDueDate) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + i)
      finalDueDate = dueDate.toISOString().split('T')[0]
    }
    
    const task = {
      id: Date.now() + i,
      text: taskData.text,
      completed: false,
      priority: taskData.priority || 'medium',
      projectId: project.id,
      createdAt: new Date().toISOString(),
      completedAt: null,
      dueDate: finalDueDate,
      images: [],
      pinned: false,
      subtasks: (taskData.subtasks || []).map((st, idx) => ({
        id: Date.now() + i * 1000 + idx,
        text: st.text,
        completed: false,
        weight: st.weight || 3,
        requiresInput: st.requiresInput || false,
        inputValue: ''
      })),
      progressRecords: []
    }
    
    todoStore.todos.push(task)
    createdTasks.push(task)
    
    if (i < updatedPlan.tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  await todoStore.saveTodos()
  
  if (onProgress) onProgress(`🎉 项目"${project.name}"已更新！共 ${createdTasks.length} 个任务`)
  
  return {
    success: true,
    projectId: project.id,
    projectName: project.name,
    tasksUpdated: createdTasks.length
  }
}
