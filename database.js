const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 当前数据库版本
const DATABASE_VERSION = 2;

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
      
      console.log('数据库初始化成功:', this.dbPath);
      return true;
    } catch (error) {
      console.error('数据库初始化失败:', error);
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
   * 保存项目（批量替换）
   */
  saveProjects(projects) {
    const transaction = this.db.transaction(() => {
      // 清空现有项目
      this.db.prepare('DELETE FROM projects').run();
      
      // 插入新项目
      const insert = this.db.prepare(`
        INSERT INTO projects (id, name, color, icon, "order", created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      projects.forEach(project => {
        insert.run(
          project.id,
          project.name,
          project.color || null,
          project.icon || null,
          project.order || 0,
          project.createdAt || project.created_at || new Date().toISOString(),  // 兼容驼峰和下划线命名
          new Date().toISOString()
        );
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
      
      if (result.changes > 0) {
        console.log(`已自动清理 ${result.changes} 个无项目归属的任务`);
      }
      
      return result.changes;
    } catch (error) {
      console.error('清理孤立任务失败:', error);
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
   * 保存任务（批量替换）
   */
  saveTodos(todos) {
    const transaction = this.db.transaction(() => {
      // 清空现有数据
      this.db.prepare('DELETE FROM todos').run();
      this.db.prepare('DELETE FROM subtasks').run();
      this.db.prepare('DELETE FROM progress_records').run();
      
      // 准备插入语句
      const insertTodo = this.db.prepare(`
        INSERT INTO todos (
          id, project_id, text, completed, priority, due_date, 
          created_at, completed_at, "order", updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertSubtask = this.db.prepare(`
        INSERT INTO subtasks (id, todo_id, text, completed, weight, requires_input, input_value, "order", created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertProgress = this.db.prepare(`
        INSERT INTO progress_records (id, todo_id, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      // 插入任务数据
      todos.forEach((todo, index) => {
        insertTodo.run(
          todo.id,
          todo.projectId || todo.project_id || null,  // 兼容驼峰和下划线命名
          todo.text,
          todo.completed ? 1 : 0,
          todo.priority || 'medium',
          todo.dueDate || todo.due_date || null,  // 兼容驼峰和下划线命名
          todo.createdAt || todo.created_at || new Date().toISOString(),  // 兼容驼峰和下划线命名
          todo.completedAt || todo.completed_at || null,  // 兼容驼峰和下划线命名
          todo.order !== undefined ? todo.order : index,
          new Date().toISOString()
        );
        
        // 插入子任务
        if (todo.subtasks && todo.subtasks.length > 0) {
          todo.subtasks.forEach((subtask, subIndex) => {
            insertSubtask.run(
              subtask.id,
              todo.id,
              subtask.text,
              subtask.completed ? 1 : 0,
              subtask.weight || 3,  // 权重，默认3
              subtask.requiresInput || subtask.requires_input ? 1 : 0,  // 是否需要输入
              subtask.inputValue || subtask.input_value || null,  // 输入值
              subtask.order !== undefined ? subtask.order : subIndex,
              subtask.createdAt || subtask.created_at || new Date().toISOString(),  // 兼容驼峰和下划线命名
              new Date().toISOString()
            );
            
            // 保存子任务图片
            if (subtask.images && subtask.images.length > 0) {
              this.saveImages('subtask', subtask.id, subtask.images);
            }
          });
        }
        
        // 插入进度记录（兼容 progress 和 progressRecords 两种字段名）
        const progressList = todo.progressRecords || todo.progress || [];
        if (progressList.length > 0) {
          progressList.forEach(record => {
            insertProgress.run(
              record.id,
              todo.id,
              record.description || record.text || '',  // 兼容 description 和 text 字段
              record.createdAt || record.created_at || new Date().toISOString(),  // 兼容驼峰和下划线命名
              new Date().toISOString()
            );
            
            // 保存进度记录图片
            if (record.images && record.images.length > 0) {
              this.saveImages('progress', record.id, record.images);
            }
          });
        }
        
        // 保存任务图片
        if (todo.images && todo.images.length > 0) {
          this.saveImages('todo', todo.id, todo.images);
        }
      });
    });
    
    transaction();
    
    // 保存后自动清理孤立任务
    this.cleanOrphanedTasks();
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
    const images = stmt.all(entityType, entityId);
    return images.map(img => img.file_name);
  }

  /**
   * 保存实体的图片列表
   */
  saveImages(entityType, entityId, fileNames) {
    // 先删除旧的图片记录
    this.db.prepare('DELETE FROM images WHERE entity_type = ? AND entity_id = ?')
      .run(entityType, entityId);
    
    // 插入新的图片记录
    if (fileNames && fileNames.length > 0) {
      const insert = this.db.prepare(`
        INSERT INTO images (id, entity_type, entity_id, file_name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      fileNames.forEach(fileName => {
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        insert.run(id, entityType, entityId, fileName, new Date().toISOString());
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
      
      conv.messages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imagePath: msg.image_path,
        thinking: msg.thinking,
        createdAt: msg.created_at
      }));
      
      conv.createdAt = conv.created_at;
      conv.updatedAt = conv.updated_at;
      delete conv.created_at;
      delete conv.updated_at;
    });
    
    return conversations;
  }

  /**
   * 保存会话数据
   */
  saveConversations(conversationsData) {
    const transaction = this.db.transaction(() => {
      // 清空现有数据
      this.db.prepare('DELETE FROM conversations').run();
      this.db.prepare('DELETE FROM messages').run();
      
      const insertConv = this.db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      
      const insertMsg = this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, image_path, thinking, "order", created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      conversationsData.conversations.forEach(conv => {
        insertConv.run(
          conv.id,
          conv.title,
          conv.createdAt || conv.created_at || new Date().toISOString(),  // 兼容驼峰和下划线命名
          conv.updatedAt || conv.updated_at || new Date().toISOString()  // 兼容驼峰和下划线命名
        );
        
        // 插入消息
        if (conv.messages && conv.messages.length > 0) {
          conv.messages.forEach((msg, index) => {
            insertMsg.run(
              msg.id,
              conv.id,
              msg.role,
              msg.content,
              msg.imagePath || msg.image_path || null,  // 兼容驼峰和下划线命名
              msg.thinking || null,
              index,
              msg.createdAt || msg.created_at || new Date().toISOString()  // 兼容驼峰和下划线命名
            );
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
    this.setSetting('current_project_id', projectId);
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
    this.setSetting('current_conversation_id', conversationId);
  }

  // ==================== 数据迁移相关 ====================

  /**
   * 从 JSON 文件迁移数据
   */
  migrateFromJSON(jsonData) {
    try {
      const transaction = this.db.transaction(() => {
        // 迁移项目
        if (jsonData.projects) {
          this.saveProjects(jsonData.projects);
          if (jsonData.currentProjectId) {
            this.setCurrentProjectId(jsonData.currentProjectId);
          }
        }
        
        // 迁移任务
        if (jsonData.todos) {
          this.saveTodos(jsonData.todos);
        }
        
        // 迁移会话
        if (jsonData.conversations) {
          this.saveConversations(jsonData.conversations);
        }
      });
      
      transaction();
      console.log('数据迁移成功');
      return true;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return false;
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
      console.log(`数据库版本已更新至 v${version}: ${description}`);
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
      console.log(`新数据库已初始化为版本 v${this.currentVersion}`);
      return;
    }
    
    // 如果数据库版本已是最新，无需迁移
    if (currentDbVersion >= this.currentVersion) {
      console.log(`数据库版本 v${currentDbVersion} 已是最新`);
      return;
    }
    
    // 执行逐版本迁移
    console.log(`开始数据库迁移：v${currentDbVersion} → v${this.currentVersion}`);
    
    for (let version = currentDbVersion + 1; version <= this.currentVersion; version++) {
      console.log(`正在执行迁移到版本 v${version}...`);
      const migrationFunc = this.getMigrationFunction(version);
      
      if (migrationFunc) {
        try {
          // 在事务中执行迁移
          const transaction = this.db.transaction(() => {
            migrationFunc.call(this);
            this.setDatabaseVersion(version, `迁移至版本 ${version}`);
          });
          
          transaction();
          console.log(`✓ 成功迁移到版本 v${version}`);
        } catch (error) {
          console.error(`✗ 迁移到版本 v${version} 失败:`, error);
          throw error;
        }
      } else {
        console.log(`版本 v${version} 无需迁移操作`);
        this.setDatabaseVersion(version, `版本 ${version}`);
      }
    }
    
    console.log(`数据库迁移完成，当前版本 v${this.currentVersion}`);
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
        console.log('  - 为 subtasks 表添加新字段...');
        
        // SQLite 不支持 ADD COLUMN IF NOT EXISTS，需要检查列是否存在
        const tableInfo = this.db.prepare('PRAGMA table_info(subtasks)').all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('weight')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN weight INTEGER DEFAULT 3;');
          console.log('  - 添加 weight 字段');
        }
        
        if (!columnNames.includes('requires_input')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN requires_input INTEGER DEFAULT 0;');
          console.log('  - 添加 requires_input 字段');
        }
        
        if (!columnNames.includes('input_value')) {
          this.db.exec('ALTER TABLE subtasks ADD COLUMN input_value TEXT;');
          console.log('  - 添加 input_value 字段');
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

