"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  House,
  Layers,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Trash2,
  Volume2,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { LectureAssistant } from "@/components/lecture-assistant"
import { buildFlashcards, buildQuestions } from "@/lib/generate-study"
import { canSpeak, startReading, stopSpeaking } from "@/lib/speech"
import { deleteDoc, upsertDoc, useDocs } from "@/lib/storage"
import type { StudyDoc } from "@/lib/types"
import { cn } from "cn"

const SECTIONS = [
  { id: "listen", label: "Listen", icon: Volume2 },
  { id: "slides", label: "Slides", icon: Presentation },
  { id: "quiz", label: "Questions", icon: CircleQuestionMark },
  { id: "cards", label: "Flashcards", icon: Layers },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

export function StudyWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const docs = useDocs()
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const doc = docs.find((item) => item.id === id) ?? null
  const [slideIndex, setSlideIndex] = useState(0)
  const [tab, setTab] = useState<SectionId>("listen")

  useEffect(() => () => stopSpeaking(), [])

  if (!hydrated) {
    return (
      <AppShell title="Library" nav={[{ label: "Library", icon: House, href: "/", active: true }]}>
        <p className="text-sm font-semibold text-muted-foreground">Opening lecture…</p>
      </AppShell>
    )
  }

  if (!doc) {
    return (
      <AppShell title="Library" nav={[{ label: "Library", icon: House, href: "/", active: true }]}>
        <div className="max-w-lg space-y-3 rounded-[24px] bg-[#fbfaff] p-6 ring-1 ring-black/5">
          <h2 className="text-2xl font-extrabold tracking-tight">This lecture is not on this device</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Çalış Kız keeps each lecture in the browser that imported it. Import the file again here.
          </p>
          <Link href="/" className={cn(buttonVariants(), "rounded-full")}>
            Back to library
          </Link>
        </div>
      </AppShell>
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
    setSlideIndex((current) =>
      Math.min(
        current === index ? index : current > index ? current - 1 : current,
        nextSlides.length - 1
      )
    )
  }

  function openSection(next: SectionId) {
    if (next !== "listen") stopSpeaking()
    setTab(next)
  }

  return (
    <AppShell
      title={lecture.name}
      dockRight
      nav={[
        {
          label: "Library",
          icon: House,
          href: "/",
          onClick: () => stopSpeaking(),
        },
        ...SECTIONS.map((section) => ({
          label: section.label,
          icon: section.icon,
          active: tab === section.id,
          onClick: () => openSection(section.id),
        })),
      ]}
      footer={
        <div className="rounded-[24px] bg-[#f3eefe] p-4">
          <p className="text-sm font-extrabold text-[#241c36]">On this device</p>
          <p className="mt-1 text-xs leading-5 text-[#6d6780]">
            {lecture.slides.length} slides stay in this browser. Delete the lecture whenever you want.
          </p>
          <button
            type="button"
            className="mt-3 h-10 w-full rounded-xl bg-white text-sm font-bold text-[#241c36] ring-1 ring-black/5"
            onClick={() => {
              stopSpeaking()
              deleteDoc(lecture.id)
              router.push("/")
            }}
          >
            Delete lecture
          </button>
        </div>
      }
      right={
        <LectureAssistant
          doc={lecture}
          onOpenSlide={(source) => {
            const next = lecture.slides.findIndex((item) => item.index === source.index)
            if (next >= 0) setSlideIndex(next)
            openSection("slides")
          }}
        />
      }
    >
      <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => openSection(section.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-bold",
              tab === section.id ? "bg-[#efe8ff] text-[#2a2340]" : "bg-[#f4f1fb] text-[#6d6780]"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      {tab === "listen" ? (
        <ListenPanel doc={lecture} slideIndex={slideIndex} onSlideIndex={setSlideIndex} />
      ) : null}
      {tab === "slides" && slide ? (
        <SlidesPanel
          doc={lecture}
          slideIndex={slideIndex}
          onSlideIndex={setSlideIndex}
          slide={slide}
          onDeleteSlide={() => removeSlide(slideIndex)}
        />
      ) : null}
      {tab === "quiz" ? <QuizPanel doc={lecture} /> : null}
      {tab === "cards" ? <FlashPanel doc={lecture} /> : null}
    </AppShell>
  )
}

function ListenPanel({
  doc,
  slideIndex,
  onSlideIndex,
}: {
  doc: StudyDoc
  slideIndex: number
  onSlideIndex: (index: number) => void
}) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<"slide" | "all">("slide")
  const [rate, setRate] = useState(1)
  const [cursor, setCursor] = useState("")
  const stopRef = useRef<(() => void) | null>(null)
  const slide = doc.slides[slideIndex] ?? doc.slides[0]

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
    if (!slide) return
    playScript(slide.text, "slide")
  }

  function playAllFromHere() {
    if (!slide) return
    const script = doc.slides
      .slice(slideIndex)
      .map((item) => `Slide ${item.index}. ${item.title}. ${item.text}`)
      .join(" ")
    playScript(script, "all")
  }

  useEffect(() => () => stopRef.current?.(), [])

  if (!slide) {
    return (
      <Card>
        <CardContent className="py-8 text-muted-foreground">This lecture has no slides.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[28px] ring-black/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-[#8d87a0] uppercase">
              Slide {slide.index} of {doc.slides.length}
            </p>
            <CardTitle className="mt-1 text-xl">{slide.title}</CardTitle>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#efe8ff] text-primary">
            <Volume2 className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={(slide.index / doc.slides.length) * 100} />
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Previous slide"
              disabled={slideIndex === 0}
              onClick={() => {
                halt()
                onSlideIndex(Math.max(0, slideIndex - 1))
              }}
            >
              <ChevronLeft />
            </Button>
            {playing ? (
              <button type="button" className={cn(buttonVariants(), "rounded-full")} onClick={halt}>
                <Pause className="size-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                className={cn(buttonVariants(), "rounded-full")}
                onClick={playCurrent}
              >
                <Play className="size-4" />
                Read this slide
              </button>
            )}
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
              onClick={playAllFromHere}
            >
              Read from here
            </button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Next slide"
              disabled={slideIndex >= doc.slides.length - 1}
              onClick={() => {
                halt()
                onSlideIndex(Math.min(doc.slides.length - 1, slideIndex + 1))
              }}
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-[#6d6780]">
              <span className="shrink-0">Jump</span>
              <select
                value={slideIndex}
                className="h-9 min-w-0 flex-1 rounded-full border border-input bg-[#f6f4fa] px-3 text-sm font-semibold text-foreground outline-none"
                onChange={(event) => {
                  halt()
                  onSlideIndex(Number(event.target.value))
                }}
              >
                {doc.slides.map((item, index) => (
                  <option key={item.index} value={index}>
                    {item.index}. {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3 text-sm font-semibold text-[#6d6780]">
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
    <Card className="rounded-[28px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
        <CardTitle>
          Slide {slide.index}: {slide.title}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label={`Delete slide ${slide.index}`}
            onClick={onDeleteSlide}
          >
            <Trash2 />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Previous slide"
            disabled={slideIndex === 0}
            onClick={() => onSlideIndex(Math.max(0, slideIndex - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Next slide"
            disabled={slideIndex >= doc.slides.length - 1}
            onClick={() => onSlideIndex(Math.min(doc.slides.length - 1, slideIndex + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
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
      <Card className="rounded-[28px]">
        <CardContent className="py-8 text-muted-foreground">
          Not enough lecture text to build a quiz. Import a longer deck or paste notes.
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="rounded-[28px]">
        <CardHeader>
          <CardTitle>Quiz complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-bold">
            {score} / {questions.length} correct
          </p>
          <Progress value={(score / questions.length) * 100} />
          <Button className="rounded-full" onClick={restart}>
            <RotateCcw data-icon="inline-start" />
            Run it again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[28px]">
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
                  variant={
                    isAnswer ? "default" : isWrong ? "destructive" : chosen ? "secondary" : "outline"
                  }
                  className="h-auto justify-start rounded-2xl py-2 text-left whitespace-normal"
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
            className="h-10 w-full rounded-2xl border border-input bg-[#f6f4fa] px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
        {revealed ? (
          <p className="rounded-2xl bg-[#f6f4fa] px-3 py-2 text-sm leading-6">
            <span className="font-medium">From slide {question.slideIndex}. </span>
            {question.explanation}
          </p>
        ) : null}
        <div className="flex gap-2">
          {!revealed ? (
            <Button className="rounded-full" onClick={submit} disabled={!picked.trim()}>
              Check
            </Button>
          ) : (
            <Button className="rounded-full" onClick={next}>
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
      <Card className="rounded-[28px]">
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
        className={cn(
          "min-h-64 w-full rounded-[28px] px-6 py-10 text-center shadow-sm ring-1 ring-black/5",
          flipped ? "bg-[#efe8ff]" : "bg-white"
        )}
      >
        <p className="text-xs font-bold tracking-wide text-[#8d87a0] uppercase">
          {flipped ? "Answer · slide " + card.slideIndex : "Term"}
        </p>
        <p className="mt-4 text-2xl leading-snug font-extrabold sm:text-3xl">
          {flipped ? card.back : card.front}
        </p>
        <p className="mt-6 text-sm font-semibold text-[#8d87a0]">Tap to flip</p>
      </button>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-full"
          disabled={index === 0}
          onClick={() => {
            setIndex((value) => value - 1)
            setFlipped(false)
          }}
        >
          Previous
        </Button>
        <p className="text-sm font-bold text-[#6d6780]">
          {index + 1} / {cards.length}
        </p>
        <Button
          variant="outline"
          className="rounded-full"
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
