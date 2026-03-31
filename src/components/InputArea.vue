<template>
  <div class="input-area">
    <!-- File badge row -->
    <div class="toolbar">
      <FileUpload @fileContent="onFileContent" @clear="onFileClear" />
      <VoiceButton @transcript="onVoiceTranscript" />
      <div class="spacer" />
      <span v-if="chatStore.isStreaming" class="streaming-hint">
        <span class="dot-blink" />AI 正在回复中...
      </span>
    </div>

    <!-- Text input row -->
    <div class="input-row">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        placeholder="输入消息，Ctrl+Enter 发送..."
        resize="none"
        @keydown="handleKeydown"
        :disabled="chatStore.isStreaming"
        class="chat-textarea"
      />
      <div class="send-col">
        <button
          v-if="chatStore.isStreaming"
          class="stop-btn"
          @click="stopGeneration"
          title="停止生成"
        >⏹</button>
        <button
          v-else
          class="send-btn"
          :disabled="!canSend"
          @click="handleSend"
          title="发送 (Ctrl+Enter)"
        >➤</button>
      </div>
    </div>

    <div class="input-footer">
      <span class="hint">Ctrl + Enter 发送 · Enter 换行</span>
      <span class="char-count" :class="{ over: inputText.length > 2000 }">
        {{ inputText.length }} / 2000
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore }    from '@/stores/chatStore'
import { useSessionStore } from '@/stores/sessionStore'
import { streamChat }      from '@/api/llmApi'
import VoiceButton  from './VoiceButton.vue'
import FileUpload   from './FileUpload.vue'

const chatStore    = useChatStore()
const sessionStore = useSessionStore()

const inputText   = ref('')
const fileContent = ref('')
const fileName    = ref('')
let   abortCtrl   = null

const canSend = computed(() =>
  (inputText.value.trim() || fileContent.value) &&
  !chatStore.isStreaming
)

// ── Send ────────────────────────────────────────────────────────
async function handleSend() {
  const text = inputText.value.trim()
  if (!text && !fileContent.value) return

  // 拼接附件上下文
  const content = fileContent.value
    ? `[附件: ${fileName.value}]\n\`\`\`\n${fileContent.value}\n\`\`\`\n\n${text}`
    : text

  inputText.value   = ''
  fileContent.value = ''
  fileName.value    = ''

  // 首条消息时新建会话
  if (!sessionStore.activeSessionId) {
    sessionStore.createSession(text || fileName.value)
  }

  chatStore.addUserMessage(content)
  chatStore.startAssistantMessage()

  abortCtrl = new AbortController()

  await streamChat(
    chatStore.llmMessages,
    chunk => chatStore.appendStreamChunk(chunk),
    ()    => {
      chatStore.finalizeAssistantMessage()
      sessionStore.saveMessages(sessionStore.activeSessionId, chatStore.messages)
      abortCtrl = null
    },
    err   => {
      chatStore.finalizeAssistantMessage()
      ElMessage.error(`请求失败: ${err.message}`)
      abortCtrl = null
    },
    abortCtrl.signal
  )
}

// ── Stop generation ─────────────────────────────────────────────
function stopGeneration() {
  abortCtrl?.abort()
  abortCtrl = null
  chatStore.finalizeAssistantMessage()
  sessionStore.saveMessages(sessionStore.activeSessionId, chatStore.messages)
}

// ── Keyboard shortcut ───────────────────────────────────────────
function handleKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    handleSend()
  }
}

// ── Voice & File callbacks ──────────────────────────────────────
function onVoiceTranscript(text) {
  inputText.value += (inputText.value ? ' ' : '') + text
}

function onFileContent({ content, name }) {
  fileContent.value = content
  fileName.value    = name
}

function onFileClear() {
  fileContent.value = ''
  fileName.value    = ''
}
</script>

<style scoped>
.input-area {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spacer { flex: 1; }
.streaming-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.dot-blink {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
  animation: blink 0.8s step-end infinite;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.chat-textarea { flex: 1; }

.send-col {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 2px;
}

.send-btn, .stop-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  flex-shrink: 0;
}

.send-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  box-shadow: 0 2px 12px var(--accent-glow);
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 18px var(--accent-glow);
}
.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.stop-btn {
  background: rgba(252,129,129,0.15);
  border: 1px solid rgba(252,129,129,0.4);
  color: var(--danger);
}
.stop-btn:hover {
  background: rgba(252,129,129,0.25);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2px;
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.char-count {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.char-count.over { color: var(--danger); }
</style>
