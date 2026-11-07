/** Web Speech API 朗读封装：选 en-US 声音，可调速 */

let cachedVoice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  cachedVoice =
    voices.find((v) => /en[-_]US/i.test(v.lang) && /google|natural|samantha/i.test(v.name)) ??
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  return cachedVoice
}

// 声音列表异步填充
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null
    pickVoice()
  }
}

export function speak(text: string, opts: { rate?: number; slow?: boolean } = {}) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utter.voice = voice
  utter.lang = 'en-US'
  utter.rate = opts.slow ? 0.6 : (opts.rate ?? 0.95)
  window.speechSynthesis.speak(utter)
}

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
