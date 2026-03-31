/**
 * Web Speech API 封装
 * 支持：中文识别 / 实时转写 / 持续模式 / 错误处理
 */
import { ref } from 'vue'

export function useSpeech() {
  const isListening  = ref(false)
  const transcript   = ref('')
  const interimText  = ref('')   // 中间结果（未确定）
  const errorMsg     = ref('')
  const isSupported  = ref(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )

  let recognition = null

  function initRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()

    recognition.lang           = 'zh-CN'
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListening.value = true
      errorMsg.value    = ''
    }

    recognition.onresult = (event) => {
      let finalText   = ''
      let interim     = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalText) {
        transcript.value += finalText
        interimText.value = ''
      } else {
        interimText.value = interim
      }
    }

    recognition.onerror = (event) => {
      const errorMap = {
        'no-speech':        '未检测到语音，请重试',
        'audio-capture':    '无法获取麦克风，请检查权限',
        'not-allowed':      '麦克风权限被拒绝',
        'network':          '网络错误，语音识别失败',
        'aborted':          '识别已中止'
      }
      errorMsg.value    = errorMap[event.error] || `识别错误: ${event.error}`
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
      interimText.value = ''
    }
  }

  function startListening() {
    if (!isSupported.value) {
      errorMsg.value = '当前浏览器不支持语音识别，请使用 Chrome 或 Edge'
      return
    }
    if (!recognition) initRecognition()
    transcript.value  = ''
    interimText.value = ''
    errorMsg.value    = ''
    try {
      recognition.start()
    } catch (e) {
      // 防止重复 start
      recognition.stop()
      setTimeout(() => recognition.start(), 200)
    }
  }

  function stopListening() {
    recognition?.stop()
    isListening.value = false
  }

  function resetTranscript() {
    transcript.value  = ''
    interimText.value = ''
  }

  return {
    isListening,
    transcript,
    interimText,
    errorMsg,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  }
}
