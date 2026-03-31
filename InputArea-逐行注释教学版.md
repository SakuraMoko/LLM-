# InputArea.vue 逐行注释教学版（小白专用）

> 这个文档只讲一个文件：`src/components/InputArea.vue`  
> 目标：你能看懂“发送按钮”背后的全部逻辑。

---

## 1. 这个文件是干什么的？

`InputArea.vue` 是聊天输入区，负责 5 件事：

1. 接收你输入的文本
2. 接收语音识别结果并回填到输入框
3. 接收上传文件解析后的文本
4. 点击发送时，调用大模型接口
5. 支持“停止生成”

你可以把它理解成：**聊天系统的总控制台**。

---

## 2. 先看整体结构（3块）

一个 Vue 单文件组件（SFC）通常分 3 部分：

- `<template>`：页面长什么样
- `<script setup>`：逻辑怎么跑
- `<style scoped>`：样式怎么写

---

## 3. template 部分（页面结构）

### 3.1 外层容器

```vue
<div class="input-area">
```

作用：输入区的大盒子，里面装工具栏、输入框、底部提示。

---

### 3.2 工具栏 toolbar

```vue
<div class="toolbar">
  <FileUpload @fileContent="onFileContent" @clear="onFileClear" />
  <VoiceButton @transcript="onVoiceTranscript" />
  <div class="spacer" />
  <span v-if="chatStore.isStreaming" class="streaming-hint">
    <span class="dot-blink" />AI 正在回复中...
  </span>
</div>
```

逐句理解：

- `FileUpload`：文件上传子组件
  - `@fileContent="onFileContent"`：子组件解析完文件后，把内容传回来
  - `@clear="onFileClear"`：用户移除文件时，通知父组件清空附件状态

- `VoiceButton`：语音按钮子组件
  - `@transcript="onVoiceTranscript"`：语音识别结果回传给输入框

- `spacer`：占位，把右侧提示顶到最右边

- `v-if="chatStore.isStreaming"`：当 AI 正在回复时显示“AI 正在回复中”

---

### 3.3 输入框 + 发送按钮

```vue
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
```

重点：

- `v-model="inputText"`：双向绑定。你打字 -> `inputText` 自动更新。
- `@keydown="handleKeydown"`：监听键盘快捷键。
- `:disabled="chatStore.isStreaming"`：AI回复中时输入框禁用。

发送按钮逻辑：

```vue
<button v-if="chatStore.isStreaming" @click="stopGeneration">⏹</button>
<button v-else :disabled="!canSend" @click="handleSend">➤</button>
```

意思是：
- 正在生成时：显示“停止按钮”
- 非生成时：显示“发送按钮”

---

### 3.4 底部提示

```vue
<span class="hint">Ctrl + Enter 发送 · Enter 换行</span>
<span class="char-count" :class="{ over: inputText.length > 2000 }">
  {{ inputText.length }} / 2000
</span>
```

作用：
- 提示快捷键
- 显示字符数，超过 2000 就变红（仅提醒，不是强拦截）

---

## 4. script setup 部分（核心逻辑）

## 4.1 import（把依赖拿进来）

```js
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore }    from '@/stores/chatStore'
import { useSessionStore } from '@/stores/sessionStore'
import { streamChat }      from '@/api/llmApi'
import VoiceButton  from './VoiceButton.vue'
import FileUpload   from './FileUpload.vue'
```

解释：
- `ref`：创建响应式变量
- `computed`：计算属性（自动跟踪依赖）
- `ElMessage`：弹消息提示
- `useChatStore`：当前聊天状态
- `useSessionStore`：历史会话状态
- `streamChat`：真正请求大模型的函数

---

## 4.2 取 store 实例

```js
const chatStore    = useChatStore()
const sessionStore = useSessionStore()
```

理解：
- 这两行像“连接数据库”的感觉，后面就能读写全局状态。

---

## 4.3 本地状态变量

```js
const inputText   = ref('')
const fileContent = ref('')
const fileName    = ref('')
let   abortCtrl   = null
```

解释：
- `inputText`：输入框内容
- `fileContent`：上传文件解析后的纯文本
- `fileName`：附件名
- `abortCtrl`：请求取消器（用于停止生成）

---

## 4.4 canSend 计算属性

```js
const canSend = computed(() =>
  (inputText.value.trim() || fileContent.value) &&
  !chatStore.isStreaming
)
```

意思是：只有满足下面两个条件才允许发送：
1. 有内容（文本或附件）
2. 当前不在生成中

---

## 4.5 `handleSend()`（最关键函数）

```js
async function handleSend() {
  const text = inputText.value.trim()
  if (!text && !fileContent.value) return
```

第一步：拿到输入并防空提交。

---

```js
  const content = fileContent.value
    ? `[附件: ${fileName.value}]\n\`\`\`\n${fileContent.value}\n\`\`\`\n\n${text}`
    : text
```

第二步：如果有附件，就把附件内容拼进最终消息。  
这样模型就能“看到”附件内容。

---

```js
  inputText.value   = ''
  fileContent.value = ''
  fileName.value    = ''
```

第三步：发送前先清空 UI（体验更顺滑）。

---

```js
  if (!sessionStore.activeSessionId) {
    sessionStore.createSession(text || fileName.value)
  }
```

第四步：如果这是新对话（还没有会话ID），先创建一个会话。

---

```js
  chatStore.addUserMessage(content)
  chatStore.startAssistantMessage()
```

第五步：
- 先把用户消息塞进消息列表（马上看到）
- 再把 AI 状态切成“正在生成”

---

```js
  abortCtrl = new AbortController()
```

第六步：创建“停止生成”需要的控制器。

---

```js
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
```

第七步：真正请求大模型。

5个参数分别是：
1. `chatStore.llmMessages`：发送给模型的上下文
2. `onChunk`：每来一小段文本就追加
3. `onDone`：生成完成后收尾（固化消息+保存历史）
4. `onError`：报错时提示
5. `signal`：用于取消请求

---

## 4.6 `stopGeneration()`（停止生成）

```js
function stopGeneration() {
  abortCtrl?.abort()
  abortCtrl = null
  chatStore.finalizeAssistantMessage()
  sessionStore.saveMessages(sessionStore.activeSessionId, chatStore.messages)
}
```

解释：
- `abort()`：中断当前请求
- `?.`：可选链，防止 `abortCtrl` 为空时报错
- 即便中断，也把已生成内容保存下来

---

## 4.7 键盘快捷键

```js
function handleKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    handleSend()
  }
}
```

作用：按 `Ctrl + Enter` 发送，`Enter` 保留换行。

---

## 4.8 子组件回调

```js
function onVoiceTranscript(text) {
  inputText.value += (inputText.value ? ' ' : '') + text
}
```

语音回填：把识别文字拼到输入框末尾。

```js
function onFileContent({ content, name }) {
  fileContent.value = content
  fileName.value    = name
}
```

文件解析后保存到本地状态。

```js
function onFileClear() {
  fileContent.value = ''
  fileName.value    = ''
}
```

用户移除附件时清空状态。

---

## 5. style 部分（你只需知道这 4 类）

1. 布局类：`.input-area` / `.toolbar` / `.input-row`
2. 按钮类：`.send-btn` / `.stop-btn`
3. 提示类：`.streaming-hint` / `.dot-blink`
4. 统计类：`.char-count.over`

小白阶段不用深抠样式，先知道“样式不影响业务逻辑”。

---

## 6. 这个文件最容易问到的 5 个面试题（新手版）

1. **为什么用 `computed canSend`？**  
为了统一按钮可用条件，模板更干净。

2. **为什么要 `AbortController`？**  
为了支持“停止生成”。

3. **为什么发送前先清空输入框？**  
提升交互体验，避免用户误以为没发送。

4. **为什么附件内容要拼到消息里？**  
模型只认识文本，把附件转文本才能理解。

5. **为什么 onDone 要保存会话？**  
确保刷新后还能恢复对话历史。

---

## 7. 你可以马上做的 3 个小改动（练手）

### 改动1：把字符上限从 2000 改成 1000
- 模板里 `inputText.length > 2000`
- 展示文案 `{{ inputText.length }} / 2000`

### 改动2：把发送快捷键改成 `Alt + Enter`
- 修改 `handleKeydown` 判断条件

### 改动3：发送成功后弹提示
- 在 `onDone` 里加：`ElMessage.success('发送完成')`

---

## 8. 一句话总结 InputArea.vue

> `InputArea.vue` 是聊天入口总控：负责收集输入、发请求、接流式、停生成、存会话。

---

## 9. 你下一步该看哪个文件？

建议立刻看：`src/api/llmApi.js`。  
原因：它是 InputArea 的下游，你刚好顺着主链路继续看。

如果你愿意，我下一份可以继续给你：
**`llmApi.js` 同款逐行注释教学版（小白专用）**。
