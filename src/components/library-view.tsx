"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Ear,
  FileUp,
  LoaderCircle,
  NotebookPen,
  Stethoscope,
  Trash2,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { detectKind, parsePastedNotes, parseStudyFile } from "@/lib/parse-file"
import { SAMPLE_LECTURE_ID, sampleWoundHealingLecture } from "@/lib/sample-lecture"
import { deleteDoc, upsertDoc, useDocs } from "@/lib/storage"
import type { StudyDoc } from "@/lib/types"
import { cn } from "cn"

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function LibraryView() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const docs = useDocs()
  const [busy, setBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteName, setPasteName] = useState("Pasted lecture notes")
  const [pasteText, setPasteText] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const imported = docs.filter((doc) => doc.id !== SAMPLE_LECTURE_ID)
  const empty = imported.length === 0
  const sample = sampleWoundHealingLecture()

  async function ingest(file: File) {
    setBusy(true)
    try {
      const kind = detectKind(file)
      if (!kind) {
        toast.error("Use a PDF, .pptx, .txt, or .md file.")
        return
      }
      const slides = await parseStudyFile(file)
      if (!slides.length) {
        toast.error(
          "No readable text in that file. Export a text-based PDF, or paste the notes instead."
        )
        return
      }
      const doc: StudyDoc = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.(pdf|pptx|txt|md)$/i, ""),
        kind,
        createdAt: new Date().toISOString(),
        slides,
      }
      upsertDoc(doc)
      toast.success(`Imported ${slides.length} slides from ${file.name}`)
      router.push(`/study/${doc.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }

  function openSample() {
    upsertDoc(sampleWoundHealingLecture())
    router.push(`/study/${SAMPLE_LECTURE_ID}`)
  }

  function savePaste() {
    try {
      const slides = parsePastedNotes(pasteText)
      const doc: StudyDoc = {
        id: crypto.randomUUID(),
        name: pasteName.trim() || "Pasted lecture notes",
        kind: "text",
        createdAt: new Date().toISOString(),
        slides,
      }
      upsertDoc(doc)
      setPasteOpen(false)
      setPasteText("")
      router.push(`/study/${doc.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not parse those notes.")
    }
  }

  const hint = useMemo(
    () =>
      busy
        ? "Reading slides…"
        : "Drop a lecture PDF or PowerPoint, or paste your notes.",
    [busy]
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Stethoscope className="size-4" />
            PreRound
          </div>
          <h1 className="font-heading text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            Import the lecture. Hear it. Get grilled on it.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
            onClick={() => setPasteOpen(true)}
          >
            <NotebookPen className="size-4" />
            Paste notes
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
            onClick={openSample}
          >
            <Ear className="size-4" />
            Try a sample lecture
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const file = event.dataTransfer.files[0]
          if (file) void ingest(file)
        }}
        disabled={busy}
        className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/8"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/60"
        }`}
      >
        {busy ? (
          <LoaderCircle className="size-8 animate-spin text-primary" />
        ) : (
          <FileUp className="size-8 text-primary" />
        )}
        <div className="space-y-1">
          <p className="text-base font-medium">{hint}</p>
          <p className="text-sm text-muted-foreground">
            PDF, PowerPoint (.pptx), Markdown, or plain text. Image-only scans
            need pasted notes.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,.txt,.md,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void ingest(file)
            event.target.value = ""
          }}
        />
      </button>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl">Sample lecture</h2>
          <p className="text-sm text-muted-foreground">Always available</p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{sample.name}</CardTitle>
                <CardDescription>
                  Built-in reconstructive surgery deck
                </CardDescription>
              </div>
              <Badge variant="secondary">SAMPLE</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {sample.slides.length} slides
            </p>
            <button
              type="button"
              className={cn(buttonVariants())}
              onClick={openSample}
            >
              Study
            </button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl">Your lectures</h2>
          <p className="text-sm text-muted-foreground">
            {imported.length ? `${imported.length} imported` : "None yet"}
          </p>
        </div>

        {empty ? (
          <Card>
            <CardHeader>
              <CardTitle>Empty bag</CardTitle>
              <CardDescription>
                Import tonight&apos;s slides, or open the sample lecture above
                to hear PreRound read a deck and generate questions.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {imported.map((doc) => (
              <Card key={doc.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="pr-8">{doc.name}</CardTitle>
                      <CardDescription>
                        {formatWhen(doc.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{doc.kind.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {doc.slides.length} slides
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => {
                        deleteDoc(doc.id)
                      }}
                    >
                      <Trash2 />
                    </Button>
                    <Link
                      href={`/study/${doc.id}`}
                      className={cn(buttonVariants())}
                    >
                      Study
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={pasteOpen} onOpenChange={(open) => setPasteOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste lecture notes</DialogTitle>
            <DialogDescription>
              Drop in text from a lecture. Blank lines become slide breaks.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Title</span>
            <input
              value={pasteName}
              onChange={(event) => setPasteName(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Phase 1: hemostasis and inflammation. Platelets form a fibrin clot…"
            className="min-h-40"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePaste}>Create study set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
