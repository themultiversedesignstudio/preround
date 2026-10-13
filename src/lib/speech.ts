export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

const MALE_NAME =
  /male|daniel|david|alex|fred|rishi|arthur|aaron|gordon|ralph|george|thomas|bruce|james/i
const FEMALE_NAME =
  /female|samantha|victoria|karen|moira|fiona|tessa|veena|susan|zira|hazel|salli|joanna|kendra|ivy|emma|amy|serena|allison/i

function chooseMaleVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find(
    (voice) => MALE_NAME.test(`${voice.name} ${voice.voiceURI}`) && !FEMALE_NAME.test(voice.name)
  )
}

function whenMaleVoice(): Promise<SpeechSynthesisVoice | undefined> {
  if (!canSpeak()) return Promise.resolve(undefined)
  const ready = () => chooseMaleVoice(window.speechSynthesis.getVoices())
  if (window.speechSynthesis.getVoices().length) return Promise.resolve(ready())
  return new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", finish)
      resolve(ready())
    }
    window.speechSynthesis.addEventListener("voiceschanged", finish)
    window.setTimeout(finish, 500)
  })
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
    let started = false
    window.setTimeout(() => {
      void whenMaleVoice().then((voice) => {
        if (stopped || started || !canSpeak()) return
        started = true
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = rate
        utterance.pitch = voice ? 1 : 0.75
        if (voice) utterance.voice = voice
        utterance.onerror = () => {}
        window.speechSynthesis.speak(utterance)
      })
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
