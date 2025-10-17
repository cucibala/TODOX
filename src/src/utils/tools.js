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
        // 处理类型转换：args.projectId 可能是字符串，需要转换为数字或 null
        const targetProjectId = args.projectId === 'null' || args.projectId === null 
          ? null 
          : Number(args.projectId)
        return todos.filter(t => t.projectId === targetProjectId)
      
      case 'getProjects':
        // 如果有选中的项目，只返回这些项目
        const filteredProjects = selectedProjectIds && selectedProjectIds.length > 0
          ? projects.filter(p => selectedProjectIds.includes(p.id))
          : projects
        
        return filteredProjects.map(p => {
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
      
      case 'createProjectWithTasks':
        // 异步工具，返回一个标记，让调用者知道需要异步处理
        return {
          _async: true,
          functionName: 'createProjectWithTasks',
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
  
  // 更新进度：开始生成计划
  if (onProgress) onProgress('🤔 正在分析需求，生成项目计划...')
  
  // 获取今天的日期
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  
  // 调用 DeepSeek API 生成项目计划
  const prompt = `请根据以下描述，生成一个详细的项目计划。返回 JSON 格式，包含项目信息和任务列表。

【当前日期】：${todayStr}（今天）
【项目描述】：${description}
【项目名称】：${projectName}

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
1. **如果用户提到具体天数（如"30天"、"一个月"、"一周"），必须为每一天创建一个独立的任务**
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

示例（假设今天是 ${todayStr}，30天减肥计划）：
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
        {"text": "喝水2000ml（分8次）", "weight": 3},
        {"text": "早餐：燕麦+鸡蛋（350卡）", "weight": 3},
        {"text": "午餐：鸡胸肉+蔬菜（500卡）", "weight": 3},
        {"text": "晚餐：水煮青菜+豆腐（400卡）", "weight": 3},
        {"text": "睡前拉伸15分钟", "weight": 2}
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
  
  // 创建任务
  const createdTasks = []
  const totalTasks = projectPlan.tasks.length
  
  for (let i = 0; i < totalTasks; i++) {
    const taskData = projectPlan.tasks[i]
    
    // 更新进度：创建任务
    if (onProgress) {
      onProgress(`📝 正在创建任务 ${i + 1}/${totalTasks}: ${taskData.text.substring(0, 20)}...`)
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
    if (i < totalTasks - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  // 更新进度：保存数据
  if (onProgress) onProgress('💾 正在保存数据...')
  await todoStore.saveTodos()
  
  // 更新进度：完成
  if (onProgress) onProgress(`✅ 项目创建完成！共创建 ${createdTasks.length} 个任务`)
  
  return {
    success: true,
    project: {
      id: project.id,
      name: project.name,
      color: project.color
    },
    tasksCreated: createdTasks.length,
    message: `成功创建项目"${finalProjectName}"，包含 ${createdTasks.length} 个任务`
  }
}

