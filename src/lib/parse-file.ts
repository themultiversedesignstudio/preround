import type { FileKind, Slide } from "@/lib/types"

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function titleFromText(text: string) {
  const first = text.split(/(?<=[.!?])\s+/)[0] ?? text
  if (first.length <= 72) return first
  return `${first.slice(0, 69).trim()}…`
}

function slidesFromPlainText(raw: string): Slide[] {
  const chunks = raw
    .split(/\n\s*\n|Page \d+|Slide \d+/i)
    .map((chunk) => cleanText(chunk))
    .filter((chunk) => chunk.length > 12)

  const source = chunks.length ? chunks : [cleanText(raw)]
  return source.map((text, i) => ({
    index: i + 1,
    title: titleFromText(text),
    text,
  }))
}

async function parsePdf(file: File): Promise<Slide[]> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist")
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const slides: Slide[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = cleanText(
      content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .join(" ")
    )
    if (!text) continue
    slides.push({
      index: slides.length + 1,
      title: titleFromText(text),
      text,
    })
  }

  return slides
}

async function parsePptx(file: File): Promise<Slide[]> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const paths = Object.keys(zip.files)
    .filter((name) => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] ?? 0)
      const nb = Number(b.match(/slide(\d+)/i)?.[1] ?? 0)
      return na - nb
    })

  const slides: Slide[] = []
  for (const path of paths) {
    const xml = await zip.files[path].async("text")
    const pieces = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((match) =>
      decodeXml(match[1])
    )
    const text = cleanText(pieces.join(" "))
    if (!text) continue
    slides.push({
      index: slides.length + 1,
      title: titleFromText(text),
      text,
    })
  }
  return slides
}

export function detectKind(file: File): FileKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf"
  if (name.endsWith(".pptx")) return "pptx"
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    file.type.startsWith("text/")
  ) {
    return "text"
  }
  return null
}

export async function parseStudyFile(file: File): Promise<Slide[]> {
  const kind = detectKind(file)
  if (!kind) {
    throw new Error(
      "Use a PDF, PowerPoint (.pptx), or a text/markdown notes file."
    )
  }
  if (kind === "pdf") return parsePdf(file)
  if (kind === "pptx") return parsePptx(file)
  return slidesFromPlainText(await file.text())
}

export function parsePastedNotes(raw: string): Slide[] {
  const slides = slidesFromPlainText(raw)
  if (!slides.length || slides.every((slide) => slide.text.length < 20)) {
    throw new Error("Paste a bit more lecture text so there is something to study.")
  }
  return slides
}
