<template>
  <div class="chat-window" ref="windowRef">
    <!-- Empty state -->
    <div v-if="messages.length === 0 && !isStreaming" class="welcome">
      <div class="welcome-icon">◈</div>
      <h2 class="welcome-title">AI 语云</h2>
      <p class="welcome-sub">智能对话 · 语音输入 · 文件解析</p>
      <div class="welcome-tips">
        <div class="tip" v-for="tip in tips" :key="tip">{{ tip }}</div>
      </div>
    </div>

    <!-- Message list (virtual scroll) -->
    <DynamicScroller
      v-show="messages.length > 0"
      ref="scrollerRef"
      class="scroller"
      :items="messages"
      :min-item-size="80"
      key-field="id"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem :item="item" :active="active" :data-index="index">
          <MessageItem :message="item" />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <!-- Streaming bubble -->
    <div v-if="isStreaming" class="streaming-wrap">
      <div class="streaming-bubble">
        <span class="ai-avatar-sm">◈</span>
        <div class="streaming-content md-content" v-html="streamingHtml" />
        <span class="cursor-blink" />
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <Transition name="fade">
      <button v-if="showScrollBtn" class="scroll-btn" @click="scrollToBottom">↓</button>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { marked } from 'marked'
import { useChatStore } from '@/stores/chatStore'
import MessageItem from './MessageItem.vue'

const chatStore = useChatStore()
const windowRef   = ref(null)
const scrollerRef = ref(null)
const showScrollBtn = ref(false)

const messages      = computed(() => chatStore.messages)
const isStreaming   = computed(() => chatStore.isStreaming)
const streamingHtml = computed(() => marked(chatStore.streamingText || ''))

const tips = [
  '💬  发送消息开始对话',
  '🎤  点击麦克风按钮语音输入',
  '📎  上传 PDF / DOCX / TXT 文件解析',
  '🔄  左侧可管理历史对话'
]

async function scrollToBottom() {
  await nextTick()
  if (scrollerRef.value) {
    scrollerRef.value.scrollToItem(messages.value.length - 1)
  }
}

watch(() => messages.value.length, scrollToBottom)
watch(() => chatStore.streamingText, scrollToBottom)
</script>

<style scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  padding: 0 0 8px;
}
.scroller { flex: 1; padding: 16px 20px; }

.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
}
.welcome-icon {
  font-size: 56px;
  color: var(--accent);
  filter: drop-shadow(0 0 20px var(--accent));
  animation: gradientShift 4s ease infinite;
}
.welcome-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.welcome-sub { color: var(--text-secondary); font-size: 14px; }
.welcome-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}
.tip {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.streaming-wrap {
  padding: 0 20px 8px;
}
.streaming-bubble {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: fadeInUp 0.2s ease;
}
.ai-avatar-sm {
  font-size: 20px;
  color: var(--accent);
  filter: drop-shadow(0 0 4px var(--accent));
  flex-shrink: 0;
  margin-top: 10px;
}
.streaming-content {
  background: var(--bg-ai-msg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg);
  padding: 12px 16px;
  max-width: 72%;
}
.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  vertical-align: text-bottom;
  animation: blink 0.7s step-end infinite;
  margin-left: 2px;
}

.scroll-btn {
  position: absolute;
  bottom: 20px;
  right: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 1px solid var(--border-active);
  color: var(--accent);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-panel);
  transition: all var(--transition);
}
.scroll-btn:hover { background: var(--accent-glow); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
