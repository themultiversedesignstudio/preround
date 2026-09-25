export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

export function splitUtterances(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function chunkDuration(chunk: string, rate: number) {
  const words = Math.max(1, chunk.split(/\s+/).length)
  return Math.max(700, (words / (2.4 * rate)) * 1000)
}

export function startReading(
  text: string,
  options: {
    rate?: number
    onBoundary?: (chunk: string, index: number) => void
    onEnd?: () => void
  } = {}
) {
  const chunks = splitUtterances(text)
  const rate = options.rate ?? 1
  let index = 0
  let timer: number | undefined
  let stopped = false

  const finish = () => {
    if (stopped) return
    stopped = true
    if (timer !== undefined) window.clearTimeout(timer)
    stopSpeaking()
    options.onEnd?.()
  }

  const tick = () => {
    if (stopped) return
    if (index >= chunks.length) {
      finish()
      return
    }
    const chunk = chunks[index]
    options.onBoundary?.(chunk, index)
    timer = window.setTimeout(() => {
      index += 1
      tick()
    }, chunkDuration(chunk, rate))
  }

  if (!chunks.length) {
    options.onEnd?.()
    return () => {}
  }

  tick()

  if (canSpeak()) {
    // Chrome drops speak() if it runs in the same turn as cancel().
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.onerror = () => {}
    let started = false
    const speak = () => {
      if (started || stopped || !canSpeak()) return
      const voice = maleVoice()
      if (!voice && window.speechSynthesis.getVoices().length === 0) return
      started = true
      if (voice) utterance.voice = voice
      window.speechSynthesis.speak(utterance)
    }
    window.speechSynthesis.addEventListener("voiceschanged", speak, { once: true })
    window.setTimeout(speak, 60)
  }

  return () => {
    stopped = true
    if (timer !== undefined) window.clearTimeout(timer)
    stopSpeaking()
  }
}

function maleVoice() {
  const voices = window.speechSynthesis.getVoices()
  const female = /female|samantha|victoria|zira|karen|moira|fiona|susan|linda|kate|serena/i
  const male = /male|daniel|david|alex|fred|rishi|arthur|aaron|gordon|ralph/i
  return (
    voices.find((voice) => male.test(voice.name) && !female.test(voice.name)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en") && !female.test(voice.name))
  )
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
