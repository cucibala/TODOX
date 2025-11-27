<template>
  <div class="emotion-page">
    <!-- 左侧人物列表 -->
    <div class="person-sidebar">
      <div class="sidebar-header">
        <h3>人物列表</h3>
        <button @click="showCreatePersonDialog = true" class="btn-add">
          <span class="icon">+</span>
        </button>
      </div>

      <div class="person-list">
        <div
          v-for="person in persons"
          :key="person.id"
          :class="['person-item', { active: currentPersonId === person.id }]"
          @click="selectPerson(person.id)"
        >
          <div class="person-avatar">
            {{ person.avatar || person.name[0] }}
          </div>
          <div class="person-info">
            <div class="person-name">{{ person.name }}</div>
            <div class="person-status">
              {{ getPersonStatus(person) }}
            </div>
          </div>
        </div>

        <div v-if="persons.length === 0" class="empty-state">
          <p>还没有添加任何人物</p>
          <p class="hint">点击右上角 + 创建</p>
        </div>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="content-area">
      <div v-if="!currentPersonId" class="empty-content">
        <div class="empty-icon">💭</div>
        <h3>情感分析助手</h3>
        <p>选择一个人物开始分析</p>
      </div>

      <div v-else class="person-detail">
        <!-- 顶部操作栏 -->
        <div class="detail-header">
          <h2>{{ currentPerson?.name }}</h2>
          <div class="actions">
            <button @click="showImportDialog = true" class="btn-secondary">
              导入聊天记录
            </button>
            <button @click="analyzePerson" class="btn-primary" :disabled="analyzing">
              {{ analyzing ? '分析中...' : '生成画像' }}
            </button>
          </div>
        </div>

        <!-- 标签页 -->
        <div class="tabs">
          <div
            v-for="tab in tabs"
            :key="tab.value"
            :class="['tab', { active: currentTab === tab.value }]"
            @click="currentTab = tab.value"
          >
            {{ tab.label }}
          </div>
        </div>

        <!-- 标签内容 -->
        <div class="tab-content">
          <!-- 人物画像 -->
          <div v-if="currentTab === 'profile'" class="profile-view">
            <div v-if="!currentPerson?.profile" class="no-profile">
              <p>还没有生成画像</p>
              <button @click="analyzePerson" class="btn-primary">
                立即分析
              </button>
            </div>
            <div v-else class="profile-content">
              <PersonProfile :profile="currentPerson.profile" />
            </div>
          </div>

          <!-- 聊天记录 -->
          <div v-if="currentTab === 'chat'" class="chat-view">
            <div class="chat-header">
              <span>共 {{ currentChatRecords.length }} 条记录</span>
              <button @click="showAddChatDialog = true" class="btn-sm">
                + 添加记录
              </button>
            </div>
            <div class="chat-list">
              <div
                v-for="record in currentChatRecords.slice().reverse()"
                :key="record.id"
                :class="['chat-bubble', record.sender]"
              >
                <div class="sender">{{ record.sender === 'me' ? '我' : currentPerson.name }}</div>
                <div class="content">{{ record.content }}</div>
                <div class="time">{{ formatTime(record.timestamp) }}</div>
              </div>
              <div v-if="currentChatRecords.length === 0" class="empty-chat">
                暂无聊天记录
              </div>
            </div>
          </div>

          <!-- 日记 -->
          <div v-if="currentTab === 'diary'" class="diary-view">
            <div class="diary-header">
              <span>共 {{ currentDiaries.length }} 篇日记</span>
              <button @click="showAddDiaryDialog = true" class="btn-sm">
                + 写日记
              </button>
            </div>
            <div class="diary-list">
              <div
                v-for="diary in currentDiaries"
                :key="diary.id"
                class="diary-item"
                @click="viewDiary(diary)"
              >
                <h4>{{ diary.title || '无标题' }}</h4>
                <p class="preview">{{ diary.content.substring(0, 100) }}...</p>
                <div class="meta">
                  <span v-if="diary.emotion" class="emotion">{{ diary.emotion }}</span>
                  <span class="date">{{ formatDate(diary.createdAt) }}</span>
                </div>
              </div>
              <div v-if="currentDiaries.length === 0" class="empty-diary">
                暂无日记记录
              </div>
            </div>
          </div>

          <!-- 智能助手 -->
          <div v-if="currentTab === 'assistant'" class="assistant-view">
            <div class="assistant-section">
              <h3>💬 模拟回复</h3>
              <p class="hint">输入你的消息，AI 会模拟 TA 的回复</p>
              <div class="input-group">
                <textarea
                  v-model="simulateInput"
                  placeholder="输入你要发送的消息..."
                  rows="3"
                ></textarea>
                <button @click="simulateReply" class="btn-primary" :disabled="!simulateInput || simulating">
                  {{ simulating ? '模拟中...' : '模拟回复' }}
                </button>
              </div>
              <div v-if="simulatedReply" class="result-box">
                <strong>{{ currentPerson.name }} 可能会说：</strong>
                <p>{{ simulatedReply }}</p>
              </div>
            </div>

            <div class="assistant-section">
              <h3>✨ 回复建议</h3>
              <p class="hint">输入收到的消息，AI 会给你多个回复建议</p>
              <div class="input-group">
                <textarea
                  v-model="suggestionInput"
                  placeholder="输入对方发来的消息..."
                  rows="3"
                ></textarea>
                <select v-model="replyGoal" class="select">
                  <option value="casual">随意闲聊</option>
                  <option value="caring">温柔关怀</option>
                  <option value="humorous">幽默轻松</option>
                  <option value="rational">理性分析</option>
                  <option value="supportive">共鸣支持</option>
                  <option value="romantic">浪漫甜蜜</option>
                </select>
                <button @click="generateSuggestions" class="btn-primary" :disabled="!suggestionInput || suggesting">
                  {{ suggesting ? '生成中...' : '生成建议' }}
                </button>
              </div>
              <div v-if="suggestions.length > 0" class="suggestions-list">
                <div v-for="(sug, index) in suggestions" :key="index" class="suggestion-card">
                  <div class="sug-header">
                    <span class="sug-style">{{ sug.style }}</span>
                    <span class="sug-score">{{ sug.score }}分</span>
                  </div>
                  <div class="sug-content">{{ sug.content }}</div>
                  <div class="sug-meta">
                    <p><strong>预测反应：</strong>{{ sug.predictedReaction }}</p>
                    <p><strong>适合场景：</strong>{{ sug.bestFor }}</p>
                  </div>
                  <button @click="copySuggestion(sug.content)" class="btn-copy">
                    复制
                  </button>
                </div>
              </div>
            </div>

            <div class="assistant-section">
              <h3>🎯 事件场景建议</h3>
              <p class="hint">针对特定场景（如生日、道歉、安慰等）生成个性化建议</p>
              <div class="input-group">
                <select v-model="eventType" class="select">
                  <option value="">选择场景类型</option>
                  <option value="生日祝福">🎂 生日祝福</option>
                  <option value="节日问候">🎉 节日问候</option>
                  <option value="道歉">🙏 道歉</option>
                  <option value="安慰鼓励">💪 安慰鼓励</option>
                  <option value="感谢表达">🙌 感谢表达</option>
                  <option value="约会邀请">💑 约会邀请</option>
                  <option value="工作汇报">📊 工作汇报</option>
                  <option value="请求帮助">🤝 请求帮助</option>
                  <option value="庆祝成就">🎊 庆祝成就</option>
                  <option value="关心问候">❤️ 关心问候</option>
                </select>
                <textarea
                  v-model="eventContext"
                  placeholder="补充背景信息（可选）&#10;例如：因为昨天吵架了想道歉..."
                  rows="2"
                ></textarea>
                <button @click="generateEventSuggestions" class="btn-primary" :disabled="!eventType || eventGenerating">
                  {{ eventGenerating ? '生成中...' : '生成场景建议' }}
                </button>
              </div>
              <div v-if="eventSuggestions.length > 0" class="suggestions-list">
                <div v-if="generalTips" class="general-tips">
                  <strong>💡 通用建议：</strong>{{ generalTips }}
                </div>
                <div v-for="(sug, index) in eventSuggestions" :key="index" class="suggestion-card event-card">
                  <div class="sug-header">
                    <span class="sug-style">{{ sug.style }}</span>
                    <span class="sug-score">{{ sug.score }}分</span>
                  </div>
                  <div class="sug-content">{{ sug.content }}</div>
                  <div class="sug-meta">
                    <p><strong>选择理由：</strong>{{ sug.reason }}</p>
                    <p><strong>使用建议：</strong>{{ sug.tips }}</p>
                  </div>
                  <button @click="copySuggestion(sug.content)" class="btn-copy">
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 对话框 -->
    <CreatePersonDialog v-if="showCreatePersonDialog" @close="showCreatePersonDialog = false" @created="onPersonCreated" />
    <ImportChatDialog v-if="showImportDialog" :personId="currentPersonId" @close="showImportDialog = false" @imported="onChatImported" />
    <AddChatDialog v-if="showAddChatDialog" :personId="currentPersonId" @close="showAddChatDialog = false" @added="onChatAdded" />
    <AddDiaryDialog v-if="showAddDiaryDialog" :personId="currentPersonId" @close="showAddDiaryDialog = false" @added="onDiaryAdded" />
    <AILoadingDialog v-if="loadingMessage" :message="loadingMessage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEmotionStore } from '../stores/emotion'
import { useChatStore } from '../stores/chat'
import { useAppStore } from '../stores/app'
import { EmotionAITool } from '../utils/emotion_ai_tool'
import PersonProfile from '../components/PersonProfile.vue'
import CreatePersonDialog from '../components/CreatePersonDialog.vue'
import ImportChatDialog from '../components/ImportChatDialog.vue'
import AddChatDialog from '../components/AddChatDialog.vue'
import AddDiaryDialog from '../components/AddDiaryDialog.vue'
import AILoadingDialog from '../components/AILoadingDialog.vue'

const emotionStore = useEmotionStore()
const chatStore = useChatStore()
const appStore = useAppStore()

// 状态
const currentTab = ref('profile')
const showCreatePersonDialog = ref(false)
const showImportDialog = ref(false)
const showAddChatDialog = ref(false)
const showAddDiaryDialog = ref(false)
const analyzing = ref(false)
const loadingMessage = ref('')

// 智能助手状态
const simulateInput = ref('')
const simulatedReply = ref('')
const simulating = ref(false)
const suggestionInput = ref('')
const replyGoal = ref('casual')
const suggestions = ref([])
const suggesting = ref(false)
const eventType = ref('')
const eventContext = ref('')
const eventSuggestions = ref([])
const eventGenerating = ref(false)
const generalTips = ref('')

// 标签页配置
const tabs = [
  { label: '人物画像', value: 'profile' },
  { label: '聊天记录', value: 'chat' },
  { label: '日记', value: 'diary' },
  { label: '智能助手', value: 'assistant' }
]

// 计算属性
const persons = computed(() => emotionStore.persons)
const currentPersonId = computed(() => emotionStore.currentPersonId)
const currentPerson = computed(() => emotionStore.currentPerson)
const currentChatRecords = computed(() => emotionStore.currentChatRecords)
const currentDiaries = computed(() => emotionStore.currentDiaries)

// 方法
async function selectPerson(personId) {
  emotionStore.setCurrentPerson(personId)
  await emotionStore.loadChatRecords(personId)
  currentTab.value = 'profile'
}

function getPersonStatus(person) {
  const chatCount = emotionStore.chatRecords.filter(r => r.personId === person.id).length
  const diaryCount = emotionStore.diaries.filter(d => d.personId === person.id).length
  if (person.profile) {
    return `已分析 · ${chatCount}条聊天`
  }
  return `${chatCount}条聊天 · ${diaryCount}篇日记`
}

async function analyzePerson() {
  if (!currentPersonId.value) {
    appStore.toast('请先选择一个人物', 'warning')
    return
  }

  if (!chatStore.currentClient) {
    appStore.toast('AI 客户端未初始化，请先配置 API 密钥', 'warning')
    appStore.showApiKeyDialog = true
    return
  }

  analyzing.value = true
  loadingMessage.value = '正在分析人物画像...'

  try {
    const aiTool = new EmotionAITool(emotionStore, chatStore.currentClient)
    const result = await aiTool.execute('analyzePerson', {
      personId: currentPersonId.value,
      analysisDepth: 'detailed'
    }, (msg) => {
      loadingMessage.value = msg
    })

    console.log('分析结果:', result)
    loadingMessage.value = ''

    // 重新加载人物数据以获取更新后的画像
    await emotionStore.loadPersons()
    appStore.toast('人物画像分析完成', 'success')
  } catch (error) {
    console.error('分析失败:', error)
    appStore.toast('分析失败: ' + error.message, 'error')
  } finally {
    analyzing.value = false
    loadingMessage.value = ''
  }
}

async function simulateReply() {
  if (!simulateInput.value) {
    appStore.toast('请输入要发送的消息', 'warning')
    return
  }

  if (!currentPersonId.value) {
    appStore.toast('请先选择一个人物', 'warning')
    return
  }

  if (!chatStore.currentClient) {
    appStore.toast('AI 客户端未初始化，请先配置 API 密钥', 'warning')
    appStore.showApiKeyDialog = true
    return
  }

  simulating.value = true
  loadingMessage.value = '正在模拟回复...'

  try {
    const aiTool = new EmotionAITool(emotionStore, chatStore.currentClient)
    const result = await aiTool.execute('simulateReply', {
      personId: currentPersonId.value,
      myMessage: simulateInput.value
    }, (msg) => {
      loadingMessage.value = msg
    })

    console.log('模拟结果:', result)
    simulatedReply.value = result.simulatedReply
    loadingMessage.value = ''
    appStore.toast('模拟回复生成完成', 'success')
  } catch (error) {
    console.error('模拟失败:', error)
    appStore.toast('模拟失败: ' + error.message, 'error')
  } finally {
    simulating.value = false
    loadingMessage.value = ''
  }
}

async function generateSuggestions() {
  if (!suggestionInput.value) {
    appStore.toast('请输入收到的消息', 'warning')
    return
  }

  if (!currentPersonId.value) {
    appStore.toast('请先选择一个人物', 'warning')
    return
  }

  if (!chatStore.currentClient) {
    appStore.toast('AI 客户端未初始化，请先配置 API 密钥', 'warning')
    appStore.showApiKeyDialog = true
    return
  }

  suggesting.value = true
  loadingMessage.value = '正在生成回复建议...'

  try {
    const aiTool = new EmotionAITool(emotionStore, chatStore.currentClient)
    const result = await aiTool.execute('generateReplySuggestions', {
      personId: currentPersonId.value,
      receivedMessage: suggestionInput.value,
      replyGoal: replyGoal.value
    }, (msg) => {
      loadingMessage.value = msg
    })

    console.log('建议结果:', result)
    suggestions.value = result.suggestions || []
    loadingMessage.value = ''
    appStore.toast(`已生成 ${suggestions.value.length} 条回复建议`, 'success')
  } catch (error) {
    console.error('生成建议失败:', error)
    appStore.toast('生成建议失败: ' + error.message, 'error')
  } finally {
    suggesting.value = false
    loadingMessage.value = ''
  }
}

async function generateEventSuggestions() {
  if (!eventType.value) {
    appStore.toast('请选择场景类型', 'warning')
    return
  }

  if (!currentPersonId.value) {
    appStore.toast('请先选择一个人物', 'warning')
    return
  }

  if (!chatStore.currentClient) {
    appStore.toast('AI 客户端未初始化，请先配置 API 密钥', 'warning')
    appStore.showApiKeyDialog = true
    return
  }

  eventGenerating.value = true
  loadingMessage.value = `正在生成${eventType.value}场景建议...`

  try {
    const aiTool = new EmotionAITool(emotionStore, chatStore.currentClient)
    const result = await aiTool.execute('generateEventSuggestions', {
      personId: currentPersonId.value,
      eventType: eventType.value,
      eventContext: eventContext.value
    }, (msg) => {
      loadingMessage.value = msg
    })

    console.log('场景建议结果:', result)
    eventSuggestions.value = result.suggestions || []
    generalTips.value = result.generalTips || ''
    loadingMessage.value = ''
    appStore.toast(`已生成 ${eventSuggestions.value.length} 条场景建议`, 'success')
  } catch (error) {
    console.error('生成场景建议失败:', error)
    appStore.toast('生成场景建议失败: ' + error.message, 'error')
  } finally {
    eventGenerating.value = false
    loadingMessage.value = ''
  }
}

function copySuggestion(text) {
  navigator.clipboard.writeText(text)
  appStore.toast('已复制到剪贴板', 'success')
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN')
}

function onPersonCreated(person) {
  emotionStore.setCurrentPerson(person.id)
  showCreatePersonDialog.value = false
}

function onChatImported() {
  emotionStore.loadChatRecords(currentPersonId.value)
  showImportDialog.value = false
  currentTab.value = 'chat'
}

function onChatAdded() {
  emotionStore.loadChatRecords(currentPersonId.value)
  showAddChatDialog.value = false
}

function onDiaryAdded() {
  emotionStore.loadDiaries(currentPersonId.value)
  showAddDiaryDialog.value = false
}

function viewDiary(diary) {
  // TODO: 实现日记查看对话框
  console.log('查看日记:', diary)
}

// 初始化
onMounted(async () => {
  await emotionStore.init()
})
</script>

<style scoped>
.emotion-page {
  width: 100%;
  display: flex;
  height: 100%;
  background: var(--bg-primary);
}

.person-sidebar {
  width: 260px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.sidebar-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-add {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.person-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.person-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.person-item:hover {
  background: var(--hover-bg);
}

.person-item.active {
  background: var(--primary-color);
  color: white;
}

.person-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-weight: 600;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-status {
  font-size: 12px;
  opacity: 0.7;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.person-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-header h2 {
  margin: 0;
  font-size: 24px;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary, .btn-sm, .btn-copy {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
}

.tab {
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-profile {
  text-align: center;
  padding: 60px 20px;
}

.chat-view, .diary-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header, .diary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-tertiary);
}

.chat-bubble.me {
  align-self: flex-end;
  background: var(--primary-light);
}

.chat-bubble.them {
  align-self: flex-start;
}

.chat-bubble .sender {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.chat-bubble .content {
  margin-bottom: 4px;
  word-wrap: break-word;
}

.chat-bubble .time {
  font-size: 11px;
  opacity: 0.5;
  text-align: right;
}

.diary-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.diary-item {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.diary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.diary-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.diary-item .preview {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.diary-item .meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary);
}

.assistant-view {
  max-width: 800px;
  margin: 0 auto;
}

.assistant-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.assistant-section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.hint {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.input-group .select {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.result-box {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.result-box strong {
  display: block;
  margin-bottom: 8px;
}

.suggestions-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-card {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  position: relative;
}

.sug-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sug-style {
  font-size: 13px;
  padding: 4px 12px;
  background: var(--primary-light);
  border-radius: 4px;
}

.sug-score {
  font-weight: 600;
  color: var(--primary-color);
}

.sug-content {
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  margin-bottom: 12px;
  line-height: 1.6;
}

.sug-meta {
  font-size: 13px;
  color: var(--text-secondary);
}

.sug-meta p {
  margin: 4px 0;
}

.btn-copy {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--primary-color);
  color: white;
  padding: 6px 12px;
  font-size: 12px;
}

.empty-state, .empty-chat, .empty-diary {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.general-tips {
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.6;
}

.event-card {
  border-left: 3px solid var(--primary-color);
}

.event-card .sug-style {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
</style>
