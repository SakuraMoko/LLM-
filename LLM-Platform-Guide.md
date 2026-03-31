# LLM 智能语音对话平台（AI 语云）— 全量技术总文档

> 这是项目的**唯一学习入口文档**。  
> 包含：技术栈总览、目录结构、核心实现、完整学习路径（从哪里开始看）、运行与排错。

---

## 1. 项目简介

本项目是一个基于大语言模型（LLM）的多模态对话平台，支持：

- 文本对话（多轮上下文）
- 语音输入（Web Speech API）
- 文件上传解析（TXT / PDF / DOCX）
- 流式输出（SSE / ReadableStream）
- 历史会话管理（Pinia + localStorage）
- 大量消息场景优化（vue-virtual-scroller）

适用场景：智能助手、学习问答、文档总结、知识检索问答。

---

## 2. 技术栈总览（全部）

| 分类 | 技术 | 作用 |
|---|---|---|
| 前端框架 | Vue 3 (Composition API) | 组件化开发、响应式状态 |
| 构建工具 | Vite 5 | 开发构建、代理转发 API |
| 状态管理 | Pinia | 当前会话状态 + 历史会话管理 |
| UI 组件 | Element Plus | 输入框、按钮、弹窗、消息提示 |
| 网络请求 | Fetch / Axios（依赖已装） | 对话请求、流式读取 |
| 虚拟列表 | vue-virtual-scroller | 大量消息时保证滚动性能 |
| Markdown 渲染 | marked | AI 回复富文本展示 |
| 代码高亮 | highlight.js | 代码块语法高亮 |
| 语音识别 | Web Speech API | 麦克风语音转文本 |
| 文件解析 | pdfjs-dist / mammoth | PDF / DOCX 文本提取 |
| 本地持久化 | localStorage | 历史会话缓存 |
| 大模型接口 | DashScope OpenAI-Compatible API | 通义千问模型对话（`qwen-plus`） |

---

## 3. 项目目录（重点已标注）

```text
ai-yuyun/
├── .env.local                        # ★ 环境变量（API Key、模型）
├── package.json                      # 依赖与脚本
├── vite.config.js                    # ★ Vite 代理配置
├── index.html
├── LLM-Platform-Guide.md             # ★ 当前学习总文档
└── src/
    ├── main.js                       # 入口：注册 Pinia/ElementPlus/虚拟滚动
    ├── App.vue                       # ★ 总布局 + 初始化历史会话
    ├── assets/
    │   └── styles/
    │       └── global.css            # 全局主题与 Markdown 样式
    ├── api/
    │   └── llmApi.js                 # ★ LLM 请求封装（流式+重试+超时+取消）
    ├── stores/
    │   ├── chatStore.js              # ★ 当前对话状态（messages/streaming）
    │   └── sessionStore.js           # ★ 历史会话状态（增删改查+持久化）
    ├── utils/
    │   ├── speechModule.js           # ★ 语音识别逻辑封装
    │   └── fileParser.js             # ★ 文件解析逻辑封装
    └── components/
        ├── Sidebar.vue               # 会话列表（切换/删除/新建）
        ├── ChatWindow.vue            # 消息区（虚拟列表+流式展示）
        ├── MessageItem.vue           # 单消息渲染（Markdown/复制）
        ├── InputArea.vue             # ★ 文本/语音/附件输入整合 + 发送
        ├── VoiceButton.vue           # 麦克风录音按钮
        └── FileUpload.vue            # 文件上传与解析入口
```

---

## 4. 推荐学习顺序（从哪里开始看）

> 如果你是后续接手/复盘，按下面顺序看，效率最高。

### 第 0 步（先跑起来）
1. 看 `.env.local`（确认 API Key、模型、基础 URL）
2. 看 `vite.config.js`（确认 `/api` 代理到 DashScope）
3. 执行 `npm run dev`

### 第 1 步（看主流程）
1. `src/App.vue`：整体页面结构 + 初始化会话
2. `src/components/InputArea.vue`：发送入口（最关键）
3. `src/api/llmApi.js`：请求大模型与流式处理
4. `src/components/ChatWindow.vue`：消息展示与流式显示

### 第 2 步（看状态设计）
1. `src/stores/chatStore.js`：当前会话消息 + 流式状态
2. `src/stores/sessionStore.js`：历史会话 + localStorage

### 第 3 步（看增强能力）
1. `src/utils/speechModule.js` + `VoiceButton.vue`（语音）
2. `src/utils/fileParser.js` + `FileUpload.vue`（附件解析）
3. `MessageItem.vue`（Markdown + 代码高亮 + 复制）

### 第 4 步（看样式体系）
1. `src/assets/styles/global.css`（主题、变量、基础动画）

---

## 5. 核心业务流程（全链路）

```text
用户输入（文本/语音/附件）
  -> InputArea.vue 组装最终消息
  -> chatStore.addUserMessage()
  -> chatStore.startAssistantMessage()
  -> llmApi.streamChat()
      -> onChunk: chatStore.appendStreamChunk()
      -> onDone : chatStore.finalizeAssistantMessage()
  -> sessionStore.saveMessages()
  -> localStorage 持久化
  -> ChatWindow.vue 实时展示
```

---

## 6. 关键模块说明

## 6.1 LLM API 模块（`src/api/llmApi.js`）

能力：
- 统一请求入口
- 流式返回逐段解析
- 超时控制（AbortController）
- 异常重试（指数退避）
- 支持外部取消（停止生成）

接口调用路径：
- 前端请求：`/api/chat/completions`
- Vite 代理到：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`

---

## 6.2 当前聊天状态（`src/stores/chatStore.js`）

核心状态：
- `messages`：当前会话全部消息
- `isStreaming`：是否正在流式生成
- `streamingText`：流式临时文本
- `llmMessages`：发送给模型的上下文（含 system）

核心动作：
- `addUserMessage`
- `startAssistantMessage`
- `appendStreamChunk`
- `finalizeAssistantMessage`
- `loadMessages` / `clearMessages`

---

## 6.3 历史会话状态（`src/stores/sessionStore.js`）

核心能力：
- 新建会话
- 切换会话
- 删除会话
- 改标题
- 保存消息到 localStorage
- 页面刷新后恢复历史

数据上限：
- 最多缓存 `MAX_SESSIONS = 50` 条历史会话

---

## 6.4 输入聚合模块（`src/components/InputArea.vue`）

职责：
- 聚合文本、语音转写、文件内容
- 组装发送内容
- 首次发送自动新建会话
- 支持 `Ctrl + Enter` 快捷发送
- 支持“停止生成”

附件拼接格式：
- 将解析内容注入到用户问题前，形成模型上下文。

---

## 6.5 语音模块（`src/utils/speechModule.js` + `VoiceButton.vue`）

能力：
- 浏览器语音识别能力检测
- 录音开始/停止
- 中间结果（interim）+ 最终结果（final）
- 常见错误提示（权限、无语音、网络）

注意：
- 推荐使用 Chrome / Edge。

---

## 6.6 文件解析模块（`src/utils/fileParser.js` + `FileUpload.vue`）

支持类型：
- `.txt/.md/.csv`：原生 FileReader
- `.pdf`：`pdfjs-dist`
- `.docx`：`mammoth`

策略：
- 解析后统一返回文本
- 超长内容截断（默认 4000 字符），避免上下文过大

---

## 6.7 消息渲染与性能（`ChatWindow.vue` / `MessageItem.vue`）

能力：
- `DynamicScroller` 虚拟列表渲染
- 流式气泡实时显示
- Markdown 渲染
- 代码高亮
- AI 消息一键复制

---

## 7. 环境配置与运行

## 7.1 `.env.local` 示例

```env
VITE_API_KEY=sk-你的真实DashScopeKey
VITE_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_MODEL=qwen-plus
```

## 7.2 启动

```bash
npm install
npm run dev
```

## 7.3 构建

```bash
npm run build
```

---

## 8. 常见问题（你后续最常遇到）

### 1) `HTTP 404 Not Found`
原因：代理 target 或路径不对。  
检查：`vite.config.js` 是否代理到 `/compatible-mode/v1`。

### 2) `HTTP 401 Unauthorized`
原因：API Key 无效、未填、或服务未重启。  
检查：
- `.env.local` 中 `VITE_API_KEY` 是否真实有效
- 改 `.env` 后是否重启 `npm run dev`

### 3) 语音按钮可点但没结果
原因：浏览器不支持或麦克风权限被禁用。  
建议：Chrome/Edge + 允许麦克风权限。

### 4) 大文件上传后模型回答慢
原因：上下文过长。  
建议：保持截断策略，优先让用户上传关键页/关键段。

---

## 9. 二次开发建议（按优先级）

P1（建议先做）：
- 增加“模型切换”下拉（`qwen-turbo / qwen-plus / qwen-max`）
- 增加会话搜索
- 增加“导出会话 Markdown”

P2：
- 接入 TTS（AI 回复语音朗读）
- 接入 OCR（扫描版 PDF）
- 接入多模型对比回答

---

## 10. 快速复盘清单（10分钟回忆整个项目）

1. 看 `App.vue`：布局与初始化逻辑
2. 看 `InputArea.vue`：发送主链路入口
3. 看 `llmApi.js`：流式通信细节
4. 看 `chatStore.js`：流式文本如何落盘成消息
5. 看 `sessionStore.js`：历史会话如何持久化
6. 看 `speechModule.js` / `fileParser.js`：两大增强模块
7. 看 `ChatWindow.vue`：渲染与性能策略
8. 看 `global.css`：视觉主题体系

---

## 11. 当前项目结论

项目已具备完整生产原型能力：
- 前端架构完整
- 多模态输入完整
- 流式对话完整
- 历史管理完整
- 性能优化已覆盖

后续只需围绕业务需求继续迭代即可。

---

## 12. 一句话学习起点（给未来的你）

> **先看 `InputArea.vue` + `llmApi.js`，你就能快速掌握整个项目 70% 的核心逻辑。**

---

## 13. Day1~Day7 详细任务清单（打勾版）

> 使用方式：每天结束时把对应项从 `- [ ]` 改成 `- [x]`。

### Day 1：跑通项目 + 建立全局认知

- [ ] 配置 `.env.local`（真实 DashScope Key）
- [ ] 执行 `npm run dev`，确认页面正常打开
- [ ] 发起至少 1 次对话，确认模型有回复
- [ ] 阅读 `LLM-Platform-Guide.md` 第 1~4 章
- [ ] 阅读 `src/main.js`，理解插件注册（Pinia / ElementPlus / VirtualScroller）
- [ ] 阅读 `src/App.vue`，理解页面总布局
- [ ] 记录：项目核心模块有哪些（至少 5 个）

**Day 1 验收标准**
- [ ] 我能说出：消息从哪个组件发起、在哪个模块请求模型、在哪个组件展示

---

### Day 2：发送主链路（最核心）

- [ ] 精读 `src/components/InputArea.vue`
- [ ] 精读 `src/api/llmApi.js`
- [ ] 精读 `src/stores/chatStore.js`
- [ ] 在 `handleSend()` 中打印发送前文本（调试后可删除）
- [ ] 在 `onChunk` 中观察流式片段追加
- [ ] 验证 `startAssistantMessage -> appendStreamChunk -> finalizeAssistantMessage` 流程
- [ ] 记录：每个函数分别负责什么

**Day 2 验收标准**
- [ ] 我能手画时序：点击发送到 AI 回复完成的全过程

---

### Day 3：会话管理 + 本地持久化

- [ ] 精读 `src/stores/sessionStore.js`
- [ ] 精读 `src/components/Sidebar.vue`
- [ ] 创建 3 个会话并切换
- [ ] 删除 1 个会话并确认界面状态正确
- [ ] 刷新浏览器，确认会话可恢复
- [ ] 打开浏览器 Application/Storage，查看 localStorage 数据结构
- [ ] 记录：`createSession / saveMessages / switchSession / deleteSession` 的作用

**Day 3 验收标准**
- [ ] 我能解释：为什么刷新后还能看到历史对话

---

### Day 4：消息渲染 + 性能优化

- [ ] 精读 `src/components/ChatWindow.vue`
- [ ] 精读 `src/components/MessageItem.vue`
- [ ] 连续发送 30~50 条消息，观察性能
- [ ] 验证 Markdown 渲染（标题、列表、代码块）
- [ ] 验证代码高亮（至少 2 种语言）
- [ ] 理解 `DynamicScroller` 的意义（为什么不用普通 v-for）
- [ ] 记录：虚拟列表与普通列表差异

**Day 4 验收标准**
- [ ] 我能解释：为什么该场景必须做虚拟滚动

---

### Day 5：语音输入模块

- [ ] 精读 `src/utils/speechModule.js`
- [ ] 精读 `src/components/VoiceButton.vue`
- [ ] 完成一次语音输入并自动回填输入框
- [ ] 验证错误场景（禁用麦克风权限）
- [ ] 观察 interim/final 两类识别文本变化
- [ ] 记录：`isSupported / startListening / stopListening / onresult` 的职责

**Day 5 验收标准**
- [ ] 我能独立讲清 Web Speech API 的接入步骤

---

### Day 6：文件上传与解析

- [ ] 精读 `src/components/FileUpload.vue`
- [ ] 精读 `src/utils/fileParser.js`
- [ ] 分别测试：TXT、PDF、DOCX 上传
- [ ] 验证超长文件截断提示是否生效
- [ ] 验证附件内容是否拼接到最终发送内容
- [ ] 记录：各文件类型的解析方式

**Day 6 验收标准**
- [ ] 我能解释：文件是如何变成模型上下文的

---

### Day 7：综合实战（闭环）

- [ ] 从下列任务中选择 1 个完成：
  - [ ] 模型切换（`qwen-turbo / qwen-plus / qwen-max`）
  - [ ] 导出当前会话 Markdown
  - [ ] 会话搜索功能
- [ ] 完成功能后自测：新增、切换、刷新、删除不受影响
- [ ] 执行一次构建：`npm run build`
- [ ] 记录改动点：改了哪些文件、为什么这样改
- [ ] 形成一份“我的项目讲解稿”（5 分钟）

**Day 7 验收标准**
- [ ] 我可以独立演示并讲解该项目核心逻辑

---

## 14. 每天学习记录模板（可复制）

```md
### Day X 学习记录

- 今日目标：
- 完成项：
  - [x] 
  - [x] 
- 遇到问题：
- 解决方式：
- 今日收获（3 条）：
  1. 
  2. 
  3. 
- 明日计划：
```

---

## 15. 最终建议

- 不要跳着看，严格按 Day1→Day7 顺序。
- 每天至少做 1 个“可验证动作”（不是只看代码）。
- 学完后你将具备：
  - 独立开发 LLM 聊天前端
  - 集成语音输入与文件解析
  - 处理流式输出与会话持久化

