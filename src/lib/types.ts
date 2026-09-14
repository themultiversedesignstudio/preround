export type FileKind = "pdf" | "pptx" | "text"

export type Slide = {
  index: number
  title: string
  text: string
}

export type StudyDoc = {
  id: string
  name: string
  kind: FileKind
  createdAt: string
  slides: Slide[]
}

export type QuestionKind = "mcq" | "cloze" | "truefalse"

export type Question = {
  id: string
  kind: QuestionKind
  prompt: string
  options?: string[]
  answer: string
  explanation: string
  slideIndex: number
}

export type Flashcard = {
  id: string
  front: string
  back: string
  slideIndex: number
}
