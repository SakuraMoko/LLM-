<template>
  <div class="message-item" :class="[message.role]">
    <!-- Avatar -->
    <div class="avatar">
      <span v-if="message.role === 'user'">你</span>
      <span v-else class="ai-avatar">◈</span>
    </div>

    <!-- Bubble -->
    <div class="bubble">
      <div
        v-if="message.role === 'assistant'"
        class="md-content"
        v-html="renderedContent"
      />
      <div v-else class="user-text">{{ message.content }}</div>

      <div class="meta">
        <span class="time">{{ formatTime(message.timestamp) }}</span>
        <button
          v-if="message.role === 'assistant'"
          class="copy-btn"
          @click="copyContent"
          :class="{ copied }"
        >
          {{ copied ? '✓ 已复制' : '复制' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const props = defineProps({
  message: { type: Object, required: true }
})

// 配置 marked + 代码高亮
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

const renderedContent = computed(() =>
  marked(props.message.content || '')
)

// 复制功能
const copied = ref(false)
async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
  }
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  animation: fadeInUp 0.2s ease;
}
.message-item.user   { flex-direction: row-reverse; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 4px;
}
.user .avatar {
  background: linear-gradient(135deg, #1e3a5f, #2b6cb0);
  color: var(--accent);
  border: 1px solid var(--border-active);
}
.assistant .avatar {
  background: linear-gradient(135deg, #1a1d27, #2d3748);
  border: 1px solid var(--border);
}
.ai-avatar {
  color: var(--accent);
  filter: drop-shadow(0 0 4px var(--accent));
  font-size: 16px;
}

.bubble {
  max-width: 72%;
  min-width: 60px;
}
.user .bubble { align-items: flex-end; display: flex; flex-direction: column; }

.user-text {
  background: var(--bg-user-msg);
  border: 1px solid rgba(99,179,237,0.2);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.md-content {
  background: var(--bg-ai-msg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg);
  padding: 12px 16px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  padding: 0 4px;
}
.user .meta { flex-direction: row-reverse; }

.time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.copy-btn {
  font-size: 11px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all var(--transition);
}
.copy-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.copy-btn.copied { color: var(--success); }
</style>
