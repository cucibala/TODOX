const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 当前数据库版本
const DATABASE_VERSION = 3;

class TodoXDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.currentVersion = DATABASE_VERSION;
  }

  /**
   * 初始化数据库连接
   */
  init() {
    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 创建或打开数据库
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // 启用 WAL 模式提升性能
      
      // 创建基础表结构
      this.createTables();
      
      // 检查并执行数据库迁移
      this.checkAndMigrate();
      console.log('Database initialized successfully:', this.dbPath);
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  /**
   * 创建数据库表结构
   */
  createTables() {
    // 项目表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        "order" INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        "order" INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 子任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        weight INTEGER DEFAULT 3,
        requires_input INTEGER DEFAULT 0,
        input_value TEXT,
        "order" INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      )
    `);

    // 进度记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress_records (
        id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      )
    `);

    // 图片附件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 消息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        image_path TEXT,
        thinking TEXT,
        "order" INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // 设置表（用于存储各种配置）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 数据库版本表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL,
        description TEXT
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
      CREATE INDEX IF NOT EXISTS idx_subtasks_todo ON subtasks(todo_id);
      CREATE INDEX IF NOT EXISTS idx_progress_todo ON progress_records(todo_id);
      CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    `);
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================== 项目相关操作 ====================

  /**
   * 获取所有项目
   */
  getProjects() {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY "order" ASC');
    return stmt.all();
  }

  /**
   * 添加单个项目
   */
  addProject(project) {
    const stmt = this.db.prepare(`
        INSERT INTO projects (id, name, color, icon, "order", created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
    stmt.run(
          String(project.id),
          project.name,
          project.color || null,
          project.icon || null,
          project.order || 0,
      project.createdAt || project.created_at || new Date().toISOString(),
          new Date().toISOString()
        );
  }

  /**
   * 更新单个项目
   */
  updateProject(projectId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.order !== undefined) {
      fields.push('"order" = ?');
      values.push(updates.order);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(String(projectId));
    
    const stmt = this.db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  /**
   * 删除单个项目
   */
  deleteProject(projectId) {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(String(projectId));
  }

  /**
   * 保存项目（批量替换，仅用于迁移）
   * @deprecated 迁移后不再使用
   */
  saveProjects(projects) {
    const transaction = this.db.transaction(() => {
      projects.forEach(project => {
        this.addProject(project);
      });
    });
    transaction();
  }

  // ==================== 任务相关操作 ====================

  /**
   * 清理孤立任务（project_id 为空或不存在的任务）
   */
  cleanOrphanedTasks() {
    try {
      // 删除 project_id 为 NULL 的任务
      const result = this.db.prepare('DELETE FROM todos WHERE project_id IS NULL').run();
      return result.changes;
    } catch (error) {
      console.error('Failed to clean orphaned tasks:', error);
      return 0;
    }
  }

  /**
   * 获取所有任务（包含子任务、进度记录、图片）
   */
  getTodos() {
    const todos = this.db.prepare('SELECT * FROM todos ORDER BY "order" ASC').all();
    
    // 为每个任务加载子任务、进度记录和图片
    todos.forEach(todo => {
      // 转换布尔值
      todo.completed = Boolean(todo.completed);
      
      // 加载子任务
      const subtasks = this.db.prepare(`
        SELECT * FROM subtasks WHERE todo_id = ? ORDER BY "order" ASC
      `).all(todo.id);
      todo.subtasks = subtasks.map(st => ({
        id: st.id,
        text: st.text,
        completed: Boolean(st.completed),
        weight: st.weight || 3,
        requiresInput: Boolean(st.requires_input),
        inputValue: st.input_value || '',
        order: st.order,
        createdAt: st.created_at,
        images: this.getImages('subtask', st.id)
      }));
      
      // 加载进度记录（使用前端的字段名 progress 和 text）
      const progressRecords = this.db.prepare(`
        SELECT * FROM progress_records WHERE todo_id = ? ORDER BY created_at DESC
      `).all(todo.id);
      todo.progress = progressRecords.map(pr => ({
        id: pr.id,
        text: pr.description,  // 数据库用 description，前端用 text
        createdAt: pr.created_at,
        images: this.getImages('progress', pr.id)
      }));
      
      // 加载任务图片
      todo.images = this.getImages('todo', todo.id);
      
      // 转换字段名为驼峰命名
      todo.projectId = todo.project_id;
      todo.dueDate = todo.due_date;
      todo.createdAt = todo.created_at;
      todo.completedAt = todo.completed_at;
      
      // 删除下划线命名的字段
      delete todo.project_id;
      delete todo.due_date;
      delete todo.created_at;
      delete todo.completed_at;
      delete todo.updated_at;
    });
    
    return todos;
  }

  /**
   * 添加单个任务
   */
  addTodo(todo) {
    const stmt = this.db.prepare(`
      INSERT INTO todos (
        id, project_id, text, completed, priority, due_date, 
        created_at, completed_at, "order", updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      String(todo.id),
      todo.projectId || todo.project_id ? String(todo.projectId || todo.project_id) : null,
      todo.text,
      todo.completed ? 1 : 0,
      todo.priority || 'medium',
      todo.dueDate || todo.due_date || null,
      todo.createdAt || todo.created_at || new Date().toISOString(),
      todo.completedAt || todo.completed_at || null,
      todo.order || 0,
      new Date().toISOString()
    );
    
    // 保存任务图片
    if (todo.images && todo.images.length > 0) {
      this.saveImages('todo', String(todo.id), todo.images);
    }
    
    // 保存子任务
    if (todo.subtasks && todo.subtasks.length > 0) {
      todo.subtasks.forEach(subtask => {
        this.addSubtask(String(todo.id), subtask);
      });
    }
    
    // 保存进度记录
    const progressList = todo.progressRecords || todo.progress || [];
    if (progressList.length > 0) {
      progressList.forEach(record => {
        this.addProgressRecord(String(todo.id), record);
      });
    }
  }

  /**
   * 更新单个任务
   */
  updateTodo(todoId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.text !== undefined) {
      fields.push('text = ?');
      values.push(updates.text);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.dueDate);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.order !== undefined) {
      fields.push('"order" = ?');
      values.push(updates.order);
    }
    if (updates.projectId !== undefined) {
      fields.push('project_id = ?');
      values.push(updates.projectId ? String(updates.projectId) : null);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(String(todoId));
    
    const stmt = this.db.prepare(`
      UPDATE todos SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    
    // 如果更新了图片，重新保存
    if (updates.images !== undefined) {
      this.saveImages('todo', String(todoId), updates.images);
    }
  }

  /**
   * 删除单个任务（及其子任务、进度记录）
   */
  deleteTodo(todoId) {
    // 外键级联删除会自动删除子任务和进度记录
    this.db.prepare('DELETE FROM todos WHERE id = ?').run(String(todoId));
  }

  /**
   * 添加子任务
   */
  addSubtask(todoId, subtask) {
    const stmt = this.db.prepare(`
      INSERT INTO subtasks (id, todo_id, text, completed, weight, requires_input, input_value, "order", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      String(subtask.id),
      String(todoId),
      subtask.text,
      subtask.completed ? 1 : 0,
      subtask.weight || 3,
      subtask.requiresInput || subtask.requires_input ? 1 : 0,
      subtask.inputValue || subtask.input_value || null,
      subtask.order || 0,
      subtask.createdAt || subtask.created_at || new Date().toISOString(),
      new Date().toISOString()
    );
    
    // 保存子任务图片
    if (subtask.images && subtask.images.length > 0) {
      this.saveImages('subtask', String(subtask.id), subtask.images);
    }
  }

  /**
   * 更新子任务
   */
  updateSubtask(subtaskId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.text !== undefined) {
      fields.push('text = ?');
      values.push(updates.text);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.weight !== undefined) {
      fields.push('weight = ?');
      values.push(updates.weight);
    }
    if (updates.requiresInput !== undefined) {
      fields.push('requires_input = ?');
      values.push(updates.requiresInput ? 1 : 0);
    }
    if (updates.inputValue !== undefined) {
      fields.push('input_value = ?');
      values.push(updates.inputValue);
    }
    if (updates.order !== undefined) {
      fields.push('"order" = ?');
      values.push(updates.order);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(String(subtaskId));
    
    const stmt = this.db.prepare(`
      UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    
    // 如果更新了图片，重新保存
    if (updates.images !== undefined) {
      this.saveImages('subtask', String(subtaskId), updates.images);
    }
  }

  /**
   * 删除子任务
   */
  deleteSubtask(subtaskId) {
    this.db.prepare('DELETE FROM subtasks WHERE id = ?').run(String(subtaskId));
  }

  /**
   * 批量替换任务的所有子任务（用于AI修改子任务列表）
   * 使用事务确保原子性
   */
  replaceSubtasks(todoId, subtasks) {
    const transaction = this.db.transaction(() => {
      // 1. 删除该任务的所有现有子任务
      this.db.prepare('DELETE FROM subtasks WHERE todo_id = ?').run(String(todoId));
      
      // 2. 插入新的子任务列表
      if (subtasks && subtasks.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO subtasks (id, todo_id, text, completed, weight, requires_input, input_value, "order", created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        subtasks.forEach((subtask, index) => {
          stmt.run(
            String(subtask.id),
            String(todoId),
            subtask.text,
            subtask.completed ? 1 : 0,
            subtask.weight || 3,
            subtask.requiresInput || subtask.requires_input ? 1 : 0,
            subtask.inputValue || subtask.input_value || null,
            subtask.order !== undefined ? subtask.order : index,
            subtask.createdAt || subtask.created_at || new Date().toISOString(),
            new Date().toISOString()
          );
          
          // 保存子任务图片
          if (subtask.images && subtask.images.length > 0) {
            this.saveImages('subtask', String(subtask.id), subtask.images);
          }
        });
      }
    });
    
    transaction();
  }

  /**
   * 添加进度记录
   */
  addProgressRecord(todoId, record) {
    const stmt = this.db.prepare(`
      INSERT INTO progress_records (id, todo_id, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      String(record.id),
      String(todoId),
      record.description || record.text || '',
      record.createdAt || record.created_at || new Date().toISOString(),
      new Date().toISOString()
    );
    
    // 保存进度记录图片
    if (record.images && record.images.length > 0) {
      this.saveImages('progress', String(record.id), record.images);
    }
  }

  /**
   * 更新进度记录
   */
  updateProgressRecord(recordId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.text !== undefined || updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.text || updates.description);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(String(recordId));
    
    const stmt = this.db.prepare(`
      UPDATE progress_records SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    
    // 如果更新了图片，重新保存
    if (updates.images !== undefined) {
      this.saveImages('progress', String(recordId), updates.images);
    }
  }

  /**
   * 删除进度记录
   */
  deleteProgressRecord(recordId) {
    this.db.prepare('DELETE FROM progress_records WHERE id = ?').run(String(recordId));
  }

  // ==================== 图片相关操作 ====================

  /**
   * 获取实体的图片列表
   */
  getImages(entityType, entityId) {
    const stmt = this.db.prepare(`
      SELECT file_name FROM images 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `);
    const images = stmt.all(entityType, String(entityId));
    return images.map(img => img.file_name);
  }

  /**
   * 保存实体的图片列表
   */
  saveImages(entityType, entityId, fileNames) {
    // 先删除旧的图片记录
    this.db.prepare('DELETE FROM images WHERE entity_type = ? AND entity_id = ?')
      .run(entityType, String(entityId));
    
    // 插入新的图片记录
    if (fileNames && fileNames.length > 0) {
      const insert = this.db.prepare(`
        INSERT INTO images (id, entity_type, entity_id, file_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      fileNames.forEach(fileName => {
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        insert.run(id, entityType, String(entityId), fileName, new Date().toISOString());
      });
    }
  }

  // ==================== 会话相关操作 ====================

  /**
   * 获取所有会话（包含消息）
   */
  getConversations() {
    const conversations = this.db.prepare(`
      SELECT * FROM conversations ORDER BY updated_at DESC
    `).all();
    
    conversations.forEach(conv => {
      // 加载会话消息
      const messages = this.db.prepare(`
        SELECT * FROM messages WHERE conversation_id = ? ORDER BY "order" ASC
      `).all(conv.id);
      
      conv.messages = messages.map(msg => {
        // 解析 content（可能是字符串或 JSON 序列化的数组）
        let content = msg.content;
        if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
          try {
            content = JSON.parse(content);
          } catch (error) {
            // 解析失败，保持原字符串
          }
        }
        
        const message = {
          id: msg.id,
          role: msg.role,
          content: content,
          imagePath: msg.image_path,
          thinking: msg.thinking,
          createdAt: msg.created_at
        };
        
        // 解析额外数据
        if (msg.extra_data) {
          try {
            const extraData = JSON.parse(msg.extra_data);
            Object.assign(message, extraData);
          } catch (error) {
            console.error('解析消息额外数据失败:', error);
          }
        }
        
        return message;
      });
      
      conv.createdAt = conv.created_at;
      conv.updatedAt = conv.updated_at;
      delete conv.created_at;
      delete conv.updated_at;
      
      // 读取 roleId 和 projectIds
      conv.roleId = conv.role_id || null;
      if (conv.project_ids) {
        try {
          conv.projectIds = JSON.parse(conv.project_ids);
        } catch (error) {
          conv.projectIds = [];
        }
      } else {
        conv.projectIds = [];
      }
      delete conv.role_id;
      delete conv.project_ids;
    });
    
    return conversations;
  }

  /**
   * 添加单个会话
   */
  addConversation(conversation) {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, role_id, project_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      String(conversation.id),
      conversation.title,
      conversation.createdAt || conversation.created_at || new Date().toISOString(),
      conversation.updatedAt || conversation.updated_at || new Date().toISOString(),
      conversation.roleId || null,
      conversation.projectIds && conversation.projectIds.length > 0 ? JSON.stringify(conversation.projectIds) : null
    );
    
    // 保存消息
    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((msg, index) => {
        this.addMessage(String(conversation.id), msg, index);
      });
    }
  }

  /**
   * 更新单个会话
   */
  updateConversation(conversationId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.roleId !== undefined) {
      fields.push('role_id = ?');
      values.push(updates.roleId);
    }
    if (updates.projectIds !== undefined) {
      fields.push('project_ids = ?');
      values.push(updates.projectIds && updates.projectIds.length > 0 ? JSON.stringify(updates.projectIds) : null);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(String(conversationId));
    
    const stmt = this.db.prepare(`
      UPDATE conversations SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  /**
   * 删除单个会话（及其所有消息）
   */
  deleteConversation(conversationId) {
    // 外键级联删除会自动删除消息
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(String(conversationId));
  }

  /**
   * 添加消息
   */
  addMessage(conversationId, message, order) {
    // 确保消息有ID，如果没有则生成一个
    const messageId = message.id || `${Date.now()}${Math.random().toString(36).substring(2, 5)}`
    
    // 准备额外数据（tool_calls, reasoning_content, images等）
    const extraData = {};
    if (message.tool_calls) extraData.tool_calls = message.tool_calls;
    if (message.tool_call_id) extraData.tool_call_id = message.tool_call_id;
    if (message.name) extraData.name = message.name;
    if (message.reasoning_content) extraData.reasoning_content = message.reasoning_content;
    if (message.images) extraData.images = message.images;
    if (message.timestamp) extraData.timestamp = message.timestamp;
    if (message.isProgress) extraData.isProgress = message.isProgress;
    
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, image_path, thinking, "order", created_at, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      String(messageId),
      String(conversationId),
      message.role,
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      message.imagePath || message.image_path || null,
      message.thinking || null,
      order !== undefined ? order : 0,
      message.createdAt || message.created_at || new Date().toISOString(),
      Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null
    );
  }

  /**
   * 更新消息
   */
  updateMessage(messageId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.thinking !== undefined) {
      fields.push('thinking = ?');
      values.push(updates.thinking);
    }
    
    values.push(messageId);
    
    if (fields.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE messages SET ${fields.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    }
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId) {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
  }

  /**
   * 保存会话数据（批量替换，仅用于迁移）
   * @deprecated 迁移后不再使用
   */
  saveConversations(conversationsData) {
    const transaction = this.db.transaction(() => {
      // 清空现有数据
      this.db.prepare('DELETE FROM conversations').run();
      this.db.prepare('DELETE FROM messages').run();
      
      const insertConv = this.db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at, role_id, project_ids)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      conversationsData.conversations.forEach(conv => {
        insertConv.run(
          conv.id,
          conv.title,
          conv.createdAt || conv.created_at || new Date().toISOString(),
          conv.updatedAt || conv.updated_at || new Date().toISOString(),
          conv.roleId || null,
          conv.projectIds && conv.projectIds.length > 0 ? JSON.stringify(conv.projectIds) : null
        );
        
        // 插入消息（使用 addMessage 方法）
        if (conv.messages && conv.messages.length > 0) {
          conv.messages.forEach((msg, index) => {
            this.addMessage(conv.id, msg, index);
          });
        }
      });
    });
    
    transaction();
  }

  // ==================== 设置相关操作 ====================

  /**
   * 获取设置值
   */
  getSetting(key) {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  }

  /**
   * 设置配置值
   */
  setSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, value, new Date().toISOString());
  }

  /**
   * 删除设置
   */
  deleteSetting(key) {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  /**
   * 获取当前项目 ID
   */
  getCurrentProjectId() {
    return this.getSetting('current_project_id');
  }

  /**
   * 设置当前项目 ID
   */
  setCurrentProjectId(projectId) {
    this.setSetting('current_project_id', projectId ? String(projectId) : null);
  }

  /**
   * 获取当前会话 ID
   */
  getCurrentConversationId() {
    return this.getSetting('current_conversation_id');
  }

  /**
   * 设置当前会话 ID
   */
  setCurrentConversationId(conversationId) {
    this.setSetting('current_conversation_id', conversationId ? String(conversationId) : null);
  }

  // ==================== 数据迁移相关 ====================

  /**
   * 从 JSON 文件迁移数据（一条一条迁移）
   */
  migrateFromJSON(jsonData) {
    try {
      let migratedCount = {
        projects: 0,
        todos: 0,
        subtasks: 0,
        progressRecords: 0,
        conversations: 0,
        messages: 0
      };

      const transaction = this.db.transaction(() => {
        // 迁移项目（一条一条）
        if (jsonData.projects && jsonData.projects.length > 0) {
          console.log(`开始迁移 ${jsonData.projects.length} 个项目...`);
          jsonData.projects.forEach((project, index) => {
            try {
              this.addProject(project);
              migratedCount.projects++;
              if ((index + 1) % 10 === 0) {
                console.log(`已迁移 ${index + 1}/${jsonData.projects.length} 个项目`);
              }
            } catch (error) {
              console.error(`迁移项目失败 (ID: ${project.id}):`, error);
            }
          });
          
          if (jsonData.currentProjectId) {
            this.setCurrentProjectId(jsonData.currentProjectId);
          }
        }
        
        // 迁移任务（一条一条）
        if (jsonData.todos && jsonData.todos.length > 0) {
          console.log(`开始迁移 ${jsonData.todos.length} 个任务...`);
          jsonData.todos.forEach((todo, index) => {
            try {
              // 统计子任务和进度记录数量
              const subtasksCount = todo.subtasks ? todo.subtasks.length : 0;
              const progressCount = (todo.progressRecords || todo.progress || []).length;
              
              this.addTodo(todo);
              migratedCount.todos++;
              migratedCount.subtasks += subtasksCount;
              migratedCount.progressRecords += progressCount;
              
              if ((index + 1) % 50 === 0) {
                console.log(`已迁移 ${index + 1}/${jsonData.todos.length} 个任务`);
              }
            } catch (error) {
              console.error(`迁移任务失败 (ID: ${todo.id}):`, error);
            }
          });
        }
        
        // 迁移会话（一条一条）
        if (jsonData.conversations && jsonData.conversations.conversations) {
          const convList = jsonData.conversations.conversations;
          console.log(`开始迁移 ${convList.length} 个会话...`);
          
          convList.forEach((conv, index) => {
            try {
              const messagesCount = conv.messages ? conv.messages.length : 0;
              
              this.addConversation(conv);
              migratedCount.conversations++;
              migratedCount.messages += messagesCount;
              
              if ((index + 1) % 10 === 0) {
                console.log(`已迁移 ${index + 1}/${convList.length} 个会话`);
              }
            } catch (error) {
              console.error(`迁移会话失败 (ID: ${conv.id}):`, error);
            }
          });
          
          if (jsonData.conversations.currentConversationId) {
            this.setCurrentConversationId(jsonData.conversations.currentConversationId);
          }
        }
      });
      
      transaction();
      
      console.log('数据迁移完成统计:', migratedCount);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('数据迁移失败:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== 数据库版本管理 ====================

  /**
   * 获取当前数据库版本
   */
  getDatabaseVersion() {
    try {
      const stmt = this.db.prepare('SELECT MAX(version) as version FROM db_version');
      const result = stmt.get();
      return result && result.version ? result.version : 0;
    } catch (error) {
      console.error('获取数据库版本失败:', error);
      return 0;
    }
  }

  /**
   * 设置数据库版本
   */
  setDatabaseVersion(version, description = '') {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO db_version (version, applied_at, description)
        VALUES (?, ?, ?)
      `);
      stmt.run(version, new Date().toISOString(), description);
      console.log(`DataBase Version Updated to v${version}: ${description}`);
    } catch (error) {
      console.error('设置数据库版本失败:', error);
    }
  }

  /**
   * 检查并执行数据库迁移
   */
  checkAndMigrate() {
    const currentDbVersion = this.getDatabaseVersion();
    
    // 如果是新数据库，直接设置为最新版本
    if (currentDbVersion === 0) {
      this.setDatabaseVersion(this.currentVersion, '初始数据库版本');
      console.log(`New database initialized to version v${this.currentVersion}`);
      return;
    }
    
    // 如果数据库版本已是最新，无需迁移
    if (currentDbVersion >= this.currentVersion) {
      console.log(`Database version v${currentDbVersion} is already the latest`);
      return;
    }
    
    // 执行逐版本迁移
    console.log(`Starting database migration: v${currentDbVersion} → v${this.currentVersion}`);
    
    for (let version = currentDbVersion + 1; version <= this.currentVersion; version++) {
      console.log(`Migrating to version v${version}...`);
      const migrationFunc = this.getMigrationFunction(version);
      
      if (migrationFunc) {
        try {
          // 在事务中执行迁移
          const transaction = this.db.transaction(() => {
            migrationFunc.call(this);
            this.setDatabaseVersion(version, `迁移至版本 ${version}`);
          });
          
          transaction();
          console.log(`✓ Successfully migrated to version v${version}`);
        } catch (error) {
          console.error(`✗ Failed to migrate to version v${version}:`, error);
          throw error;
        }
      } else {
        console.log(`Version v${version} does not need migration operations`);
        this.setDatabaseVersion(version, `版本 ${version}`);
      }
    }
    
    console.log(`Database migration completed, current version v${this.currentVersion}`);
  }

  /**
   * 获取指定版本的迁移函数
   */
  getMigrationFunction(version) {
    const migrations = {
      // 版本 1 - 初始版本（无需迁移）
      // 1: null,
      
      // 版本 2 - 为子任务添加 weight、requiresInput、inputValue 字段
      2: function() {
        // SQLite 不支持 ADD COLUMN IF NOT EXISTS，需要检查列是否存在
        const tableInfo = this.db.prepare('PRAGMA table_info(subtasks)').all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('weight')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN weight INTEGER DEFAULT 3;');
        }
        
        if (!columnNames.includes('requires_input')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN requires_input INTEGER DEFAULT 0;');
        }
        
        if (!columnNames.includes('input_value')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN input_value TEXT;');
        }
      },
      
      // 版本 3 - 为消息表添加 extra_data 字段，为会话表添加 role_id 和 project_ids 字段
      3: function() {
        // 检查并添加 messages 表的 extra_data 字段
        const messagesTableInfo = this.db.prepare('PRAGMA table_info(messages)').all();
        const messagesColumns = messagesTableInfo.map(col => col.name);
        
        if (!messagesColumns.includes('extra_data')) {
          this.db.exec('ALTER TABLE messages ADD COLUMN extra_data TEXT;');
          console.log('✓ 已为 messages 表添加 extra_data 字段');
        }
        
        // 检查并添加 conversations 表的 role_id 和 project_ids 字段
        const conversationsTableInfo = this.db.prepare('PRAGMA table_info(conversations)').all();
        const conversationsColumns = conversationsTableInfo.map(col => col.name);
        
        if (!conversationsColumns.includes('role_id')) {
          this.db.exec('ALTER TABLE conversations ADD COLUMN role_id TEXT;');
          console.log('✓ 已为 conversations 表添加 role_id 字段');
        }
        
        if (!conversationsColumns.includes('project_ids')) {
          this.db.exec('ALTER TABLE conversations ADD COLUMN project_ids TEXT;');
          console.log('✓ 已为 conversations 表添加 project_ids 字段');
        }
      },
      
      // 未来的迁移函数在这里添加...
    };
    
    return migrations[version];
  }

  /**
   * 获取数据库版本历史
   */
  getVersionHistory() {
    try {
      const stmt = this.db.prepare('SELECT * FROM db_version ORDER BY version ASC');
      return stmt.all();
    } catch (error) {
      console.error('获取版本历史失败:', error);
      return [];
    }
  }
}

module.exports = TodoXDatabase;

