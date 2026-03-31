/**
 * LLM API 封装模块
 * 支持：流式响应 / 多轮上下文 / 指数退避重试 / AbortController 取消
 */

const MAX_RETRY = 3
const TIMEOUT_MS = 60000

/**
 * 发送流式对话请求（OpenAI 兼容接口）
 * @param {Array}    messages     - 完整历史消息数组 [{role, content}]
 * @param {Function} onChunk      - 每收到一个 token 片段时的回调 (chunk: string)
 * @param {Function} onDone      - 流结束回调
 * @param {Function} onError     - 错误回调 (err: Error)
 * @param {AbortSignal} signal   - AbortController 信号，用于取消请求
 */
export async function streamChat(messages, onChunk, onDone, onError, signal) {
  let attempt = 0

  // Token 预算：保留最近消息，避免超出上下文窗口
  const trimmedMessages = truncateMessages(messages)

  while (attempt < MAX_RETRY) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      // 优先使用外部传入的 signal
      const fetchSignal = signal || controller.signal

      // /api → 代理到 https://dashscope.aliyuncs.com/compatible-mode/v1
      // 最终完整路径: .../compatible-mode/v1/chat/completions
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_MODEL || 'qwen-plus',
          messages: trimmedMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: fetchSignal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 读取 ReadableStream (SSE 格式)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const jsonStr = trimmed.replace(/^data:\s*/, '')
          if (jsonStr === '[DONE]') {
            onDone()
            return
          }

          try {
            const parsed = JSON.parse(jsonStr)
            const token = parsed.choices?.[0]?.delta?.content
            if (token) onChunk(token)
          } catch {
            // 忽略非 JSON 行
          }
        }
      }

      onDone()
      return

    } catch (err) {
      if (err.name === 'AbortError') {
        onDone() // 用户主动取消，视为正常结束
        return
      }
      attempt++
      if (attempt >= MAX_RETRY) {
        onError(err)
        return
      }
      // 指数退避：1s → 2s → 4s
      await sleep(1000 * Math.pow(2, attempt - 1))
    }
  }
}

/**
 * Token 预算管理：从最新消息向前截取，保留 system prompt
 */
function truncateMessages(messages, maxChars = 8000) {
  const system = messages.filter(m => m.role === 'system')
  const rest   = messages.filter(m => m.role !== 'system')

  let total = system.reduce((acc, m) => acc + m.content.length, 0)
  const kept = []

  for (let i = rest.length - 1; i >= 0; i--) {
    const len = rest[i].content.length
    if (total + len > maxChars) break
    kept.unshift(rest[i])
    total += len
  }

  return [...system, ...kept]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
