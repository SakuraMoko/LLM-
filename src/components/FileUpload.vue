<template>
  <div class="file-upload-wrap">
    <input
      ref="fileInputRef"
      type="file"
      accept=".txt,.md,.csv,.pdf,.docx"
      style="display:none"
      @change="handleFileChange"
    />

    <button
      class="upload-btn"
      :class="{ loading: isParsing, hasFile: !!fileInfo }"
      :title="fileInfo ? fileInfo.name : '上传文件 (TXT/PDF/DOCX)'"
      @click="triggerInput"
      :disabled="isParsing"
    >
      <span v-if="isParsing" class="spin">⟳</span>
      <span v-else-if="fileInfo">📄</span>
      <span v-else>📎</span>
    </button>

    <!-- File badge -->
    <Transition name="fade">
      <div v-if="fileInfo" class="file-badge">
        <span class="file-name">{{ fileInfo.name }}</span>
        <button class="remove-file" @click.stop="removeFile" title="移除文件">✕</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseFile } from '@/utils/fileParser'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['fileContent', 'clear'])

const fileInputRef = ref(null)
const isParsing    = ref(false)
const fileInfo     = ref(null)

function triggerInput() {
  if (fileInfo.value) {
    removeFile()
  } else {
    fileInputRef.value.click()
  }
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  isParsing.value = true
  try {
    const result = await parseFile(file)
    fileInfo.value = { name: file.name, type: result.type }
    emit('fileContent', { content: result.content, name: file.name })
    if (result.truncated) {
      ElMessage.warning(`文件较大，已截取前 4000 字符`)
    } else {
      ElMessage.success(`「${file.name}」解析成功`)
    }
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    isParsing.value = false
    e.target.value = ''
  }
}

function removeFile() {
  fileInfo.value = null
  emit('clear')
}
</script>

<style scoped>
.file-upload-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn {
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
  flex-shrink: 0;
}
.upload-btn:hover {
  border-color: var(--border-active);
  background: var(--accent-glow);
}
.upload-btn.hasFile {
  border-color: var(--success);
  background: rgba(104,211,145,0.12);
}
.upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spin { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.file-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(104,211,145,0.1);
  border: 1px solid rgba(104,211,145,0.3);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  max-width: 160px;
}
.file-name {
  font-size: 12px;
  color: var(--success);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.remove-file {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  flex-shrink: 0;
  transition: color var(--transition);
}
.remove-file:hover { color: var(--danger); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
