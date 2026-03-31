/**
 * chatStore — 当前对话消息状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatStore = defineStore('chat', () => {
  // ── State ────────────────────────────────────────────────────
  const messages      = ref([])    // 当前会话消息列表
  const isStreaming   = ref(false) // 是否正在流式输出
  const streamingText = ref('')    // 正在生成中的文本（临时）

  // ── Getters ──────────────────────────────────────────────────
  /** 构造发送给 LLM 的 messages 数组（含 system prompt） */
  const llmMessages = computed(() => [
    {
      role: 'system',
      content: '你是一个智能助手，名字叫 AI语云，由阿里云通义千问驱动。请用简洁、准确、友好的中文回答用户的问题。如需使用代码，请用 Markdown 代码块格式输出。'
    },
    ...messages.value.map(m => ({ role: m.role, content: m.content }))
  ])

  // ── Actions ───────────────────────────────────────────────────
  function addUserMessage(content) {
    messages.value.push({
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    })
  }

  function startAssistantMessage() {
    isStreaming.value   = true
    streamingText.value = ''
  }

  function appendStreamChunk(chunk) {
    streamingText.value += chunk
  }

  function finalizeAssistantMessage() {
    if (streamingText.value) {
      messages.value.push({
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: streamingText.value,
        timestamp: new Date().toISOString()
      })
    }
    streamingText.value = ''
    isStreaming.value   = false
  }

  function loadMessages(msgs) {
    messages.value = msgs || []
  }

  function clearMessages() {
    messages.value      = []
    streamingText.value = ''
    isStreaming.value   = false
  }

  return {
    messages,
    isStreaming,
    streamingText,
    llmMessages,
    addUserMessage,
    startAssistantMessage,
    appendStreamChunk,
    finalizeAssistantMessage,
    loadMessages,
    clearMessages
  }
})
