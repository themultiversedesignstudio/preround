"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LectureAssistant } from "@/components/lecture-assistant"
import { buildFlashcards, buildQuestions } from "@/lib/generate-study"
import { canSpeak, startReading, stopSpeaking } from "@/lib/speech"
import { deleteDoc, upsertDoc, useDocs } from "@/lib/storage"
import type { StudyDoc } from "@/lib/types"
import { cn } from "cn"

export function StudyWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const docs = useDocs()
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const doc = docs.find((item) => item.id === id)
  const [slideIndex, setSlideIndex] = useState(0)
  const [tab, setTab] = useState("listen")

  useEffect(() => () => stopSpeaking(), [])

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Opening lecture…
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 p-8">
        <h1 className="font-heading text-2xl">Lecture not in this browser</h1>
        <p className="text-muted-foreground">
          PreRound stores decks locally. Import the file again on this device.
        </p>
        <Link href="/" className={cn(buttonVariants())}>
          Back to library
        </Link>
      </div>
    )
  }

  const lecture = doc
  const slide = lecture.slides[slideIndex] ?? lecture.slides[0]

  function removeSlide(index: number) {
    stopSpeaking()
    const nextSlides = lecture.slides
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item, itemIndex) => ({ ...item, index: itemIndex + 1 }))
    if (!nextSlides.length) {
      deleteDoc(lecture.id)
      router.push("/")
      return
    }
    upsertDoc({ ...lecture, slides: nextSlides })
    setSlideIndex((current) => Math.min(current === index ? index : current > index ? current - 1 : current, nextSlides.length - 1))
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-0 hover:bg-transparent"
            onClick={() => {
              stopSpeaking()
              router.push("/")
            }}
          >
            <ChevronLeft /> Library
          </Button>
          <h1 className="font-heading text-3xl tracking-tight">{doc.name}</h1>
          <p className="text-sm text-muted-foreground">
            🐣 Çalış Kız · {doc.slides.length} slides · only on this device
          </p>
        </div>
        <Badge variant="secondary">{doc.kind.toUpperCase()}</Badge>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="listen">Listen</TabsTrigger>
            <TabsTrigger value="slides">Slides</TabsTrigger>
            <TabsTrigger value="quiz">Questions</TabsTrigger>
            <TabsTrigger value="cards">Flashcards</TabsTrigger>
          </TabsList>

          <TabsContent value="listen">
            <ListenPanel
              doc={doc}
              slideIndex={slideIndex}
            />
          </TabsContent>
          <TabsContent value="slides">
            <SlidesPanel
              doc={doc}
              slideIndex={slideIndex}
              onSlideIndex={setSlideIndex}
              slide={slide}
              onDeleteSlide={() => removeSlide(slideIndex)}
          />
          </TabsContent>
          <TabsContent value="quiz">
            <QuizPanel doc={doc} />
          </TabsContent>
          <TabsContent value="cards">
            <FlashPanel doc={doc} />
          </TabsContent>
        </Tabs>
        <LectureAssistant
          doc={doc}
          onOpenSlide={(source) => {
            const next = doc.slides.findIndex((item) => item.index === source.index)
            if (next >= 0) setSlideIndex(next)
            setTab("slides")
          }}
        />
      </div>
    </div>
  )
}

function ListenPanel({
  doc,
  slideIndex,
}: {
  doc: StudyDoc
  slideIndex: number
}) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<"slide" | "all">("slide")
  const [rate, setRate] = useState(1)
  const [cursor, setCursor] = useState("")
  const stopRef = useRef<(() => void) | null>(null)
  const slide = doc.slides[slideIndex]

  function halt() {
    stopRef.current?.()
    stopRef.current = null
    stopSpeaking()
    setPlaying(false)
    setCursor("")
  }

  function playScript(text: string, nextMode: "slide" | "all") {
    halt()
    setMode(nextMode)
    setPlaying(true)
    stopRef.current = startReading(text, {
      rate,
      onBoundary: (chunk) => setCursor(chunk),
      onEnd: () => {
        stopRef.current = null
        setPlaying(false)
        setCursor("")
      },
    })
  }

  function playCurrent() {
    playScript(slide.text, "slide")
  }

  function playAllFromHere() {
    const script = doc.slides
      .slice(slideIndex)
      .map((item) => `Slide ${item.index}. ${item.title}. ${item.text}`)
      .join(" ")
    playScript(script, "all")
  }

  useEffect(() => () => stopRef.current?.(), [])

  return (
    <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Slide {slide.index} of {doc.slides.length}
            </p>
            <CardTitle className="mt-1">{slide.title}</CardTitle>
          </div>
          <Volume2 className="size-5 text-primary" />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-7">
            {slide.text.split(/(?<=[.!?])\s+/).map((sentence) => (
              <span
                key={sentence}
                className={
                  cursor && sentence.startsWith(cursor.slice(0, 18))
                    ? "rounded bg-primary/15"
                    : undefined
                }
              >
                {sentence}{" "}
              </span>
            ))}
          </p>
          <Separator />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {playing ? (
                <button type="button" className={cn(buttonVariants())} onClick={halt}>
                  <Pause className="size-4" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(buttonVariants())}
                  onClick={playCurrent}
                >
                  <Play className="size-4" />
                  Read this slide
                </button>
              )}
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
                onClick={playAllFromHere}
              >
                Read from here
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Speed {rate.toFixed(1)}×</span>
              <Slider
                className="w-32"
                min={0.7}
                max={1.4}
                step={0.1}
                value={[rate]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  setRate(Number(next))
                }}
              />
            </div>
          </div>
          {playing ? (
            <p className="text-sm text-muted-foreground">
              {canSpeak()
                ? "Reading this slide. Highlight follows each sentence."
                : "Highlighting this slide. Chrome or Safari will also read it aloud."}
            </p>
          ) : null}
          {mode === "all" && playing ? (
            <p className="text-xs text-muted-foreground">
              Reading the rest of the deck from slide {slide.index}.
            </p>
          ) : null}
        </CardContent>
    </Card>
  )
}

function SlidesPanel({
  doc,
  slideIndex,
  onSlideIndex,
  slide,
  onDeleteSlide,
}: {
  doc: StudyDoc
  slideIndex: number
  onSlideIndex: (index: number) => void
  slide: StudyDoc["slides"][number]
  onDeleteSlide: () => void
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>
          Slide {slide.index}: {slide.title}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Delete slide ${slide.index}`}
            onClick={onDeleteSlide}
          >
            <Trash2 />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={slideIndex === 0}
            onClick={() => onSlideIndex(Math.max(0, slideIndex - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={slideIndex >= doc.slides.length - 1}
            onClick={() =>
              onSlideIndex(Math.min(doc.slides.length - 1, slideIndex + 1))
            }
          >
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-7 whitespace-pre-wrap">{slide.text}</p>
      </CardContent>
    </Card>
  )
}

function QuizPanel({ doc }: { doc: StudyDoc }) {
  const questions = useMemo(() => buildQuestions(doc.slides, 10), [doc])
  const [cursor, setCursor] = useState(0)
  const [picked, setPicked] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const question = questions[cursor]

  function submit() {
    if (!question || revealed) return
    const correct =
      question.kind === "cloze"
        ? picked.trim().toLowerCase() === question.answer.toLowerCase()
        : picked === question.answer
    if (correct) setScore((value) => value + 1)
    setRevealed(true)
  }

  function next() {
    if (cursor + 1 >= questions.length) {
      setDone(true)
      return
    }
    setCursor((value) => value + 1)
    setPicked("")
    setRevealed(false)
  }

  function restart() {
    setCursor(0)
    setPicked("")
    setRevealed(false)
    setScore(0)
    setDone(false)
  }

  if (!questions.length) {
    return (
      <Card>
        <CardContent className="py-8 text-muted-foreground">
          Not enough lecture text to build a quiz. Import a longer deck or paste
          notes.
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">
            {score} / {questions.length} correct
          </p>
          <Progress value={(score / questions.length) * 100} />
          <Button onClick={restart}>
            <RotateCcw data-icon="inline-start" />
            Run it again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            Question {cursor + 1} of {questions.length}
          </CardTitle>
          <Badge variant="outline">{question.kind}</Badge>
        </div>
        <Progress value={((cursor + (revealed ? 1 : 0)) / questions.length) * 100} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base leading-7">{question.prompt}</p>
        {question.options ? (
          <div className="grid gap-2">
            {question.options.map((option) => {
              const chosen = picked === option
              const isAnswer = revealed && option === question.answer
              const isWrong = revealed && chosen && option !== question.answer
              return (
                <Button
                  key={option}
                  variant={isAnswer ? "default" : isWrong ? "destructive" : chosen ? "secondary" : "outline"}
                  className="h-auto justify-start whitespace-normal py-2 text-left"
                  onClick={() => !revealed && setPicked(option)}
                >
                  {option}
                </Button>
              )
            })}
          </div>
        ) : (
          <input
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            disabled={revealed}
            placeholder="Type the missing term"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
        {revealed ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm leading-6">
            <span className="font-medium">From slide {question.slideIndex}. </span>
            {question.explanation}
          </p>
        ) : null}
        <div className="flex gap-2">
          {!revealed ? (
            <Button onClick={submit} disabled={!picked.trim()}>
              Check
            </Button>
          ) : (
            <Button onClick={next}>
              {cursor + 1 >= questions.length ? "See score" : "Next"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FlashPanel({ doc }: { doc: StudyDoc }) {
  const cards = useMemo(() => buildFlashcards(doc.slides), [doc])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = cards[index]

  if (!card) {
    return (
      <Card>
        <CardContent className="py-8 text-muted-foreground">
          No flashcards yet. Import a longer lecture.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="min-h-56 w-full rounded-2xl border bg-card px-6 py-10 text-center shadow-sm ring-1 ring-foreground/10"
      >
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {flipped ? "Answer · slide " + card.slideIndex : "Term"}
        </p>
        <p className="mt-4 font-heading text-2xl leading-snug sm:text-3xl">
          {flipped ? card.back : card.front}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">Tap to flip</p>
      </button>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => {
            setIndex((value) => value - 1)
            setFlipped(false)
          }}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          {index + 1} / {cards.length}
        </p>
        <Button
          variant="outline"
          disabled={index >= cards.length - 1}
          onClick={() => {
            setIndex((value) => value + 1)
            setFlipped(false)
          }}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

