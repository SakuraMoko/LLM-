<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main area -->
    <div class="main-area">
      <!-- Top bar -->
      <div class="topbar">
        <div class="session-title">
          {{ currentTitle }}
        </div>
        <div class="topbar-actions">
          <el-button
            v-if="chatStore.messages.length > 0"
            size="small" text
            @click="clearCurrent"
            style="color: var(--text-muted); font-size:12px"
          >清空当前对话</el-button>
        </div>
      </div>

      <!-- Chat window -->
      <ChatWindow />

      <!-- Input area -->
      <InputArea />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useChatStore }    from '@/stores/chatStore'
import { useSessionStore } from '@/stores/sessionStore'
import Sidebar    from '@/components/Sidebar.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import InputArea  from '@/components/InputArea.vue'

const chatStore    = useChatStore()
const sessionStore = useSessionStore()

// 初始化：从 localStorage 恢复历史
onMounted(() => {
  sessionStore.init()
  // 加载最近一条会话
  const latest = sessionStore.sessions[0]
  if (latest) {
    sessionStore.switchSession(latest.id)
    chatStore.loadMessages(latest.messages || [])
  }
})

const currentTitle = computed(() => {
  if (!sessionStore.activeSessionId) return '新对话'
  return sessionStore.activeSession?.title || '对话'
})

function clearCurrent() {
  chatStore.clearMessages()
  if (sessionStore.activeSessionId) {
    sessionStore.saveMessages(sessionStore.activeSessionId, [])
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(99,179,237,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(159,122,234,0.06) 0%, transparent 50%),
    var(--bg-base);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: rgba(13,15,20,0.8);
  backdrop-filter: blur(12px);
}

.session-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
}
</style>
