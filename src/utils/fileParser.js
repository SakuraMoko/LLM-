/**
 * 文件解析工具
 * 支持：.txt / .pdf / .docx
 * 自动截断超过 MAX_CHARS 的内容
 */

const MAX_CHARS = 4000

/**
 * 解析文件内容
 * @param {File} file
 * @returns {Promise<{content: string, name: string, type: string}>}
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  let content = ''

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    content = await readAsText(file)
  } else if (ext === 'pdf') {
    content = await parsePdf(file)
  } else if (ext === 'docx') {
    content = await parseDocx(file)
  } else {
    throw new Error(`不支持的文件格式 .${ext}，请上传 TXT / PDF / DOCX 文件`)
  }

  const truncated = content.length > MAX_CHARS
  if (truncated) {
    content = content.slice(0, MAX_CHARS) + `\n\n[内容已截断，仅展示前 ${MAX_CHARS} 字符]`
  }

  return { content, name: file.name, type: ext, truncated, size: file.size }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

async function parsePdf(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n'
    }
    return text.trim()
  } catch (e) {
    throw new Error(`PDF 解析失败: ${e.message}`)
  }
}

async function parseDocx(file) {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (e) {
    throw new Error(`DOCX 解析失败: ${e.message}`)
  }
}
