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
  },
  {
    type: 'function',
    function: {
      name: 'addProjectTasks',
      description: '为现有项目添加新任务。用于扩展项目、增加新的每日任务或补充内容，如"再添加7天任务"、"增加第31-40天的内容"等',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'number',
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
        required: ['projectId', 'description']
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
      
      case 'addProjectTasks':
        // 异步工具，用于为项目添加新任务
        return {
          _async: true,
          functionName: 'addProjectTasks',
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
  const isProgressiveMode = totalDays > 1 // 超过1天就采用渐进式创建
  
  // 检测任务类型
  const isDailyPlan = /[天日]/.test(description) && totalDays > 0 // 每日计划
  const isTechProject = /开发|接入|实现|集成|部署|配置|SDK|API|demo|项目/.test(description) // 技术项目
  const isLearningPlan = /学习|掌握|了解|课程/.test(description) // 学习计划
  
  // 更新进度：开始生成计划
  if (onProgress) onProgress('🤔 正在分析需求，生成项目计划...')
  
  // 获取今天的日期
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  
  // 调用 DeepSeek API 生成项目信息和初始任务
  const batchSize = 1 // 首批生成3天，让用户快速看到效果
  const promptDays = isProgressiveMode ? Math.min(batchSize, totalDays) : totalDays
  
  const taskTypeHint = isDailyPlan ? '这是一个每日计划，需要按天分解任务。' 
    : isTechProject ? '这是一个技术项目，需要按开发阶段/功能模块分解任务。'
    : isLearningPlan ? '这是一个学习计划，需要按知识点/章节分解任务。'
    : '根据项目性质合理分解任务。'
  
  const prompt = `请根据以下描述，生成一个项目计划。${isProgressiveMode ? `这是一个${totalDays}天的计划，现在先生成前${promptDays}天的内容，后续会逐天生成。` : ''}返回 JSON 格式，包含项目信息和任务列表。

【当前日期】：${todayStr}（今天）
【项目描述】：${description}
【项目名称】：${projectName}
【任务类型】：${taskTypeHint}
${isProgressiveMode ? `【总天数】：${totalDays}天\n【本批天数】：前${promptDays}天（后续将逐天生成剩余${totalDays - promptDays}天）` : ''}

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

**1. 每日计划（如：30天减肥计划）：**
   - 任务命名：第1天、第2天、第3天...（或Day 1、Day 2...）
   - ${isProgressiveMode ? `本次只需生成前${promptDays}天的任务（第1天到第${promptDays}天），剩余天数会逐天自动生成` : ''}
   - 每天的任务要有具体的日期（从 ${todayStr} 开始，依次递增）
   - 每天的子任务要具体可执行，类似每日打卡清单
   - **截止日期格式：YYYY-MM-DD，从今天（${todayStr}）开始计算**
   - **第1天的dueDate是${todayStr}，第2天是次日，第3天是第三天，以此类推**
   - 子任务示例：✅ 晨跑30分钟（6:30-7:00）、喝水2000ml
   - 对于需要记录结果的子任务（如：测量体重、记录卡路里），设置 requiresInput: true

**2. 技术项目（如：接入SDK、开发功能）：**
   - 任务按开发阶段划分，如：环境准备 → 核心功能开发 → 测试 → 部署
   - 任务命名要具体，如："配置开发环境"、"实现人脸检测接口"、"编写单元测试"
   - 子任务要细化到可执行步骤，如：
     - ✅ 好的：安装SDK依赖包、创建初始化代码、配置API密钥、测试基础调用
     - ❌ 不好的：准备工作、写代码、测试
   - 每个任务3-8个子任务
   - 可以设置重要的验证点为 requiresInput: true（如：记录测试结果、填写配置参数）

**3. 学习计划：**
   - 任务按知识点/章节划分
   - 子任务包括：学习理论、动手实践、总结笔记、练习题目等
   
**4. 通用要求：**
   - 任务数量：${isDailyPlan ? (isProgressiveMode ? `本次${promptDays}个` : `${totalDays}个`) : '5-15个'}
   - 每个任务包含3-8个子任务
   
4. 优先级分配：
   - 早期任务（前1/3）：建立习惯，优先级 medium
   - 中期任务（中间1/3）：强化训练，优先级 high
   - 后期任务（后1/3）：巩固成果，优先级 medium

5. 截止日期：如果有明确的时间范围，为每个任务设置具体的截止日期

6. 只返回 JSON，不要其他解释文字

示例1（每日计划 - 假设今天是 2025-10-24）：
{
  "project": {"name": "30天减肥挑战", "color": "#FF6B6B"},
  "tasks": [
    {
      "text": "第1天 - 启动计划",
      "priority": "high",
      "dueDate": "2025-10-24",
      "subtasks": [
        {"text": "晨跑30分钟（6:30-7:00）", "weight": 4},
        {"text": "记录早晨体重", "weight": 5, "requiresInput": true},
        {"text": "喝水2000ml（分8次）", "weight": 3}
      ]
    },
    {
      "text": "第2天 - 保持节奏",
      "priority": "medium",
      "dueDate": "2025-10-25",
      "subtasks": [...]
    }
  ]
}

示例2（技术项目 - 假设今天是 2025-10-24）：
{
  "project": {"name": "接入 LivingDetection SDK", "color": "#8A9DFB"},
  "tasks": [
    {
      "text": "环境准备和SDK集成",
      "priority": "high",
      "dueDate": "2025-10-24",
      "subtasks": [
        {"text": "下载 LivingDetection SDK 并解压", "weight": 2},
        {"text": "配置项目依赖（添加到 build.gradle）", "weight": 3},
        {"text": "初始化SDK（申请AppKey和SecretKey）", "weight": 4},
        {"text": "记录AppKey配置信息", "weight": 3, "requiresInput": true},
        {"text": "验证SDK初始化成功", "weight": 4}
      ]
    },
    {
      "text": "实现人脸检测核心功能",
      "priority": "high",
      "dueDate": "2025-10-25",
      "subtasks": [
        {"text": "创建检测Activity页面", "weight": 3},
        {"text": "实现相机预览功能", "weight": 4},
        {"text": "调用活体检测API", "weight": 5},
        {"text": "处理检测结果回调", "weight": 4}
      ]
    },
    {
      "text": "UI优化和异常处理",
      "priority": "medium",
      "dueDate": "2025-10-26",
      "subtasks": [
        {"text": "添加检测框和提示文字", "weight": 3},
        {"text": "实现检测失败重试逻辑", "weight": 4},
        {"text": "添加网络异常处理", "weight": 3}
      ]
    },
    {
      "text": "测试和文档编写",
      "priority": "medium",
      "dueDate": "2025-10-27",
      "subtasks": [
        {"text": "真机测试各种光线环境", "weight": 4},
        {"text": "记录测试结果和问题", "weight": 4, "requiresInput": true},
        {"text": "编写接入文档和注意事项", "weight": 3}
      ]
    }
  ]
}

**关键**：
- 第1天的 dueDate 必须是 ${todayStr}（今天）
- 第2天的 dueDate 必须是次日
- 第3天的 dueDate 必须是第三天
- 每天的日期必须连续递增，不能跳过或重复
- ${isProgressiveMode ? `本次只生成 ${promptDays} 个任务即可（第${promptDays + 1}天及以后会自动生成）` : '必须为所有天数生成任务'}`

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
    
    // 更新进度：创建任务（带总体进度）
    const dayNumber = i + 1
    const overallProgress = isProgressiveMode 
      ? Math.round((dayNumber / totalDays) * 100)
      : Math.round((dayNumber / firstBatchTasks.length) * 100)
    
    if (onProgress) {
      onProgress(`✅ 正在创建第 ${dayNumber} 天的任务... ${isProgressiveMode ? `(${overallProgress}%)` : ''}`)
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
    const baseDate = new Date(today) // 保存项目起始日期
    await createRemainingDays(project, totalDays, firstBatchTasks.length, description, stores, deepseekClient, onProgress, baseDate)
  }
  
  if (onProgress) onProgress(`🎉 项目"${finalProjectName}"创建成功！共创建 ${todoStore.todos.filter(t => t.projectId === project.id).length} 个任务 (100%)`)
  
  return {
    success: true,
    projectId: project.id,
    projectName: finalProjectName,
    tasksCreated: createdTasks.length
  }
}

/**
 * 创建剩余的每日任务（渐进式创建，每次生成1天）
 */
async function createRemainingDays(project, totalDays, currentDay, description, stores, deepseekClient, onProgress, baseDate) {
  const { todoStore } = stores
  
  // 逐天生成任务
  while (currentDay < totalDays) {
    const dayNumber = currentDay + 1
    const overallProgress = Math.round((dayNumber / totalDays) * 100)
    console.log('createRemainingDays', dayNumber, overallProgress)
    
    if (onProgress) onProgress(`📅 正在生成第 ${dayNumber} 天的任务... (${overallProgress}%)`)
    
    // 计算当天的日期（基于项目起始日期）
    const taskDate = new Date(baseDate)
    taskDate.setDate(baseDate.getDate() + currentDay)
    const taskDateStr = taskDate.toISOString().split('T')[0]
    
    const prompt = `继续为"${project.name}"项目生成任务。这是一个${totalDays}天的计划，现在生成第${dayNumber}天的任务。

【项目描述】：${description}
【当前日期】：${taskDateStr}（第${dayNumber}天）
【总天数】：${totalDays}天

请为第${dayNumber}天生成一个任务。返回 JSON 对象格式：
{
  "text": "第${dayNumber}天 - 任务标题",
  "priority": "medium",
  "dueDate": "${taskDateStr}",
  "subtasks": [
    {"text": "具体可执行的子任务", "weight": 3, "requiresInput": false}
  ]
}

**重要**：
1. 只生成第${dayNumber}天这一天的任务
2. 任务标题格式：第${dayNumber}天 - 具体描述
3. dueDate 必须是 ${taskDateStr}
4. 子任务要具体可执行，符合整体计划在第${dayNumber}天的进度
5. 对需要记录结果的子任务设置 requiresInput: true
6. 只返回 JSON 对象，不要其他内容`

    try {
      const content = await deepseekClient.chatCompletions([
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
      
      // 确保日期正确
      let taskDueDate = taskData.dueDate
      if (!taskDueDate || taskDueDate !== taskDateStr) {
        taskDueDate = taskDateStr
      }
      
      // 创建任务
      const task = {
        id: Date.now() + currentDay,
        text: taskData.text,
        completed: false,
        priority: taskData.priority || 'medium',
        projectId: project.id,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: taskDueDate,
        images: [],
        pinned: false,
        subtasks: (taskData.subtasks || []).map((st, idx) => ({
          id: Date.now() + currentDay * 1000 + idx,
          text: st.text,
          completed: false,
          weight: st.weight || 3,
          requiresInput: st.requiresInput || false,
          inputValue: ''
        })),
        progressRecords: []
      }
      
      todoStore.todos.push(task)
      await todoStore.saveTodos()
      
      // 进入下一天
      currentDay++
      
      // 小延迟，避免ID冲突和API限流
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`创建第${dayNumber}天任务失败:`, error)
      // 失败时跳过这一天，继续下一天
      currentDay++
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
  
  // 准备当前任务信息（包括完成状态）
  const tasksInfo = projectTasks.map((t, i) => ({
    index: i + 1,
    text: t.text,
    dueDate: t.dueDate,
    completed: t.completed,
    completedAt: t.completedAt,
    subtasks: t.subtasks.map(st => ({
      text: st.text,
      completed: st.completed,
      weight: st.weight
    }))
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
      "completed": false,
      "subtasks": [
        {"text": "子任务", "weight": 3, "requiresInput": false, "completed": false}
      ]
    }
  ]
}

**重要要求**：
1. **已完成的任务必须保留**：如果任务的 completed 为 true，必须保持其 completed 状态
2. 已完成任务的子任务完成状态也必须保留
3. 根据反馈调整未完成的任务（简化、增加、修改等）
4. 确保任务仍然循序渐进
5. 日期从第一个任务的日期开始连续
6. 只返回 JSON，不要其他内容`

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
  
  // 创建新任务（保留原有任务的ID和完成状态）
  const createdTasks = []
  
  for (let i = 0; i < updatedPlan.tasks.length; i++) {
    const taskData = updatedPlan.tasks[i]
    const originalTask = projectTasks[i] // 尝试匹配原有任务
    
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
      id: originalTask?.id || (Date.now() + i),
      text: taskData.text,
      completed: taskData.completed || false,
      priority: taskData.priority || 'medium',
      projectId: project.id,
      createdAt: originalTask?.createdAt || new Date().toISOString(),
      completedAt: taskData.completed && originalTask?.completedAt ? originalTask.completedAt : null,
      dueDate: finalDueDate,
      images: originalTask?.images || [],
      pinned: originalTask?.pinned || false,
      subtasks: (taskData.subtasks || []).map((st, idx) => {
        const originalSubtask = originalTask?.subtasks?.[idx]
        return {
          id: originalSubtask?.id || (Date.now() + i * 1000 + idx),
          text: st.text,
          completed: st.completed || false,
          weight: st.weight || 3,
          requiresInput: st.requiresInput || false,
          inputValue: originalSubtask?.inputValue || '',
          completedAt: st.completed && originalSubtask?.completedAt ? originalSubtask.completedAt : null
        }
      }),
      progressRecords: originalTask?.progressRecords || []
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

/**
 * 执行异步工具函数 - 为项目添加新任务
 * @param {object} args - { projectId, description, startDay }
 * @param {object} stores - { todoStore, projectStore }
 * @param {object} deepseekClient - DeepSeek 客户端
 * @param {function} onProgress - 进度更新回调
 * @returns {Promise<object>} 添加结果
 */
export async function executeAddProjectTasks(args, stores, deepseekClient, onProgress = null) {
  const { todoStore, projectStore } = stores
  const { projectId, description, startDay } = args
  
  if (!deepseekClient) {
    throw new Error('DeepSeek 客户端未初始化')
  }
  
  // 查找项目
  const project = projectStore.projects.find(p => p.id === projectId)
  if (!project) {
    throw new Error(`找不到ID为${projectId}的项目`)
  }
  
  // 获取项目的现有任务
  const projectTasks = todoStore.todos.filter(t => t.projectId === projectId)
  const currentTaskCount = projectTasks.length
  const actualStartDay = startDay || (currentTaskCount + 1)
  
  if (onProgress) onProgress(`🤔 正在分析要添加的任务...`)
  
  // 计算起始日期
  let startDate
  if (projectTasks.length > 0) {
    // 从最后一个任务的日期往后推
    const lastTask = projectTasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0]
    startDate = new Date(lastTask.dueDate)
    startDate.setDate(startDate.getDate() + 1)
  } else {
    startDate = new Date()
  }
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // 检测要添加的天数
  const daysMatch = description.match(/(\d+)\s*[天日]/)
  const daysToAdd = daysMatch ? parseInt(daysMatch[1]) : 7 // 默认添加7天
  
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

  const content = await deepseekClient.chatCompletions([
    { role: 'system', content: '你是一个专业的项目管理助手。' },
    { role: 'user', content: prompt }
  ], { maxTokens: 8000 })
  
  if (onProgress) onProgress('📋 正在解析新任务...')
  
  // 解析 JSON
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
  
  // 创建新任务
  const addedTasks = []
  
  for (let i = 0; i < newTasks.length; i++) {
    const taskData = newTasks[i]
    
    if (onProgress) {
      onProgress(`✅ 正在添加第 ${actualStartDay + i} 天的任务... (${Math.round(((i + 1) / newTasks.length) * 100)}%)`)
    }
    
    // 计算任务日期
    let taskDate = taskData.dueDate
    if (!taskDate) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      taskDate = date.toISOString().split('T')[0]
    }
    
    const task = {
      id: Date.now() + i,
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
    addedTasks.push(task)
    
    if (i < newTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  await todoStore.saveTodos()
  
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

