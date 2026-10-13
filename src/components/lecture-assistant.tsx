"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const endRef = useRef<HTMLDivElement>(null)
  const prompts = promptsFor(doc)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [thread, busy, open])

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

  const panel = (showClose: boolean) => (
    <AssistantBody
      prompts={prompts}
      thread={thread}
      busy={busy}
      question={question}
      endRef={endRef}
      onAsk={ask}
      onQuestion={setQuestion}
      onOpenSource={openSource}
      onClose={() => setOpen(false)}
      showClose={showClose}
    />
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{panel(false)}</div>
      {mounted
        ? createPortal(
            <MobileTonTon open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}>
              {panel(true)}
            </MobileTonTon>,
            document.body
          )
        : null}
    </>
  )
}

function MobileTonTon({
  open,
  onOpen,
  onClose,
  children,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      {open ? null : (
        <Button
          className="fixed right-4 bottom-4 z-30 h-11 rounded-full px-4 shadow-lg xl:hidden"
          onClick={onOpen}
        >
          <MessageSquare />
          TonTon
        </Button>
      )}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close TonTon"
            className="fixed inset-0 z-40 bg-black/25 xl:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl xl:hidden">
            {children}
          </div>
        </>
      ) : null}
    </>
  )
}

function AssistantBody({
  prompts,
  thread,
  busy,
  question,
  endRef,
  onAsk,
  onQuestion,
  onOpenSource,
  onClose,
  showClose,
}: {
  prompts: string[]
  thread: Turn[]
  busy: boolean
  question: string
  endRef: React.RefObject<HTMLDivElement | null>
  onAsk: (text: string) => void
  onQuestion: (value: string) => void
  onOpenSource: (slide: Slide) => void
  onClose: () => void
  showClose: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-[#efe8ff] text-2xl">
            <span aria-hidden="true">🐣</span>
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-[#1e1b2e]">TonTon</p>
            <p className="text-xs text-muted-foreground">ChatGPT, from this lecture</p>
          </div>
        </div>
        {showClose ? (
          <Button variant="ghost" size="icon-sm" className="xl:hidden" onClick={onClose}>
            <X />
            <span className="sr-only">Close</span>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {prompts.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full bg-[#f4f1fb] px-3 py-1.5 text-left text-xs font-semibold text-[#4c4563] hover:bg-[#efe8ff]"
            onClick={() => onAsk(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {thread.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Ask TonTon about this lecture. Your question and the slide text go to ChatGPT.
          </p>
        ) : null}
        {thread.map((entry, index) => (
          <div
            key={`${entry.role}-${index}`}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
              entry.role === "you" ? "bg-[#efe8ff]" : "bg-[#f6f4fa]"
            )}
          >
            <p className="mb-1 text-[11px] font-bold tracking-wide text-[#6d6780] uppercase">
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
                    className="rounded-full"
                    onClick={() => onOpenSource(slide)}
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
        className="mt-3 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onAsk(question)
        }}
      >
        <Textarea
          value={question}
          onChange={(event) => onQuestion(event.target.value)}
          placeholder="Ask TonTon about these slides…"
          disabled={busy}
          className="min-h-16 rounded-2xl bg-[#f6f4fa]"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onAsk(question)
            }
          }}
        />
        <Button type="submit" className="h-10 self-end rounded-full px-4" disabled={busy}>
          Ask TonTon
        </Button>
      </form>
    </div>
  )
}
