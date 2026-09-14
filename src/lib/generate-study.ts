import type { Flashcard, Question, Slide } from "@/lib/types"

const STOP = new Set(
  `a an the and or but if then of to in on for from with without about into through during including until against among after before above below between under again further once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just don should now this that these those it its it's is are was were be been being as at by we you they he she them our your their`.split(
    " "
  )
)

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40 && part.length < 280)
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%\-\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function keyTerms(text: string) {
  const fromCaps = [...text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g)]
    .map((match) => match[1])
    .filter((term) => !STOP.has(term.toLowerCase()) && term.length > 3)

  const fromLength = tokens(text).filter(
    (word) => word.length >= 8 || /[0-9]/.test(word)
  )

  return unique([...fromCaps, ...fromLength]).slice(0, 12)
}

function pickTerm(sentence: string) {
  const terms = keyTerms(sentence).sort((a, b) => b.length - a.length)
  return terms[0]
}

export function buildQuestions(slides: Slide[], count = 10): Question[] {
  const questions: Question[] = []
  const pool = slides.flatMap((slide) =>
    sentences(slide.text).map((sentence) => ({ sentence, slide }))
  )

  for (const item of shuffle(pool)) {
    if (questions.length >= count) break
    const term = pickTerm(item.sentence)
    if (!term) continue

    const kindRoll = questions.length % 3
    if (kindRoll === 0) {
      const blank = item.sentence.replace(new RegExp(term, "i"), "_____")
      if (blank === item.sentence) continue
      const distractors = unique(
        slides
          .flatMap((slide) => keyTerms(slide.text))
          .filter((candidate) => candidate.toLowerCase() !== term.toLowerCase())
      ).slice(0, 8)
      if (distractors.length < 2) continue
      const options = shuffle([term, ...shuffle(distractors).slice(0, 3)]).slice(
        0,
        4
      )
      if (!options.includes(term)) options[0] = term
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "mcq",
        prompt: `From slide ${item.slide.index}: ${blank}`,
        options: shuffle(options),
        answer: term,
        explanation: item.sentence,
        slideIndex: item.slide.index,
      })
    } else if (kindRoll === 1) {
      const blank = item.sentence.replace(new RegExp(term, "i"), "_____")
      if (blank === item.sentence) continue
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "cloze",
        prompt: blank,
        answer: term,
        explanation: item.sentence,
        slideIndex: item.slide.index,
      })
    } else {
      const makeFalse = questions.length % 2 === 0
      const falseTerm = keyTerms(slides.map((s) => s.text).join(" ")).find(
        (candidate) => candidate.toLowerCase() !== term.toLowerCase()
      )
      const prompt = makeFalse && falseTerm
        ? item.sentence.replace(new RegExp(term, "i"), falseTerm)
        : item.sentence
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "truefalse",
        prompt: `True or false: ${prompt}`,
        options: ["True", "False"],
        answer: makeFalse && falseTerm ? "False" : "True",
        explanation: item.sentence,
        slideIndex: item.slide.index,
      })
    }
  }

  return questions
}

export function buildFlashcards(slides: Slide[], count = 14): Flashcard[] {
  const cards: Flashcard[] = []
  for (const slide of slides) {
    for (const sentence of sentences(slide.text)) {
      const term = pickTerm(sentence)
      if (!term) continue
      if (cards.some((card) => card.front.toLowerCase() === term.toLowerCase())) {
        continue
      }
      cards.push({
        id: `c-${cards.length + 1}`,
        front: term,
        back: sentence,
        slideIndex: slide.index,
      })
      if (cards.length >= count) return cards
    }
  }
  return cards
}

export function retrieveSlides(slides: Slide[], query: string, limit = 3) {
  const words = tokens(query)
  if (!words.length) return slides.slice(0, limit)

  return [...slides]
    .map((slide) => {
      const hay = `${slide.title} ${slide.text}`.toLowerCase()
      const score = words.reduce(
        (sum, word) => sum + (hay.includes(word) ? word.length : 0),
        0
      )
      return { slide, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.slide)
}

export function answerFromSlides(slides: Slide[], query: string) {
  const hits = retrieveSlides(slides, query, 3)
  if (!hits.length) {
    return {
      answer:
        "I could not find that in these slides. Try asking about a term that actually appears in the lecture, or jump to a specific slide.",
      sources: [] as Slide[],
    }
  }

  const quoted = hits
    .map((slide) => `Slide ${slide.index} (${slide.title}): ${slide.text}`)
    .join("\n\n")

  return {
    answer: `From your imported slides:\n\n${quoted}`,
    sources: hits,
  }
}
