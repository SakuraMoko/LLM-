/**
 * sessionStore — 历史会话列表 + localStorage 持久化
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY  = 'ai_yuyun_sessions'
const MAX_SESSIONS = 50

export const useSessionStore = defineStore('session', () => {
  // ── State ────────────────────────────────────────────────────
  const sessions       = ref([])   // 所有历史会话
  const activeSessionId = ref(null)

  // ── Getters ──────────────────────────────────────────────────
  const activeSession = computed(() =>
    sessions.value.find(s => s.id === activeSessionId.value) || null
  )

  // ── 初始化：从 localStorage 恢复 ──────────────────────────────
  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        sessions.value = JSON.parse(raw)
        if (sessions.value.length > 0) {
          activeSessionId.value = sessions.value[0].id
        }
      }
    } catch {
      sessions.value = []
    }
  }

  // ── 持久化 ────────────────────────────────────────────────────
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
    } catch (e) {
      console.warn('localStorage 写入失败:', e.message)
    }
  }

  // ── Actions ───────────────────────────────────────────────────
  function createSession(firstMessage = '新对话') {
    const title = firstMessage.replace(/\[附件:.*?\]\n```[\s\S]*?```\n\n用户问题: /g, '')
                              .slice(0, 20)
    const session = {
      id: `session_${Date.now()}`,
      title: title || '新对话',
      messages: [],
      createdAt: new Date().toISOString()
    }
    sessions.value.unshift(session)
    activeSessionId.value = session.id
    pruneOldSessions()
    persist()
    return session.id
  }

  function saveMessages(sessionId, messages) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.messages = JSON.parse(JSON.stringify(messages)) // deep clone
      session.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function deleteSession(sessionId) {
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx === -1) return
    sessions.value.splice(idx, 1)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = sessions.value[0]?.id || null
    }
    persist()
    return activeSessionId.value
  }

  function switchSession(sessionId) {
    activeSessionId.value = sessionId
  }

  function renameSession(sessionId, newTitle) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.title = newTitle.slice(0, 30)
      persist()
    }
  }

  function pruneOldSessions() {
    if (sessions.value.length > MAX_SESSIONS) {
      sessions.value = sessions.value.slice(0, MAX_SESSIONS)
    }
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    init,
    createSession,
    saveMessages,
    deleteSession,
    switchSession,
    renameSession
  }
})
