<template>
  <div class="person-profile">
    <div v-if="profile" class="profile-sections">
      <!-- 性格特征 -->
      <section class="profile-section">
        <h3>🎯 性格特征</h3>
        <div class="traits">
          <span v-for="trait in profile.personality?.traits" :key="trait" class="trait-tag">
            {{ trait }}
          </span>
        </div>
        <p v-if="profile.personality?.summary" class="summary">
          {{ profile.personality.summary }}
        </p>
        <p v-if="profile.personality?.mbti" class="mbti">
          MBTI: <strong>{{ profile.personality.mbti }}</strong>
        </p>
      </section>

      <!-- 说话风格 -->
      <section class="profile-section">
        <h3>💬 说话风格</h3>
        <div class="field">
          <label>语气：</label>
          <span>{{ profile.talkStyle?.tone }}</span>
        </div>
        <div class="field">
          <label>回复风格：</label>
          <span>{{ profile.talkStyle?.replyStyle }}</span>
        </div>
        <div v-if="profile.talkStyle?.habits?.length" class="field">
          <label>口头禅：</label>
          <div class="tags">
            <span v-for="habit in profile.talkStyle.habits" :key="habit" class="tag">
              "{{ habit }}"
            </span>
          </div>
        </div>
        <div v-if="profile.talkStyle?.typicalPhrases?.length" class="field">
          <label>常说的话：</label>
          <ul class="phrase-list">
            <li v-for="phrase in profile.talkStyle.typicalPhrases" :key="phrase">
              "{{ phrase }}"
            </li>
          </ul>
        </div>
      </section>

      <!-- 情感模式 -->
      <section class="profile-section">
        <h3>❤️ 情感模式</h3>
        <p v-if="profile.emotions?.patterns" class="patterns">
          {{ profile.emotions.patterns }}
        </p>
        <div v-if="profile.emotions?.triggers" class="triggers">
          <div v-if="profile.emotions.triggers.happy?.length" class="trigger-group">
            <label>😊 开心触发：</label>
            <ul>
              <li v-for="item in profile.emotions.triggers.happy" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div v-if="profile.emotions.triggers.sad?.length" class="trigger-group">
            <label>😢 难过触发：</label>
            <ul>
              <li v-for="item in profile.emotions.triggers.sad" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div v-if="profile.emotions.triggers.angry?.length" class="trigger-group">
            <label>😠 生气触发：</label>
            <ul>
              <li v-for="item in profile.emotions.triggers.angry" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 兴趣爱好 -->
      <section class="profile-section">
        <h3>🌟 兴趣爱好</h3>
        <div v-if="profile.interests?.topics?.length" class="field">
          <label>高频话题：</label>
          <div class="tags">
            <span v-for="topic in profile.interests.topics" :key="topic" class="tag">
              {{ topic }}
            </span>
          </div>
        </div>
        <div v-if="profile.interests?.hobbies?.length" class="field">
          <label>兴趣：</label>
          <div class="tags">
            <span v-for="hobby in profile.interests.hobbies" :key="hobby" class="tag">
              {{ hobby }}
            </span>
          </div>
        </div>
        <p v-if="profile.interests?.values">
          <strong>价值观：</strong>{{ profile.interests.values }}
        </p>
      </section>

      <!-- 交流习惯 -->
      <section class="profile-section">
        <h3>📱 交流习惯</h3>
        <div class="field">
          <label>活跃时间：</label>
          <span>{{ profile.communication?.activeTime }}</span>
        </div>
        <div class="field">
          <label>主动性：</label>
          <span>{{ profile.communication?.initiative }}/10</span>
        </div>
        <div class="field">
          <label>回复速度：</label>
          <span>{{ profile.communication?.responseSpeed }}</span>
        </div>
      </section>

      <!-- 注意事项 -->
      <section v-if="profile.sensitiveAreas?.length || profile.recommendations" class="profile-section warning">
        <h3>⚠️ 注意事项</h3>
        <div v-if="profile.sensitiveAreas?.length">
          <strong>敏感话题：</strong>
          <ul>
            <li v-for="area in profile.sensitiveAreas" :key="area">{{ area }}</li>
          </ul>
        </div>
        <div v-if="profile.recommendations?.doList?.length" class="recommendations">
          <strong>✅ 建议这样做：</strong>
          <ul>
            <li v-for="item in profile.recommendations.doList" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="profile.recommendations?.dontList?.length" class="recommendations">
          <strong>❌ 避免这样做：</strong>
          <ul>
            <li v-for="item in profile.recommendations.dontList" :key="item">{{ item }}</li>
          </ul>
        </div>
      </section>

      <!-- 总结 -->
      <section v-if="profile.summary" class="profile-section summary-section">
        <h3>📝 整体总结</h3>
        <p class="summary-text">{{ profile.summary }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  profile: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.person-profile {
  max-width: 900px;
  margin: 0 auto;
}

.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

.profile-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.traits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.trait-tag {
  padding: 6px 16px;
  background: var(--primary-light);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.summary {
  margin: 12px 0 0 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.mbti {
  margin: 12px 0 0 0;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.field {
  margin-bottom: 12px;
}

.field label {
  font-weight: 600;
  margin-right: 8px;
  color: var(--text-secondary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
}

.phrase-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.phrase-list li {
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.patterns {
  margin: 0 0 16px 0;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  line-height: 1.6;
}

.triggers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trigger-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.trigger-group ul {
  margin: 0;
  padding-left: 20px;
}

.trigger-group li {
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.warning {
  border-left: 4px solid #ff9800;
}

.recommendations {
  margin-top: 16px;
}

.recommendations strong {
  display: block;
  margin-bottom: 8px;
}

.recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 4px;
}

.summary-section {
  background: linear-gradient(135deg, var(--primary-light), var(--bg-secondary));
}

.summary-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
}
</style>
