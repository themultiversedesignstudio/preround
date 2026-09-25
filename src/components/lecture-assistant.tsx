"use client"

import { useEffect, useRef, useState } from "react"
import { MessageSquare, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Slide, StudyDoc } from "@/lib/types"
import { cn } from "cn"

type Turn = {
  role: "you" | "tonton"
  text: string
  sources?: Slide[]
}

function promptsFor(doc: StudyDoc) {
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
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const prompts = promptsFor(doc)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [thread, busy])

  async function ask(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setQuestion("")
    setBusy(true)
    setThread((rows) => [...rows, { role: "you", text: q }])
    try {
      const response = await fetch("/api/tonton", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          slides: doc.slides,
          history: thread.slice(-8),
        }),
      })
      const data = (await response.json()) as {
        answer?: string
        sources?: Slide[]
        error?: string
      }
      setThread((rows) => [
        ...rows,
        {
          role: "tonton",
          text: data.answer || data.error || "TonTon could not answer that.",
          sources: data.sources,
        },
      ])
    } catch {
      setThread((rows) => [
        ...rows,
        { role: "tonton", text: "TonTon could not reach ChatGPT." },
      ])
    } finally {
      setBusy(false)
    }
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
          TonTon
        </Button>
      )}

      {open ? (
        <button
          type="button"
          aria-label="Close TonTon"
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
            <p className="font-heading text-lg leading-none">TonTon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ChatGPT answers from this lecture.
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
              Ask TonTon about this deck. Your question and the slide text are
              sent to ChatGPT.
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
                {entry.role === "you" ? "You" : "TonTon"}
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
          {busy ? (
            <p className="text-sm text-muted-foreground">TonTon is reading the slides…</p>
          ) : null}
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
            placeholder="Ask TonTon about these slides…"
            disabled={busy}
            className="min-h-16"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                ask(question)
              }
            }}
          />
          <Button type="submit" className="self-end" disabled={busy}>
            Ask TonTon
          </Button>
        </form>
      </aside>
    </>
  )
}
