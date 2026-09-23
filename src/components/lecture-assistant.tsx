"use client"

import { useEffect, useRef, useState } from "react"
import { MessageSquare, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { answerFromSlides } from "@/lib/generate-study"
import { isSampleLectureId } from "@/lib/sample-lecture"
import type { Slide, StudyDoc } from "@/lib/types"
import { cn } from "cn"

type Turn = {
  role: "you" | "preRound"
  text: string
  sources?: Slide[]
}

const SAMPLE_PROMPTS = [
  "What are the three phases of wound healing?",
  "When do you choose a flap instead of a graft?",
  "What does a congested flap look like?",
]

function promptsFor(doc: StudyDoc) {
  if (isSampleLectureId(doc.id)) return SAMPLE_PROMPTS
  return doc.slides.slice(0, 3).map((slide) => `Explain “${slide.title}”`)
}

export function LectureAssistant({
  doc,
  onOpenSlide,
}: {
  doc: StudyDoc
  onOpenSlide: (slide: Slide) => void
}) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [thread, setThread] = useState<Turn[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const prompts = promptsFor(doc)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [thread])

  function ask(text: string) {
    const q = text.trim()
    if (!q) return
    const result = answerFromSlides(doc.slides, q)
    setThread((rows) => [
      ...rows,
      { role: "you", text: q },
      { role: "preRound", text: result.answer, sources: result.sources },
    ])
    setQuestion("")
  }

  function openSource(slide: Slide) {
    onOpenSlide(slide)
    setOpen(false)
  }

  return (
    <>
      {open ? null : (
        <Button
          className="fixed right-4 bottom-4 z-30 shadow-md lg:hidden"
          onClick={() => setOpen(true)}
        >
          <MessageSquare />
          Ask
        </Button>
      )}

      {open ? (
        <button
          type="button"
          aria-label="Close lecture assistant"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "flex-col overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/10",
          "lg:sticky lg:top-6 lg:flex lg:h-[calc(100dvh-9rem)]",
          open
            ? "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 max-lg:flex max-lg:w-full max-lg:max-w-sm max-lg:rounded-none max-lg:border-y-0 max-lg:border-r-0 max-lg:shadow-xl"
            : "max-lg:hidden"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="font-heading text-lg leading-none">Ask this lecture</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Answers are quoted from these slides.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          {prompts.map((item) => (
            <Button
              key={item}
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal text-left"
              onClick={() => ask(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {thread.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Ask about a term that appears in this deck. PreRound will not
              invent an answer from outside the lecture.
            </p>
          ) : null}
          {thread.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={cn(
                "rounded-xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
                entry.role === "you" ? "bg-primary/10" : "bg-muted"
              )}
            >
              <p className="mb-1 text-xs font-medium tracking-wide uppercase">
                {entry.role === "you" ? "You" : "PreRound"}
              </p>
              {entry.text}
              {entry.sources?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.sources.map((slide) => (
                    <Button
                      key={slide.index}
                      variant="outline"
                      size="xs"
                      onClick={() => openSource(slide)}
                    >
                      Slide {slide.index}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="flex flex-col gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            ask(question)
          }}
        >
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask something that is on these slides…"
            className="min-h-16"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                ask(question)
              }
            }}
          />
          <Button type="submit" className="self-end">
            Ask
          </Button>
        </form>
      </aside>
    </>
  )
}
