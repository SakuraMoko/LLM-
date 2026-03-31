<template>
  <div class="voice-btn-wrap">
    <button
      class="voice-btn"
      :class="{ listening: isListening, unsupported: !isSupported }"
      @click="toggle"
      :title="btnTitle"
    >
      <span class="mic-icon">{{ isListening ? '⏹' : '🎤' }}</span>
      <span v-if="isListening" class="pulse-ring" />
    </button>

    <!-- Interim text preview -->
    <Transition name="fade">
      <div v-if="isListening && (interimText || transcript)" class="interim-preview">
        <span class="interim-dot" />
        {{ interimText || transcript || '请说话...' }}
      </div>
    </Transition>

    <div v-if="errorMsg" class="voice-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSpeech } from '@/utils/speechModule'

const emit = defineEmits(['transcript'])

const {
  isListening, transcript, interimText,
  errorMsg, isSupported,
  startListening, stopListening
} = useSpeech()

const btnTitle = computed(() => {
  if (!isSupported.value) return '当前浏览器不支持语音识别'
  return isListening.value ? '点击停止录音' : '点击开始语音输入'
})

function toggle() {
  if (!isSupported.value) return
  if (isListening.value) {
    stopListening()
    if (transcript.value.trim()) {
      emit('transcript', transcript.value.trim())
    }
  } else {
    startListening()
  }
}
</script>

<style scoped>
.voice-btn-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-input);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition);
  position: relative;
  flex-shrink: 0;
}
.voice-btn:hover {
  border-color: var(--border-active);
  background: var(--accent-glow);
}
.voice-btn.listening {
  border-color: var(--danger);
  background: rgba(252,129,129,0.15);
  box-shadow: 0 0 12px rgba(252,129,129,0.3);
}
.voice-btn.unsupported { opacity: 0.4; cursor: not-allowed; }

.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--danger);
  animation: pulseRing 1.2s ease-out infinite;
}

.interim-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.interim-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
  animation: blink 0.8s step-end infinite;
  flex-shrink: 0;
}

.voice-error {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  font-size: 11px;
  color: var(--danger);
  background: var(--bg-panel);
  border: 1px solid rgba(252,129,129,0.3);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  white-space: nowrap;
  z-index: 10;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
