<template>
  <div class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">AI 语云</span>
      </div>
      <el-button class="new-chat-btn" @click="handleNewChat" :icon="Plus" size="small">
        新对话
      </el-button>
    </div>

    <!-- Session List -->
    <div class="session-list">
      <div v-if="sessions.length === 0" class="empty-hint">
        <p>暂无历史对话</p>
        <p>点击「新对话」开始</p>
      </div>

      <TransitionGroup name="session-item" tag="div">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === activeSessionId }"
          @click="handleSwitch(session.id)"
        >
          <div class="session-icon">💬</div>
          <div class="session-info">
            <div class="session-title">{{ session.title }}</div>
            <div class="session-date">{{ formatDate(session.createdAt) }}</div>
          </div>
          <el-button
            class="delete-btn"
            :icon="Delete"
            size="small"
            text
            @click.stop="handleDelete(session.id)"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="model-badge">
        <span class="dot" />
        {{ modelName }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useChatStore }    from '@/stores/chatStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ElMessageBox }    from 'element-plus'

const chatStore    = useChatStore()
const sessionStore = useSessionStore()

const sessions       = computed(() => sessionStore.sessions)
const activeSessionId = computed(() => sessionStore.activeSessionId)
const modelName      = computed(() => import.meta.env.VITE_MODEL || 'gpt-4o-mini')

function handleNewChat() {
  if (chatStore.messages.length > 0 && sessionStore.activeSessionId) {
    sessionStore.saveMessages(sessionStore.activeSessionId, chatStore.messages)
  }
  chatStore.clearMessages()
  sessionStore.activeSessionId = null
}

function handleSwitch(sessionId) {
  if (sessionId === sessionStore.activeSessionId) return
  // 保存当前会话
  if (sessionStore.activeSessionId) {
    sessionStore.saveMessages(sessionStore.activeSessionId, chatStore.messages)
  }
  // 加载目标会话
  sessionStore.switchSession(sessionId)
  const target = sessionStore.sessions.find(s => s.id === sessionId)
  chatStore.loadMessages(target?.messages || [])
}

async function handleDelete(sessionId) {
  try {
    await ElMessageBox.confirm('确定删除这条对话记录吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText:  '取消',
      type: 'warning'
    })
    const nextId = sessionStore.deleteSession(sessionId)
    if (nextId) {
      const target = sessionStore.sessions.find(s => s.id === nextId)
      chatStore.loadMessages(target?.messages || [])
    } else {
      chatStore.clearMessages()
    }
  } catch {
    // 用户取消
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000)      return '刚刚'
  if (diff < 3600000)    return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000)   return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  min-width: 240px;
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.02em;
}

.logo-icon {
  font-size: 20px;
  color: var(--accent);
  filter: drop-shadow(0 0 6px var(--accent));
}

.logo-text {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.new-chat-btn {
  background: var(--accent-glow) !important;
  border-color: var(--border-active) !important;
  color: var(--accent) !important;
  font-size: 12px !important;
  padding: 4px 10px !important;
}
.new-chat-btn:hover {
  background: rgba(99,179,237,0.2) !important;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-hint {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 2;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
  position: relative;
  margin-bottom: 2px;
}
.session-item:hover { background: rgba(255,255,255,0.05); }
.session-item.active {
  background: var(--accent-glow);
  border: 1px solid var(--border-active);
}
.session-item.active:hover { background: rgba(99,179,237,0.18); }

.session-icon { font-size: 16px; flex-shrink: 0; }

.session-info { flex: 1; overflow: hidden; }
.session-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}
.session-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.delete-btn {
  opacity: 0;
  transition: opacity var(--transition);
  color: var(--danger) !important;
  padding: 2px !important;
}
.session-item:hover .delete-btn { opacity: 1; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.model-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

/* Transition */
.session-item-enter-active { animation: fadeInUp 0.2s ease; }
.session-item-leave-active { transition: opacity 0.2s, transform 0.2s; }
.session-item-leave-to     { opacity: 0; transform: translateX(-10px); }
</style>
