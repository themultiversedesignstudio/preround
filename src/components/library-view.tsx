"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  House,
  LoaderCircle,
  NotebookPen,
  Presentation,
  Trash2,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { detectKind, parsePastedNotes, parseStudyFile } from "@/lib/parse-file"
import { deleteDoc, upsertDoc, useDocs } from "@/lib/storage"
import type { FileKind, StudyDoc } from "@/lib/types"
import { cn } from "cn"

const PASTELS = [
  { bg: "bg-[#FFE3BF]", ink: "text-[#8A5A16]", bubble: "bg-white/75" },
  { bg: "bg-[#F3C6CB]", ink: "text-[#7A2434]", bubble: "bg-white/75" },
  { bg: "bg-[#F0D0C8]", ink: "text-[#7A3A32]", bubble: "bg-white/75" },
]

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function kindLabel(kind: FileKind) {
  if (kind === "pdf") return "PDF"
  if (kind === "pptx") return "PowerPoint"
  return "Notes"
}

function KindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  if (kind === "pptx") return <Presentation className={className} />
  if (kind === "text") return <NotebookPen className={className} />
  return <FileText className={className} />
}

export function LibraryView() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const docs = useDocs()
  const [busy, setBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteName, setPasteName] = useState("Pasted lecture notes")
  const [pasteText, setPasteText] = useState("")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!needle) return rows
    return rows.filter((doc) => doc.name.toLowerCase().includes(needle))
  }, [docs, query])

  const recent = filtered.slice(0, 3)

  async function ingestMany(files: File[]) {
    if (!files.length) return
    setBusy(true)
    const saved: StudyDoc[] = []
    const skipped: string[] = []
    try {
      for (const file of files) {
        const kind = detectKind(file)
        if (!kind) {
          skipped.push(file.name)
          continue
        }
        const slides = await parseStudyFile(file)
        if (!slides.length) {
          skipped.push(file.name)
          continue
        }
        const doc: StudyDoc = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.(pdf|pptx|txt|md)$/i, ""),
          kind,
          createdAt: new Date().toISOString(),
          slides,
        }
        upsertDoc(doc)
        saved.push(doc)
      }
      if (!saved.length) {
        toast.error("No readable PDF, PowerPoint, or text files in that selection.")
        return
      }
      const count = saved.reduce((sum, doc) => sum + doc.slides.length, 0)
      toast.success(
        `Imported ${saved.length} ${saved.length === 1 ? "document" : "documents"} · ${count} slides`
      )
      if (skipped.length) {
        toast.error(`Skipped ${skipped.length} files with no readable text.`)
      }
      if (saved.length === 1) router.push(`/study/${saved[0].id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read those files.")
    } finally {
      setBusy(false)
    }
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

  return (
    <>
      <AppShell
        title="Library"
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Search lectures"
        onFiles={(files) => void ingestMany(files)}
        nav={[{ label: "Library", icon: House, href: "/", active: true }]}
        footer={
          <ImportCard
            busy={busy}
            onPick={() => inputRef.current?.click()}
            onPaste={() => setPasteOpen(true)}
          />
        }
        right={<LibraryAside docs={docs} />}
      >
        <div className="mb-4 flex gap-2 md:hidden">
          <Button
            className="h-10 rounded-full px-4"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            Import
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => setPasteOpen(true)}
          >
            <NotebookPen />
            Paste notes
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,.txt,.md,application/pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            void ingestMany([...(event.target.files ?? [])])
            event.target.value = ""
          }}
        />

        {filtered.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#e7cfd2] bg-[#fdf8f8] px-6 py-12 text-center"
          >
            {busy ? (
              <LoaderCircle className="size-8 animate-spin text-primary" />
            ) : (
              <span className="grid size-16 place-items-center rounded-3xl bg-[#f8e6e8] text-3xl">
                🐣
              </span>
            )}
            <div className="space-y-1">
              <p className="text-lg font-extrabold text-[#2c181c]">
                {query.trim() ? "No lectures match that search" : "Import a lecture"}
              </p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                {query.trim()
                  ? "Try another name, or clear the search."
                  : "Drop PDF, PowerPoint, or text files here. You can delete a lecture later from the list."}
              </p>
            </div>
          </button>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold tracking-tight text-[#2c181c]">
                  New lectures
                </h2>
                <button
                  type="button"
                  className="text-sm font-bold text-primary"
                  onClick={() =>
                    document.getElementById("my-lectures")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  View all
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recent.map((doc, index) => {
                  const pastel = PASTELS[index % PASTELS.length]
                  return (
                    <article
                      key={doc.id}
                      className="flex flex-col rounded-[24px] bg-[#fdf8f8] p-3 ring-1 ring-black/5"
                    >
                      <div
                        className={cn(
                          "relative h-36 overflow-hidden rounded-[20px]",
                          pastel.bg
                        )}
                      >
                        <span className="absolute -top-6 -right-4 size-24 rounded-full bg-white/35" />
                        <span className="absolute bottom-4 left-6 size-14 rounded-full bg-white/30" />
                        <span
                          className={cn(
                            "absolute bottom-4 left-4 grid size-16 place-items-center rounded-2xl shadow-sm",
                            pastel.bubble,
                            pastel.ink
                          )}
                        >
                          <KindIcon kind={doc.kind} className="size-7" />
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-3 px-1 pt-3 pb-1">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-extrabold text-[#2c181c]">
                            {doc.name}
                          </h3>
                          <p className="text-xs font-semibold text-[#8d656b]">
                            {doc.slides.length} slides
                          </p>
                        </div>
                        <Link
                          href={`/study/${doc.id}`}
                          aria-label={`Study ${doc.name}`}
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#2c181c] shadow-sm ring-1 ring-black/5 hover:bg-[#f8e6e8]"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section id="my-lectures" className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold tracking-tight text-[#2c181c]">
                  My lectures
                </h2>
                <p className="text-sm font-semibold text-[#8d656b]">
                  {filtered.length} saved
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-[#a0787e]">
                      <th className="pb-3 font-semibold">Lecture</th>
                      <th className="pb-3 font-semibold">Added</th>
                      <th className="pb-3 font-semibold">Slides</th>
                      <th className="pb-3 font-semibold">Kind</th>
                      <th className="pb-3 font-semibold">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc, index) => {
                      const pastel = PASTELS[index % PASTELS.length]
                      return (
                        <tr key={doc.id} className="border-t border-black/5">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "grid size-11 shrink-0 place-items-center rounded-2xl",
                                  pastel.bg,
                                  pastel.ink
                                )}
                              >
                                <KindIcon kind={doc.kind} className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#2c181c]">{doc.name}</p>
                                <p className="text-xs text-[#8d656b]">
                                  {doc.slides.length} slides
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-sm font-semibold text-[#5c3840]">
                            {formatWhen(doc.createdAt)}
                          </td>
                          <td className="py-3 pr-3 text-sm font-semibold text-[#5c3840]">
                            {doc.slides.length}
                          </td>
                          <td className="py-3 pr-3 text-sm font-semibold text-[#5c3840]">
                            {kindLabel(doc.kind)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${doc.name}`}
                                onClick={() => deleteDoc(doc.id)}
                              >
                                <Trash2 />
                              </Button>
                              <Link
                                href={`/study/${doc.id}`}
                                aria-label={`Study ${doc.name}`}
                                className={cn(
                                  buttonVariants({ size: "icon" }),
                                  "rounded-full"
                                )}
                              >
                                <ChevronRight />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </AppShell>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
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
              className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Phase 1: hemostasis and inflammation. Platelets form a fibrin clot…"
            className="min-h-40 rounded-2xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={savePaste}>
              Create study set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ImportCard({
  busy,
  onPick,
  onPaste,
}: {
  busy: boolean
  onPick: () => void
  onPaste: () => void
}) {
  return (
    <div className="relative mt-8 rounded-[24px] bg-[#f8ecee] px-4 pt-14 pb-4">
      <div className="absolute -top-6 left-1/2 grid size-16 -translate-x-1/2 place-items-center rounded-full bg-white text-3xl shadow-sm ring-4 ring-[#f8ecee]">
        <span aria-hidden="true">🐣</span>
      </div>
      <p className="text-center text-sm font-extrabold text-[#2c181c]">Import a lecture</p>
      <p className="mt-1 text-center text-xs leading-5 text-[#7a565b]">
        PDF, PowerPoint, or notes. They stay in this browser, and you can delete them.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onPick}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Choose files
      </button>
      <button
        type="button"
        onClick={onPaste}
        className="mt-2 h-8 w-full text-center text-xs font-bold text-primary"
      >
        Paste notes
      </button>
    </div>
  )
}

function LibraryAside({ docs }: { docs: StudyDoc[] }) {
  const ranked = [...docs].sort((a, b) => b.slides.length - a.slides.length).slice(0, 3)
  const max = Math.max(1, ...ranked.map((doc) => doc.slides.length))

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-24 place-items-center rounded-full bg-[#f8e6e8] text-5xl shadow-inner">
          <span aria-hidden="true">🐣</span>
        </span>
        <p className="mt-3 text-lg font-extrabold text-[#2c181c]">Çalış Kız</p>
        <p className="text-sm font-semibold text-[#8d656b]">This browser</p>
      </div>

      <MonthCalendar />

      <div>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-[#2c181c]">
          Lecture size
        </h2>
        {ranked.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f1f2] px-4 py-3 text-sm leading-6 text-muted-foreground">
            After you import a lecture, its size shows up here.
          </p>
        ) : (
          <div className="space-y-3">
            {ranked.map((doc, index) => {
              const pct = Math.max(18, Math.round((doc.slides.length / max) * 100))
              const lead = index === 0
              return (
                <Link
                  key={doc.id}
                  href={`/study/${doc.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-full p-1.5 pr-4",
                    lead ? "bg-primary text-white" : "bg-white ring-1 ring-black/5"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                      lead ? "bg-white/20 text-white" : "bg-[#f8e6e8] text-primary"
                    )}
                  >
                    {Math.round((doc.slides.length / max) * 100)}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-bold",
                        lead ? "text-white" : "text-[#2c181c]"
                      )}
                    >
                      {doc.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        lead ? "text-white/80" : "text-[#8d656b]"
                      )}
                    >
                      {doc.slides.length} slides
                    </span>
                  </span>
                  <ChevronRight
                    className={cn("size-4 shrink-0", lead ? "text-white" : "text-[#8d656b]")}
                  />
                  <span className="sr-only">{pct}% of the largest lecture</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MonthCalendar() {
  const today = new Date()
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const label = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(cursor)
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-[#2c181c]">{label}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            className="grid size-8 place-items-center rounded-full text-[#7a565b] hover:bg-[#f8eeef]"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="grid size-8 place-items-center rounded-full text-[#7a565b] hover:bg-[#f8eeef]"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold text-[#c4a0a6]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm font-semibold text-[#5c3840]">
        {cells.map((day, index) => {
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          return (
            <span
              key={`${year}-${month}-${index}`}
              className={cn(
                "mx-auto grid size-8 place-items-center rounded-full",
                isToday && "bg-primary text-white"
              )}
            >
              {day ?? ""}
            </span>
          )
        })}
      </div>
    </div>
  )
}
