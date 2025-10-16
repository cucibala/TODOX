# Cursor 规则 - 行为规范

## 文档维护范围（必须）
- 只维护 `README.md` 与 `更新日志.md` 两个文档。
- 除非用户明确要求，不修改或新增其他文档。

## 禁用 confirm 组件（必须）
- 不使用浏览器/原生 `confirm` 组件。
- 原因：在 Windows 上会导致所有 `input` 标签失去焦点且无法点击。
- 统一使用自定义确认对话框替代（项目中已有自定义对话框方案）。

## 代码更改
在 Electron 应用中使用 Vue 3 时，通过 IPC (ipcRenderer.invoke) 传递数据必须先将 Vue 的响应式对象（ref、reactive 创建的 Proxy 对象）转换为普通 JavaScript 对象。否则会报错 "An object could not be cloned"。

正确做法：
```javascript
// ❌ 错误 - 直接传递响应式对象
await electronAPI.someFunction(messages.value)
await electronAPI.someFunction(todoStore.todos)

// ✅ 正确 - 转换为普通对象
const plainMessages = messages.value.map(msg => ({
  role: msg.role,
  content: msg.content,
  timestamp: msg.timestamp
}))
await electronAPI.someFunction(plainMessages)

// 或使用 JSON 序列化
const plainData = JSON.parse(JSON.stringify(messages.value))
await electronAPI.someFunction(plainData)
```

适用场景：
- saveTodos、saveProjects、saveChatHistory 等保存操作
- 通过 IPC 向主进程发送任何 Vue 响应式数据
- 调用 DeepSeek API 等需要序列化数据的场景