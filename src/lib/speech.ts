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
    window.setTimeout(() => {
      if (stopped || !canSpeak()) return
      window.speechSynthesis.speak(utterance)
    }, 60)
  }

  return () => {
    stopped = true
    if (timer !== undefined) window.clearTimeout(timer)
    stopSpeaking()
  }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
